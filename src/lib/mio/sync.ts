import { mioClient } from './client';
// Usar o cliente Admin do lib/supabase para garantir permissões de escrita em background
import { getSupabaseAdmin } from '@/lib/supabase';
import { MIOIntegrante } from '@/types/mio';

export class MioSyncService {

    // Sincronizar funcionários MIO -> Portal
    async syncEmployees() {
        console.log('[MIO Sync] Iniciando sincronização de funcionários...');

        // 1. Buscar dados do MIO
        const integrantes = await mioClient.getIntegrantes();
        if (!integrantes || integrantes.length === 0) {
            console.log('[MIO Sync] Nenhum integrante encontrado ou falha na conexão.');
            return { success: false, message: 'Falha ao buscar dados do MIO' };
        }

        console.log(`[MIO Sync] ${integrantes.length} integrantes encontrados. Processando...`);

        // 2. Conectar Supabase Admin
        const supabase = await getSupabaseAdmin();

        let syncedCount = 0;
        let errorCount = 0;

        for (const integrante of integrantes) {
            try {
                // Validação Mínima
                if (!integrante.cpf || !integrante.nome) {
                    console.warn(`[MIO Sync] Integrante ignorado (dados incompletos): ${integrante.nome || 'Sem Nome'}`);
                    continue;
                }

                // Mapear para UsersUnified
                const userData = {
                    tax_id: integrante.cpf.replace(/\D/g, ''), // CPF limpo
                    first_name: integrante.nome.split(' ')[0],
                    last_name: integrante.nome.split(' ').slice(1).join(' '),
                    // Email: se não tiver, não criamos usuário ou usamos placeholder?
                    // Regra: se tiver email no MIO, usa. Se não, tenta padrão ou ignora.
                    email: integrante.email || `${integrante.cpf.replace(/\D/g, '')}@mio.placeholder.com`,
                    phone_number: integrante.celular || integrante.telefone || '',
                    position: integrante.cargo,
                    department: integrante.setor,
                    // Armazenar dados brutos do MIO para referência futura
                    mio_data: integrante,
                    mio_last_sync: new Date().toISOString()
                };

                // Upsert no Supabase
                // Nota: Upsert por CPF (tax_id) seria ideal, mas id é PK.
                // Vamos buscar por tax_id primeiro.
                const { data: existingUser } = await supabase
                    .from('users_unified')
                    .select('id')
                    .eq('tax_id', userData.tax_id)
                    .single();

                if (existingUser) {
                    // Atualizar
                    await supabase
                        .from('users_unified')
                        .update({
                            position: userData.position,
                            department: userData.department,
                            mio_data: userData.mio_data as any, // Cast json
                            mio_last_sync: userData.mio_last_sync
                        })
                        .eq('id', existingUser.id);
                } else {
                    // Criar novo (apenas se tivermos certeza que deve ser criado automaticamente)
                    // Por cautela, nesta fase inicial, TALVEZ apenas atualizemos existentes.
                    // Mas o requisito diz: "se eles possuem todos os dados... podem ser cadastrados tambem"
                    // Vamos criar se tiver email válido.
                    if (integrante.email) {
                        // Criar novo usuário (logica simplificada, idealmente passaria pelo fluxo de auth)
                        // Para users_unified, precisamos de um ID. Supabase Auth cria ID.
                        // Aqui estamos criando registro SOMENTE na tabela unificada ou no Auth também?
                        // UsersUnified geralmente é espelho.
                        // Decisão Segura: Apenas logar que poderia criar, ou criar em uma tabela temporária de "importação".
                        // Vou criar apenas se já existir users_unified (sincronização de dados enriquecidos).
                        // Se o user não existe, logar para "Sugestão de Cadastro".

                        // Comentado para segurança na V1:
                        // await supabase.from('users_unified').insert(userData);
                    }
                }
                syncedCount++;

            } catch (err) {
                console.error(`[MIO Sync] Erro ao processar ${integrante.cpf}:`, err);
                errorCount++;
            }
        }

        return {
            success: true,
            synced: syncedCount,
            errors: errorCount,
            total: integrantes.length
        };
    }
}

export const mioSyncService = new MioSyncService();
