import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST — Registrar presença (assinatura)
 * Aceita tanto usuários autenticados quanto visitantes.
 * 
 * Body:
 * - lista_id (obrigatório)
 * - nome_completo (obrigatório)
 * - funcao
 * - empresa
 * - assinatura_base64 (obrigatório) — para visitantes que desenham no canvas
 * - assinatura_url (obrigatório se for usuário autenticado com assinatura do perfil)
 * - user_id (opcional — se for usuário do sistema)
 * - dados_extras (opcional — campos customizados)
 * - token_acesso (se a lista requer token)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lista_id, nome_completo, funcao, empresa, assinatura_base64, assinatura_url, user_id, dados_extras, token_acesso } = body;

        if (!lista_id || !nome_completo) {
            return NextResponse.json({ error: 'lista_id e nome_completo são obrigatórios' }, { status: 400 });
        }

        // 1. Verify list exists and is open
        const { data: lista, error: listaError } = await supabaseAdmin
            .from('lista_presenca')
            .select('id, status, acesso_publico, token_acesso, max_participantes, data_evento, hora_fim')
            .eq('id', lista_id)
            .single();

        if (listaError || !lista) {
            return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
        }

        let isClosedByTime = false;
        if (lista.status === 'aberta' && lista.data_evento && lista.hora_fim) {
            try {
                const timeString = lista.hora_fim.length === 5 ? `${lista.hora_fim}:00` : lista.hora_fim;
                const evtTimestamp = new Date(`${lista.data_evento}T${timeString}-03:00`).getTime();
                
                if (!isNaN(evtTimestamp) && Date.now() > evtTimestamp) {
                    isClosedByTime = true;
                }
            } catch (e) {
                console.error('Error parsing list end time:', e);
            }
        }

        if (lista.status !== 'aberta' || isClosedByTime) {
            return NextResponse.json({ error: 'Esta lista já foi fechada' }, { status: 400 });
        }

        // Verify token if required
        if (lista.token_acesso && lista.token_acesso !== token_acesso) {
            return NextResponse.json({ error: 'Token de acesso inválido' }, { status: 403 });
        }

        // Check max participants
        if (lista.max_participantes) {
            const { count } = await supabaseAdmin
                .from('registros_presenca')
                .select('*', { count: 'exact', head: true })
                .eq('lista_id', lista_id);

            if ((count || 0) >= lista.max_participantes) {
                return NextResponse.json({ error: 'Limite de participantes atingido' }, { status: 400 });
            }
        }

        // 2. Resolve signature URL
        let finalSignatureUrl = '';

        if (assinatura_url) {
            // User authenticated with profile signature
            finalSignatureUrl = assinatura_url;
        } else if (assinatura_base64) {
            // Visitor drawing on canvas — upload to storage
            try {
                const { data: buckets } = await supabaseAdmin.storage.listBuckets();
                const exists = (buckets || []).some((b: any) => b.name === 'assinaturas-presenca');
                if (!exists) {
                    await (supabaseAdmin.storage as any).createBucket('assinaturas-presenca', { public: true });
                }
            } catch { }

            const base64Data = assinatura_base64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${lista_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('assinaturas-presenca')
                .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

            if (uploadError) {
                console.error('Erro ao salvar assinatura:', uploadError);
                return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 });
            }

            const { data: publicUrlData } = supabaseAdmin.storage
                .from('assinaturas-presenca')
                .getPublicUrl(fileName);

            finalSignatureUrl = publicUrlData.publicUrl;
        } else {
            return NextResponse.json({ error: 'Assinatura é obrigatória' }, { status: 400 });
        }

        // 3. Generate anti-fraud hash
        const identifier = user_id || nome_completo.trim().toLowerCase();
        const hash_identificacao = crypto.createHash('sha256').update(`${lista_id}:${identifier}`).digest('hex');

        // Get client info
        const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const user_agent = request.headers.get('user-agent') || 'unknown';

        // 4. Insert record
        const { data, error } = await supabaseAdmin
            .from('registros_presenca')
            .insert({
                lista_id,
                user_id: user_id || null,
                nome_completo,
                funcao: funcao || null,
                empresa: empresa || null,
                assinatura_url: finalSignatureUrl,
                hash_identificacao,
                ip_address,
                user_agent,
                dados_extras: dados_extras || {},
            })
            .select('*')
            .single();

        if (error) {
            if (error.code === '23505') {
                // Duplicate hash — user already signed
                return NextResponse.json({ error: 'Você já registrou presença nesta lista' }, { status: 409 });
            }
            console.error('Erro ao registrar presença:', error);
            return NextResponse.json({ error: 'Erro ao registrar presença' }, { status: 500 });
        }

        // 5. Log access
        await supabaseAdmin.from('logs_acesso_lista').insert({
            lista_id,
            user_id: user_id || null,
            acao: 'assinatura',
            ip_address,
            user_agent,
            detalhes: { nome_completo, funcao, empresa },
        });

        return NextResponse.json({ success: true, registro: data });
    } catch (error) {
        console.error('Erro em POST /api/lista-presenca/registros:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// GET — Buscar registros de uma lista
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lista_id = searchParams.get('lista_id');

        if (!lista_id) {
            return NextResponse.json({ error: 'lista_id é obrigatório' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('vw_registros_por_lista')
            .select('*')
            .eq('lista_id', lista_id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar registros:', error);
            return NextResponse.json({ error: 'Erro ao buscar registros' }, { status: 500 });
        }

        return NextResponse.json({ success: true, registros: data || [] });
    } catch (error) {
        console.error('Erro em GET /api/lista-presenca/registros:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
