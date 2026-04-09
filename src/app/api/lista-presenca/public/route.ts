import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET — Fetch list data for public attendees via unique link UUID.
 * No authentication required (public access).
 * 
 * URL: /api/lista-presenca/public?link={uuid}
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const linkUnico = searchParams.get('link');

        if (!linkUnico) {
            return NextResponse.json({ error: 'Link inválido' }, { status: 400 });
        }

        const { data: lista, error } = await supabaseAdmin
            .from('lista_presenca')
            .select('id, titulo, data_evento, hora_inicio, hora_fim, local, pauta, status, acesso_publico, token_acesso, max_participantes')
            .eq('link_unico', linkUnico)
            .single();

        if (error || !lista) {
            return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
        }

        let isClosedByTime = false;
        if (lista.status === 'aberta' && lista.data_evento && lista.hora_fim) {
            try {
                // Formatting data_evento and hora_fim to be parsed correctly
                const timeString = lista.hora_fim.length === 5 ? `${lista.hora_fim}:00` : lista.hora_fim;
                // Parse timestamp assuming Brazilian Timezone (-03:00) as default for ABZ Group
                const evtTimestamp = new Date(`${lista.data_evento}T${timeString}-03:00`).getTime();
                
                if (!isNaN(evtTimestamp) && Date.now() > evtTimestamp) {
                    isClosedByTime = true;
                }
            } catch (e) {
                console.error('Error parsing list end time:', e);
            }
        }

        if (lista.status !== 'aberta' || isClosedByTime) {
            return NextResponse.json({ 
                error: 'Esta lista já foi fechada', 
                lista: { titulo: lista.titulo, status: isClosedByTime ? 'fechada' : lista.status } 
            }, { status: 400 });
        }

        // Count current participants
        const { count } = await supabaseAdmin
            .from('registros_presenca')
            .select('*', { count: 'exact', head: true })
            .eq('lista_id', lista.id);

        // Log access
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const ua = request.headers.get('user-agent') || 'unknown';
        await supabaseAdmin.from('logs_acesso_lista').insert({
            lista_id: lista.id,
            acao: 'visualizacao_publica',
            ip_address: ip,
            user_agent: ua,
        });

        return NextResponse.json({
            success: true,
            lista: {
                id: lista.id,
                titulo: lista.titulo,
                data_evento: lista.data_evento,
                hora_inicio: lista.hora_inicio,
                hora_fim: lista.hora_fim,
                local: lista.local,
                pauta: lista.pauta,
                status: lista.status,
                requer_token: !!lista.token_acesso,
                total_participantes: count || 0,
                max_participantes: lista.max_participantes,
            },
        });
    } catch (error) {
        console.error('Erro em GET /api/lista-presenca/public:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
