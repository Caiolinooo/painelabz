import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { mapDbTipoToCodigo, normalizeCpf } from '@/lib/gestao-tripulantes/escala-tipos';
import { mioClient } from '@/lib/mio/client';

export const dynamic = 'force-dynamic';

interface RawLGPRecord {
    'Matrícula': string;
    'Nome': string;
    'Função/Cargo': string;
    'Nascido Em': string;
    'CPF': string;
    'Regime': string;
    'Telefone 01': string;
    'Telefone 02': string;
    'Origem': string;
    'Centro de Custo do Integrante': string;
    'Centro de Custo da RTPE': string;
    'Nº RTPE': string;
    'Nº do Projeto': string | null;
    'Doc. Cliente RTPE': string | null;
    'Destino': string;
    'Qtd. Início': string | null;
    'Qtd. Fim': string | null;
    'Exame Em': string | null;
    'Prev. de Emb.': string;
    'Embarque Real': string;
    'Prev. Desemb.': string;
    'RTPE Status': string;
    'Nº RTPD': string;
    'Doc. Cliente RTPD': string;
    'Prev. Desemb. RTPD': string;
    'Desembarque Real': string;
    'RTPD Status': string;
    'Qtd. de Dias': string;
    'Folga Início': string;
    'Folga Fim': string;
}

interface ScheduleEntry {
    id: string;
    cpf: string;
    full_name: string;
    position: string;
    vessel: string;
    company: string;
    rotation_start: string | null;
    rotation_end: string | null;
    embarque_status: string | null;
    local_embarque: string;
    /** Stable schedule codigo: normal | fi | dba | stb | offc | custom */
    rotation_type: string;
    /** Explicit observations (local events); never mixed into embarque_status */
    observacoes: string | null;
    tipo_codigo: string;
    origem?: 'mio' | 'local';
}

type DetectedExtraType = 'fi' | 'dba' | 'stb' | 'offc';

