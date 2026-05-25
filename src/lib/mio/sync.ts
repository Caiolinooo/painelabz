import { mioClient } from './client';
// Usar o cliente Admin do lib/supabase para garantir permissões de escrita em background
import { getSupabaseAdmin } from '@/lib/supabase';
import { MIOIntegrante } from '@/types/mio';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailVerificationLink } from '@/lib/email-verification';

export class MioSyncService {

    // Sincronizar funcionários MIO -> Portal
    async syncEmployees() {
        console.log('[MIO Sync] Iniciando sincronização de funcionários...');

        // 1. Buscar dados do MIO
        const integrantes = await mioClient.getIntegrantes();
        if (!integrantes || integrantes.length === 0) {
            console.log('[MIO Sync] Nenhum integrante encontrado ou falha na conexão.');
            return { success: false, message: 'Falha ao buscar dados do MIO', criados: 0, atualizados: 0, erros: ['Nenhum integrante encontrado ou falha na conexão.'] };
        }

        console.log(`[MIO Sync] ${integrantes.length} integrantes encontrados. Processando...`);

        // 2. Conectar Supabase Admin
        const supabase = await getSupabaseAdmin();

        let criadosCount = 0;
        let atualizadosCount = 0;
        const erros: string[] = [];

        const defaultModules = [
            'dashboard',
            'manual',
            'procedimentos',
            'politicas',
            'calendario',
            'noticias',
            'reembolso',
            'contracheque',
            'ponto'
        ];

        for (const integrante of integrantes) {
            try {
                // Validação Mínima
                const taxId = integrante.cpf?.replace(/\D/g, '');
                const email = integrante.email?.trim().toLowerCase();

                if (!taxId || !integrante.nome) {
                    console.warn(`[MIO Sync] Integrante ignorado (dados incompletos): ${integrante.nome || 'Sem Nome'}`);
                    continue;
                }

                // 1. Buscar no Supabase por tax_id (CPF) ou por email
                let targetUser: any = null;

                const { data: userByCpf } = await supabase
                    .from('users_unified')
                    .select('*')
                    .eq('tax_id', taxId)
                    .maybeSingle();

                if (userByCpf) {
                    targetUser = userByCpf;
                } else if (email) {
                    const { data: userByEmail } = await supabase
                        .from('users_unified')
                        .select('*')
                        .eq('email', email)
                        .maybeSingle();
                    if (userByEmail) {
                        targetUser = userByEmail;
                    }
                }

                const isMioActive = integrante.situacao === 'Ativo';

                if (targetUser) {
                    // Atualizar usuário existente
                    const updatePayload: any = {
                        position: integrante.cargo || targetUser.position,
                        department: integrante.setor || integrante.departamento || targetUser.department,
                        mio_id: String(integrante.id),
                        mio_matricula: integrante.matricula || targetUser.mio_matricula,
                        mio_data: integrante,
                        mio_last_sync: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        active: isMioActive,
                        authorization_status: isMioActive ? 'active' : 'pending'
                    };

                    if (!targetUser.tax_id && taxId) {
                        updatePayload.tax_id = taxId;
                    }

                    const { error: updateErr } = await supabase
                        .from('users_unified')
                        .update(updatePayload)
                        .eq('id', targetUser.id);

                    if (updateErr) {
                        console.error(`[MIO Sync] Erro ao atualizar usuário ${targetUser.id}:`, updateErr.message);
                        erros.push(`Atualização falhou para ${integrante.nome} (CPF: ${taxId}): ${updateErr.message}`);
                    } else {
                        atualizadosCount++;
                    }
                } else {
                    const hasValidEmail = email && email.includes('@') && !email.includes('placeholder.com');

                    console.log(`[MIO Sync] Registrando colaborador: ${integrante.nome} (email: ${email || 'sem email'}, CPF: ${taxId})`);

                    const firstName = integrante.nome.split(' ')[0];
                    const lastName = integrante.nome.split(' ').slice(1).join(' ');
                    const protocol = `REG-MIO-${new Date().toISOString().replace(/\D/g, '').slice(2, 10)}-${uuidv4().slice(0, 4).toUpperCase()}`;
                    const emailVerificationToken = uuidv4();

                    // Se tem email válido, cria auth user; senão, gera um ID sintético
                    let userId: string;

                    if (hasValidEmail) {
                        let authUser: any = null;
                        const temporaryPassword = uuidv4().substring(0, 8);

                        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                            email: email,
                            password: temporaryPassword,
                            user_metadata: {
                                first_name: firstName,
                                last_name: lastName,
                                role: 'USER'
                            }
                        });

                        if (authError) {
                            const msg = (authError.message || '').toLowerCase();
                            const isEmailExists = msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate') || (authError as any)?.code === 'email_exists' || (authError as any)?.status === 422;

                            if (isEmailExists) {
                                const perPage = 200;
                                for (let page = 1; page <= 5 && !authUser; page++) {
                                    const listRes = await (supabase as any).auth.admin.listUsers({ page, perPage });
                                    const users = listRes?.data?.users || listRes?.users || [];
                                    authUser = users.find((u: any) => (u.email || '').toLowerCase() === email);
                                    if (users.length < perPage) break;
                                }
                            }

                            if (!authUser) {
                                console.error(`[MIO Sync] Erro no Auth para ${email}:`, authError.message);
                                erros.push(`Erro de Auth para ${integrante.nome} (CPF: ${taxId}): ${authError.message}`);
                                // Ainda cria registro em users_unified com ID gerado
                                userId = uuidv4();
                            } else {
                                userId = authUser.id;
                            }
                        } else {
                            authUser = authData.user;
                            userId = authUser.id;
                        }
                    } else {
                        // Sem email válido: cria apenas em users_unified com ID próprio
                        userId = uuidv4();
                    }

                    const baseUserData: any = {
                        id: userId,
                        email: email || `${taxId}@mio.sync`,
                        phone_number: integrante.celular || integrante.telefone || null,
                        first_name: firstName,
                        last_name: lastName,
                        position: integrante.cargo || 'Não informado',
                        department: integrante.setor || integrante.departamento || 'Não informado',
                        tax_id: taxId,
                        role: 'USER',
                        active: isMioActive,
                        is_authorized: true,
                        authorization_status: isMioActive ? 'active' : 'pending',
                        email_verified: false,
                        email_verification_token: hasValidEmail ? emailVerificationToken : null,
                        mio_id: String(integrante.id),
                        mio_matricula: integrante.matricula || null,
                        mio_data: integrante,
                        mio_last_sync: new Date().toISOString(),
                        protocol: protocol,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { data: existingUnified } = await supabase
                        .from('users_unified')
                        .select('id')
                        .or(`tax_id.eq.${taxId},email.eq.${email || ''}`)
                        .maybeSingle();

                    if (existingUnified) {
                        console.log(`[MIO Sync] Usuário ${integrante.nome} já existe em users_unified (ID: ${existingUnified.id}). Atualizando dados do MIO...`);
                        const { error: updateErr } = await supabase
                            .from('users_unified')
                            .update({
                                phone_number: integrante.celular || integrante.telefone || null,
                                first_name: firstName,
                                last_name: lastName,
                                position: integrante.cargo || 'Não informado',
                                department: integrante.setor || integrante.departamento || 'Não informado',
                                mio_id: String(integrante.id),
                                mio_matricula: integrante.matricula || null,
                                mio_data: integrante,
                                mio_last_sync: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                active: isMioActive,
                                authorization_status: isMioActive ? 'active' : 'pending'
                            })
                            .eq('id', existingUnified.id);

                        if (updateErr) {
                            console.error(`[MIO Sync] Erro ao atualizar users_unified para ${integrante.nome}:`, updateErr.message);
                            erros.push(`Atualização users_unified falhou para ${integrante.nome} (CPF: ${taxId}): ${updateErr.message}`);
                        } else {
                            atualizadosCount++;
                        }
                    } else {
                        const { error: insertErr } = await supabase
                            .from('users_unified')
                            .insert(baseUserData);

                        if (insertErr) {
                            console.error(`[MIO Sync] Erro ao cadastrar users_unified para ${integrante.nome}:`, insertErr.message);
                            erros.push(`Cadastro users_unified falhou para ${integrante.nome} (CPF: ${taxId}): ${insertErr.message}`);
                            continue;
                        }

                        // Permissões padrão
                        const { data: existingPerms } = await supabase
                            .from('user_permissions')
                            .select('module')
                            .eq('user_id', userId);

                        const existingModules = new Set(existingPerms?.map(p => p.module) || []);
                        const permissionsToInsert = defaultModules
                            .filter(module => !existingModules.has(module))
                            .map(module => ({
                                user_id: userId,
                                module,
                                feature: null
                            }));

                        if (permissionsToInsert.length > 0) {
                            const { error: permErr } = await supabase
                                .from('user_permissions')
                                .insert(permissionsToInsert);

                            if (permErr) {
                                console.error(`[MIO Sync] Erro ao adicionar permissões para ${integrante.nome}:`, permErr.message);
                            }
                        }

                        // Histórico de acesso
                        const { error: histErr } = await supabase
                            .from('access_history')
                            .insert({
                                user_id: userId,
                                action: 'REGISTERED',
                                details: `Usuário registrado via sincronização automática MIO. Protocolo: ${protocol}`,
                                ip_address: 'system-sync',
                                user_agent: 'MIO Sync Service'
                            });

                        if (histErr) {
                            console.error(`[MIO Sync] Erro ao registrar histórico para ${integrante.nome}:`, histErr.message);
                        }

                        // Email de verificação apenas se tiver email válido
                        if (hasValidEmail) {
                            const sendResult = await sendEmailVerificationLink(email, firstName, emailVerificationToken);
                            if (!sendResult.success) {
                                console.error(`[MIO Sync] Erro ao enviar email de verificação para ${email}:`, sendResult.message);
                            }
                        }

                        criadosCount++;
                    }
                }
            } catch (err: any) {
                console.error(`[MIO Sync] Erro ao processar ${integrante.cpf}:`, err);
                erros.push(`Erro geral processando ${integrante.nome || 'Sem Nome'} (CPF: ${integrante.cpf}): ${err.message || err}`);
            }
        }

        return {
            success: erros.length === 0,
            criados: criadosCount,
            atualizados: atualizadosCount,
            total: integrantes.length,
            erros
        };
    }
}

export const mioSyncService = new MioSyncService();
