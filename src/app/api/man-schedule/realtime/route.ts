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

// ---------------------------------------------------------------------------
// Performance infrastructure
// ---------------------------------------------------------------------------

/** TTL of the in-memory computed-result cache (ms). */
const RESULT_CACHE_TTL_MS = 90_000;

/**
 * Janela presets: how far back / forward rotations are processed.
 * Default `90d` keeps past 45d + future 180d, which covers the rendered grid
 * without walking years of historical LGP records.
 */
const JANELA_PRESETS: Record<string, { pastDays: number; futureDays: number }> = {
    '30d': { pastDays: 15, futureDays: 60 },
    '90d': { pastDays: 45, futureDays: 180 },
    '180d': { pastDays: 90, futureDays: 360 },
    '365d': { pastDays: 180, futureDays: 540 },
    all: { pastDays: Number.POSITIVE_INFINITY, futureDays: Number.POSITIVE_INFINITY },
};
const DEFAULT_JANELA = '90d';

interface ResultCacheEntry {
    payload: Record<string, unknown>;
    /** Signature of the mio_cache rows the payload was built from. */
    mioSignature: string;
    builtAt: number;
}

/** janela key -> computed payload cache. */
const resultCache = new Map<string, ResultCacheEntry>();

/** Guard so only one background MIO refresh runs at a time. */
let backgroundRefreshInFlight: Promise<void> | null = null;

/**
 * Fire-and-forget refresh of the mio_cache table.
 * NEVER awaited on the request path.
 */
function triggerBackgroundMioRefresh(reason: string): void {
    if (backgroundRefreshInFlight) {
        console.log(`[ManSchedule] Refresh em background já em andamento (motivo ignorado: ${reason})`);
        return;
    }
    backgroundRefreshInFlight = (async () => {
        const started = Date.now();
        try {
            console.log(`[ManSchedule] Disparando refresh do MIO em background (motivo: ${reason})...`);
            const [integrantesRes, lgpRes] = await Promise.all([
                mioClient.getIntegrantes().catch((e) => { console.error('[ManSchedule][bg] Erro integrantes:', e); return []; }),
                mioClient.getLGPReportsRaw().catch((e) => { console.error('[ManSchedule][bg] Erro LGP:', e); return []; }),
            ]);

            const now = new Date().toISOString();
            const entries = [
                { tipo: 'integrantes', dados: integrantesRes, total_registros: integrantesRes.length, atualizado_em: now },
                { tipo: 'lgp_reports', dados: lgpRes, total_registros: lgpRes.length, atualizado_em: now },
            ];
            for (const entry of entries) {
                await supabaseAdmin.from('mio_cache').upsert(entry, { onConflict: 'tipo' });
            }
            // New data invalidates every cached payload signature.
            resultCache.clear();
            console.log(`[ManSchedule] Refresh background concluído em ${Date.now() - started}ms.`);
        } catch (err) {
            console.error('[ManSchedule][bg] Falha no refresh em background do MIO:', err);
        } finally {
            backgroundRefreshInFlight = null;
        }
    })();
}