function parseDate(str: string | null): Date | null {
    if (!str || str.trim() === '') return null;
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

function daysBetween(d1: Date, d2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

function detectRotationType(
    currentRecord: RawLGPRecord,
    nextRecord: RawLGPRecord | null
): { type: 'normal' | DetectedExtraType; extraPeriods: { start: string; end: string; type: DetectedExtraType }[] } {
    const extraPeriods: { start: string; end: string; type: DetectedExtraType }[] = [];

    const desembarqueReal = parseDate(currentRecord['Desembarque Real']);
    const prevDesemb = parseDate(currentRecord['Prev. Desemb.']);
    const folgaInicio = parseDate(currentRecord['Folga Início']);
    const folgaFim = parseDate(currentRecord['Folga Fim']);

    const rotationEnd = desembarqueReal || prevDesemb;

    if (!rotationEnd) {
        return { type: 'normal', extraPeriods };
    }

    const nextEmbReal = nextRecord ? parseDate(nextRecord['Embarque Real']) : null;
    const nextPrevEmb = nextRecord ? parseDate(nextRecord['Prev. de Emb.']) : null;
    const nextEmbarque = nextEmbReal || nextPrevEmb;

    if (!nextEmbarque) {
        if (folgaInicio && folgaFim) {
            const daysAfterFolga = daysBetween(rotationEnd, folgaInicio);
            if (daysAfterFolga > 1) {
                extraPeriods.push({
                    start: rotationEnd.toISOString().split('T')[0],
                    end: folgaInicio.toISOString().split('T')[0],
                    type: 'offc',
                });
            }
            extraPeriods.push({
                start: folgaInicio.toISOString().split('T')[0],
                end: folgaFim.toISOString().split('T')[0],
                type: 'offc',
            });
        }
        return { type: 'normal', extraPeriods };
    }

    const daysBetweenRotations = daysBetween(rotationEnd, nextEmbarque);

    if (daysBetweenRotations <= 1) {
        extraPeriods.push({
            start: rotationEnd.toISOString().split('T')[0],
            end: nextEmbarque.toISOString().split('T')[0],
            type: 'dba',
        });
        return { type: 'dba', extraPeriods };
    }

    if (folgaInicio && folgaFim) {
        const daysAfterFolga = daysBetween(rotationEnd, folgaInicio);
        if (daysAfterFolga > 1) {
            extraPeriods.push({
                start: rotationEnd.toISOString().split('T')[0],
                end: folgaInicio.toISOString().split('T')[0],
                type: 'offc',
            });
        }

        extraPeriods.push({
            start: folgaInicio.toISOString().split('T')[0],
            end: folgaFim.toISOString().split('T')[0],
            type: 'offc',
        });

        const daysFolgaToEnd = daysBetween(folgaFim, nextEmbarque);
        if (daysFolgaToEnd > 1) {
            extraPeriods.push({
                start: folgaFim.toISOString().split('T')[0],
                end: nextEmbarque.toISOString().split('T')[0],
                type: 'stb',
            });
            return { type: 'stb', extraPeriods };
        }
    } else {
        extraPeriods.push({
            start: rotationEnd.toISOString().split('T')[0],
            end: nextEmbarque.toISOString().split('T')[0],
            type: 'offc',
        });
    }

    return { type: 'normal', extraPeriods };
}

export async function GET(request: NextRequest) {
    try {
        let token: string | null = null;
        const authHeader = request.headers.get('authorization') || undefined;
        if (authHeader) {
            token = extractTokenFromHeader(authHeader);
        }
        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }

        if (!token) {
            return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        console.log('[ManSchedule] Buscando dados do cache MIO...');

        const { data: cacheData, error: cacheError } = await supabaseAdmin
            .from('mio_cache')
            .select('tipo, dados')
            .in('tipo', ['integrantes', 'lgp_reports']);

        let integrantes: any[] = [];
        let lgpRecords: any[] = [];

        if (cacheError || !cacheData || cacheData.length < 2) {
            console.log('[ManSchedule] Cache MIO incompleto ou vazio. Buscando dados em tempo real e atualizando cache...');
            try {
                const [integrantesRes, lgpRes] = await Promise.all([
                    mioClient.getIntegrantes().catch((e) => { console.error('Erro integrantes:', e); return []; }),
                    mioClient.getLGPReportsRaw().catch((e) => { console.error('Erro LGP:', e); return []; }),
                ]);

                integrantes = integrantesRes;
                lgpRecords = lgpRes;

                const now = new Date().toISOString();
                const entries = [
                    { tipo: 'integrantes', dados: integrantes, total_registros: integrantes.length, atualizado_em: now },
                    { tipo: 'lgp_reports', dados: lgpRecords, total_registros: lgpRecords.length, atualizado_em: now },
                ];

                for (const entry of entries) {
                    await supabaseAdmin.from('mio_cache').upsert(entry, { onConflict: 'tipo' });
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error('Falha ao coletar dados em tempo real do MIO:', err);
                return NextResponse.json({
                    success: false,
                    error: 'Cache MIO indisponível e falha na comunicação em tempo real com a API do MIO.',
                    message,
                }, { status: 503 });
            }
        } else {
            integrantes = cacheData.find((c) => c.tipo === 'integrantes')?.dados as any[] || [];
            lgpRecords = cacheData.find((c) => c.tipo === 'lgp_reports')?.dados as any[] || [];
        }

        console.log(`[ManSchedule] Cache carregado: ${integrantes.length} integrantes, ${lgpRecords.length} registros LGP`);

        // Index LGP by normalized CPF for reliable joins
        const lgpByCpf = new Map<string, RawLGPRecord[]>();
        for (const record of lgpRecords || []) {
            if (!record) continue;
            const cpfKey = normalizeCpf(record['CPF'] || '');
            if (!cpfKey) continue;
            const list = lgpByCpf.get(cpfKey) || [];
            list.push(record);
            lgpByCpf.set(cpfKey, list);
        }

        const schedules: ScheduleEntry[] = [];

        for (const integrante of integrantes) {
            if (!integrante) continue;

            const cpfNorm = normalizeCpf(integrante.cpf || '');
            const personRecords = (lgpByCpf.get(cpfNorm) || []).slice().sort((a, b) => {
                const dateA = a['Embarque Real'] || a['Prev. de Emb.'] || '';
                const dateB = b['Embarque Real'] || b['Prev. de Emb.'] || '';
                return dateA.localeCompare(dateB);
            });

            if (personRecords.length > 0) {
                for (let i = 0; i < personRecords.length; i++) {
                    const record = personRecords[i];
                    const nextRecord = personRecords[i + 1] || null;

                    const rotationStart = record['Embarque Real'] || record['Prev. de Emb.'] || null;
                    const rotationEnd = record['Desembarque Real'] || record['Prev. Desemb. RTPD'] || record['Prev. Desemb.'] || null;

                    const { type, extraPeriods } = detectRotationType(record, nextRecord);

                    schedules.push({
                        id: `${integrante.id}_${record['Nº RTPE'] || i}`,
                        cpf: cpfNorm || integrante.cpf,
                        full_name: (integrante.nome || '').toUpperCase().trim(),
                        position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                        vessel: (record['Destino'] || integrante.base || '').trim(),
                        company: (integrante.departamento || integrante.setor || record['Centro de Custo do Integrante'] || '').trim(),
                        rotation_start: rotationStart,
                        rotation_end: rotationEnd,
                        embarque_status: record['RTPE Status'] || null,
                        local_embarque: (record['Origem'] || '').trim(),
                        rotation_type: type,
                        observacoes: null,
                        tipo_codigo: type,
                        origem: 'mio',
                    });

                    for (const extra of extraPeriods) {
                        schedules.push({
                            id: `${integrante.id}_${record['Nº RTPE'] || i}_${extra.type}`,
                            cpf: cpfNorm || integrante.cpf,
                            full_name: (integrante.nome || '').toUpperCase().trim(),
                            position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                            vessel: (record['Destino'] || integrante.base || '').trim(),
                            company: (integrante.departamento || integrante.setor || record['Centro de Custo do Integrante'] || '').trim(),
                            rotation_start: extra.start,
                            rotation_end: extra.end,
                            embarque_status: extra.type,
                            local_embarque: (record['Origem'] || '').trim(),
                            rotation_type: extra.type,
                            observacoes: null,
                            tipo_codigo: extra.type,
                            origem: 'mio',
                        });
                    }
                }
            } else {
                schedules.push({
                    id: integrante.id?.toString() || Math.random().toString(),
                    cpf: cpfNorm || integrante.cpf,
                    full_name: (integrante.nome || '').toUpperCase().trim(),
                    position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                    vessel: (integrante.base || '').trim(),
                    company: (integrante.departamento || integrante.setor || '').trim(),
                    rotation_start: null,
                    rotation_end: null,
                    embarque_status: null,
                    local_embarque: '',
                    rotation_type: 'normal',
                    observacoes: null,
                    tipo_codigo: 'normal',
                    origem: 'mio',
                });
            }
        }

        // Merge ONLY local overrides — avoid double-counting MIO-synced rows
        try {
            const { data: localEmbarques } = await supabaseAdmin
                .from('gt_historico_embarques')
                .select(`
                    id,
                    tipo,
                    data_embarque,
                    data_desembarque,
                    local_embarque,
                    local_desembarque,
                    observacoes,
                    origem,
                    colaborador:gt_vw_colaboradores_completo(
                        cpf,
                        nome_completo,
                        cargo_nome,
                        empresa_nome
                    )
                `)
                .eq('origem', 'local')
                .is('deleted_at', null);

            if (localEmbarques && localEmbarques.length > 0) {
                for (const entry of localEmbarques) {
                    const colab = entry.colaborador as {
                        cpf?: string;
                        nome_completo?: string;
                        cargo_nome?: string;
                        empresa_nome?: string;
                    } | null;
                    if (!colab) continue;

                    const rotType = mapDbTipoToCodigo(entry.tipo);
                    const cpfNorm = normalizeCpf(colab.cpf || '');
                    const obs = (entry.observacoes || '').trim() || null;

                    schedules.push({
                        id: entry.id,
                        cpf: cpfNorm,
                        full_name: (colab.nome_completo || '').toUpperCase().trim(),
                        position: (colab.cargo_nome || '').toUpperCase().trim(),
                        vessel: (entry.local_desembarque || '').trim(),
                        company: (colab.empresa_nome || '').trim(),
                        rotation_start: entry.data_embarque,
                        rotation_end: entry.data_desembarque,
                        embarque_status: 'Manual',
                        local_embarque: (entry.local_embarque || '').trim(),
                        rotation_type: rotType,
                        observacoes: obs,
                        tipo_codigo: rotType,
                        origem: 'local',
                    });
                }
            }
        } catch (localErr) {
            console.error('Erro ao buscar embarques locais:', localErr);
        }

        const vessels = Array.from(new Set(schedules.map((s) => s.vessel).filter(Boolean))).sort();
        const positions = Array.from(new Set(schedules.map((s) => s.position).filter(Boolean))).sort();
        const companies = Array.from(new Set(schedules.map((s) => s.company).filter(Boolean))).sort();

        return NextResponse.json({
            success: true,
            count: schedules.length,
            data: schedules,
            meta: {
                vessels,
                positions,
                companies,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ManSchedule API error]', error);
        return NextResponse.json({
            success: false,
            error: 'Falha ao buscar dados do MIO em tempo real.',
            message,
        }, { status: 500 });
    }
}
