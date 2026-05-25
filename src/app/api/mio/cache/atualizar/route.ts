import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { mioClient } from '@/lib/mio/client';

export const dynamic = 'force-dynamic';
const MIN_INTERVAL_MS = 10_000; // 10 segundos entre sincronizações

async function isAuthorized(request: NextRequest): Promise<boolean> {
    let token: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else {
        token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
    }

    if (token) {
        const decoded = verifyToken(token);
        if (decoded && (decoded.role === 'ADMIN' || decoded.role === 'MANAGER')) return true;
    }
    if (process.env.NODE_ENV === 'development') return true;
    return false;
}

export async function POST(request: NextRequest) {
    try {
        if (!(await isAuthorized(request))) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        // Verifica lastSync — evita chamadas mais frequentes que 10s
        const { data: existing } = await supabaseAdmin
            .from('mio_cache')
            .select('tipo, atualizado_em')
            .eq('tipo', '__meta__')
            .maybeSingle();

        if (existing?.atualizado_em) {
            const diff = Date.now() - new Date(existing.atualizado_em).getTime();
            if (diff < MIN_INTERVAL_MS) {
                return NextResponse.json({
                    success: true,
                    cached: true,
                    message: `Cache ainda recente (${Math.round(diff / 1000)}s atrás). Aguarde ${Math.ceil((MIN_INTERVAL_MS - diff) / 1000)}s.`,
                });
            }
        }

        console.log('[MIO Cache] Iniciando coleta de dados...');

        const [integrantes, treinamentos, embarques, lgpReports] = await Promise.all([
            mioClient.getIntegrantes().catch(e => { console.error('[MIO Cache] Erro integrantes:', e); return []; }),
            mioClient.getAllTreinamentos().catch(e => { console.error('[MIO Cache] Erro treinamentos:', e); return []; }),
            mioClient.getAllEmbarques().catch(e => { console.error('[MIO Cache] Erro embarques:', e); return []; }),
            mioClient.getLGPReportsRaw().catch(e => { console.error('[MIO Cache] Erro LGP:', e); return []; }),
        ]);

        const now = new Date().toISOString();
        const entries = [
            { tipo: 'integrantes', dados: JSON.stringify(integrantes), total_registros: integrantes.length, atualizado_em: now },
            { tipo: 'treinamentos', dados: JSON.stringify(treinamentos), total_registros: treinamentos.length, atualizado_em: now },
            { tipo: 'embarques', dados: JSON.stringify(embarques), total_registros: embarques.length, atualizado_em: now },
            { tipo: 'lgp_reports', dados: JSON.stringify(lgpReports), total_registros: lgpReports.length, atualizado_em: now },
        ];

        for (const entry of entries) {
            const { error } = await supabaseAdmin
                .from('mio_cache')
                .upsert(entry, { onConflict: 'tipo' });
            if (error) console.error(`[MIO Cache] Erro upsert ${entry.tipo}:`, error.message);
        }

        // Salva timestamp global
        await supabaseAdmin
            .from('mio_cache')
            .upsert({ tipo: '__meta__', dados: JSON.stringify({ ultima_execucao: now }), total_registros: 0, atualizado_em: now }, { onConflict: 'tipo' });

        console.log('[MIO Cache] Coleta concluída.', {
            integrantes: integrantes.length,
            treinamentos: treinamentos.length,
            embarques: embarques.length,
            lgp_reports: lgpReports.length,
        });

        return NextResponse.json({
            success: true,
            cached: false,
            data: {
                integrantes: integrantes.length,
                treinamentos: treinamentos.length,
                embarques: embarques.length,
                lgp_reports: lgpReports.length,
                atualizado_em: now,
            },
        });
    } catch (error: any) {
        console.error('[MIO Cache] Erro fatal:', error);
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