function parseDate(str: string | null): Date | null {
    if (!str || str.trim() === '') return null;
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

/** Tolerant date parse for MIO values that may already include time/ISO info. */
function parseFlexibleDate(value: unknown): Date | null {
    if (!value || typeof value !== 'string' || value.trim() === '') return null;
    const direct = new Date(value);
    if (!isNaN(direct.getTime())) return direct;
    return parseDate(value.slice(0, 10));
}

function daysBetween(d1: Date, d2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/** True when [start,end] overlaps the processing window (end fallback: start+90d). */
function rotationOverlapsWindow(
    startStr: string | null,
    endStr: string | null,
    windowStart: number,
    windowEnd: number
): boolean {
    if (!startStr && !endStr) return true; // undated entries always kept
    const start = startStr ? parseFlexibleDate(startStr)?.getTime() ?? windowEnd : windowEnd;
    let end = endStr ? parseFlexibleDate(endStr)?.getTime() ?? NaN : NaN;
    if (isNaN(end)) {
        end = isNaN(start) ? windowStart : start + 90 * 24 * 60 * 60 * 1000;
    }
    return start <= windowEnd && end >= windowStart;
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
    const t0 = Date.now();
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

        // ---- Janela filter (?janela=90d default; backward compatible when absent)
        const janelaParam = (request.nextUrl.searchParams.get('janela') || DEFAULT_JANELA).toLowerCase();
        const preset = JANELA_PRESETS[janelaParam] || JANELA_PRESETS[DEFAULT_JANELA];
        const nowMs = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const windowStart = nowMs - preset.pastDays * dayMs;
        const windowEnd = nowMs + preset.futureDays * dayMs;

        const timings: Record<string, number> = {};

        // ---- Stage 1: cheap freshness probe of mio_cache (no blobs)
        const probeStart = Date.now();
        const { data: probeData, error: probeError } = await supabaseAdmin
            .from('mio_cache')
            .select('tipo, atualizado_em, total_registros')
            .in('tipo', ['integrantes', 'lgp_reports']);
        timings.probe = Date.now() - probeStart;

        const rows = (probeData || []) as { tipo: string; atualizado_em: string | null; total_registros: number | null }[];
        const sigParts = ['integrantes', 'lgp_reports'].map(
            (tipo) => `${tipo}:${rows.find((r) => r.tipo === tipo)?.atualizado_em || 'missing'}:${rows.find((r) => r.tipo === tipo)?.total_registros ?? 'x'}`
        );
        const mioSignature = sigParts.join('|');

        // ---- Stage 2: serve computed result from memory when fresh & unchanged
        const cachedEntry = resultCache.get(janelaParam);
        if (
            cachedEntry &&
            !probeError &&
            rows.length >= 2 &&
            cachedEntry.mioSignature === mioSignature &&
            Date.now() - cachedEntry.builtAt < RESULT_CACHE_TTL_MS
        ) {
            timings.cacheRead = Date.now() - probeStart;
            const ageS = Math.round((Date.now() - cachedEntry.builtAt) / 1000);
            console.log(
                `[ManSchedule] CACHE HIT janela=${janelaParam} age=${ageS}s total=${timings.cacheRead}ms (probe ${timings.probe}ms)`
            );
            const hitPayload = {
                ...(cachedEntry.payload as any),
                meta: {
                    ...((cachedEntry.payload as any).meta || {}),
                    cached: true,
                    cache_age_s: ageS,
                    janela: janelaParam,
                    timings_ms: { ...timings },
                },
            };
            return NextResponse.json(hitPayload);
        }
        timings.cacheMissCheck = Date.now() - probeStart;
        console.log(
            `[ManSchedule] Cache miss (janela=${janelaParam}, signature=${cachedEntry ? 'stale' : 'empty'}, age=${
                cachedEntry ? Math.round((Date.now() - cachedEntry.builtAt) / 1000) + 's' : 'n/a'
            }) — reconstruindo schedule.`
        );

        // ---- Stage 3: load full blobs from mio_cache
        const blobStart = Date.now();
        const { data: cacheData, error: cacheError } = await supabaseAdmin
            .from('mio_cache')
            .select('tipo, dados')
            .in('tipo', ['integrantes', 'lgp_reports']);

        let integrantes: any[] = [];
        let lgpRecords: any[] = [];

        const hasIntegrantesRow = !!cacheData?.some((c) => c.tipo === 'integrantes');
        const hasLgpRow = !!cacheData?.some((c) => c.tipo === 'lgp_reports');

        if (cacheError || !cacheData || !hasIntegrantesRow || !hasLgpRow) {
            // NEVER call the MIO API inline on the request path: serve what we
            // have (or a fast 503) and kick off a fire-and-forget refresh.
            console.log('[ManSchedule] Cache MIO incompleto/vazio — servindo parcial e disparando refresh em background.');
            triggerBackgroundMioRefresh('cache incompleto');

            integrantes = (cacheData?.find((c) => c.tipo === 'integrantes')?.dados as any[]) || [];
            lgpRecords = (cacheData?.find((c) => c.tipo === 'lgp_reports')?.dados as any[]) || [];

            if (integrantes.length === 0 && lgpRecords.length === 0) {
                timings.blobRead = Date.now() - blobStart;
                console.log(`[ManSchedule] Nada para servir (503 rápido) em ${Date.now() - t0}ms.`);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Cache MIO indisponível. Atualização em tempo real foi disparada em segundo plano; tente novamente em instantes.',
                        refreshing: true,
                    },
                    { status: 503 }
                );
            }
        } else {
            integrantes = cacheData.find((c) => c.tipo === 'integrantes')?.dados as any[] || [];
            lgpRecords = cacheData.find((c) => c.tipo === 'lgp_reports')?.dados as any[] || [];
        }
        timings.blobRead = Date.now() - blobStart;

        console.log(
            `[ManSchedule] Cache carregado (${timings.blobRead}ms): ${integrantes.length} integrantes, ${lgpRecords.length} registros LGP`
        );

        // ---- Stage 4: build schedule (window-filtered)
        const buildStart = Date.now();

        // Index LGP by normalized CPF for reliable joins
        const lgpByCpf = new Map<string, RawLGPRecord[]>();
        let lgpSkippedByWindow = 0;
        for (const record of lgpRecords || []) {
            if (!record) continue;
            // Window filter first: skip rotations entirely outside [past, future].
            const recStart = record['Embarque Real'] || record['Prev. de Emb.'] || null;
            const recEnd =
                record['Desembarque Real'] || record['Prev. Desemb. RTPD'] || record['Prev. Desemb.'] || null;
            if (!rotationOverlapsWindow(recStart, recEnd, windowStart, windowEnd)) {
                lgpSkippedByWindow++;
                continue;
            }
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
                    const nextRecord = i + 1 < personRecords.length ? personRecords[i + 1] : null;

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
        timings.build = Date.now() - buildStart;

        // ---- Stage 5: merge local overrides via DIRECT queries (no heavy view).
        const mergeStart = Date.now();
        try {
            const { data: localEmbarques } = await supabaseAdmin
                .from('gt_historico_embarques')
                .select(`
                    id,
                    colaborador_id,
                    tipo,
                    data_embarque,
                    data_desembarque,
                    local_embarque,
                    local_desembarque,
                    observacoes
                `)
                .eq('origem', 'local')
                .is('deleted_at', null)
                .gte('data_embarque', new Date(windowStart).toISOString().slice(0, 10))
                .lte('data_embarque', new Date(windowEnd).toISOString().slice(0, 10));

            if (localEmbarques && localEmbarques.length > 0) {
                // Targeted collaborator lookup (base tables, not the view).
                const colabIds = Array.from(
                    new Set(localEmbarques.map((e) => e.colaborador_id).filter(Boolean))
                ) as string[];

                const colabById = new Map<
                    string,
                    { cpf?: string; nome_completo?: string; cargo_nome?: string; empresa_nome?: string }
                >();

                if (colabIds.length > 0) {
                    const { data: colabs } = await supabaseAdmin
                        .from('gt_colaboradores')
                        .select(`
                            id,
                            cpf,
                            nome_completo,
                            cargo:gt_cargos(nome),
                            empresa:gt_empresas(nome)
                        `)
                        .in('id', colabIds);

                    for (const c of colabs || []) {
                        colabById.set(c.id, {
                            cpf: c.cpf,
                            nome_completo: c.nome_completo,
                            cargo_nome: (c as any).cargo?.nome,
                            empresa_nome: (c as any).empresa?.nome,
                        });
                    }
                }

                for (const entry of localEmbarques) {
                    const colab = colabById.get(entry.colaborador_id);
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
        timings.localMerge = Date.now() - mergeStart;

        const vessels = Array.from(new Set(schedules.map((s) => s.vessel).filter(Boolean))).sort();
        const positions = Array.from(new Set(schedules.map((s) => s.position).filter(Boolean))).sort();
        const companies = Array.from(new Set(schedules.map((s) => s.company).filter(Boolean))).sort();

        const totalMs = Date.now() - t0;
        console.log(
            `[ManSchedule] Tempos (ms): probe=${timings.probe} blobRead=${timings.blobRead} build=${timings.build} localMerge=${timings.localMerge} TOTAL=${totalMs}` +
                (lgpSkippedByWindow > 0 ? ` | registros LGP fora da janela=${lgpSkippedByWindow}` : '')
        );

        const responseBody = {
            success: true,
            count: schedules.length,
            data: schedules,
            meta: {
                vessels,
                positions,
                companies,
                cached: false,
                janela: janelaParam,
                window: {
                    from: new Date(windowStart).toISOString().slice(0, 10),
                    to: new Date(windowEnd).toISOString().slice(0, 10),
                },
                timings_ms: { ...timings, total: totalMs },
            },
        };

        // Only cache when we actually had both cache rows (partial builds would
        // poison the signature-based freshness check).
        if (!cacheError && hasIntegrantesRow && hasLgpRow) {
            resultCache.set(janelaParam, {
                payload: responseBody,
                mioSignature,
                builtAt: Date.now(),
            });
        }

        return NextResponse.json(responseBody);
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
