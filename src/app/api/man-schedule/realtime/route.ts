import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 10;

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
    rotation_type: 'normal' | 'fi' | 'dba' | 'stb' | 'offc';
}

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
): { type: 'normal' | 'fi' | 'dba' | 'stb' | 'offc'; extraPeriods: { start: string; end: string; type: 'fi' | 'dba' | 'stb' | 'offc' }[] } {
    const extraPeriods: { start: string; end: string; type: 'fi' | 'dba' | 'stb' | 'offc' }[] = [];
    
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
                    type: 'offc'
                });
            }
            extraPeriods.push({
                start: folgaInicio.toISOString().split('T')[0],
                end: folgaFim.toISOString().split('T')[0],
                type: 'offc'
            });
        }
        return { type: 'normal', extraPeriods };
    }
    
    const daysBetweenRotations = daysBetween(rotationEnd, nextEmbarque);
    
    if (daysBetweenRotations <= 1) {
        extraPeriods.push({
            start: rotationEnd.toISOString().split('T')[0],
            end: nextEmbarque.toISOString().split('T')[0],
            type: 'dba'
        });
        return { type: 'dba', extraPeriods };
    }
    
    if (folgaInicio && folgaFim) {
        const daysAfterFolga = daysBetween(rotationEnd, folgaInicio);
        if (daysAfterFolga > 1) {
            extraPeriods.push({
                start: rotationEnd.toISOString().split('T')[0],
                end: folgaInicio.toISOString().split('T')[0],
                type: 'offc'
            });
        }
        
        extraPeriods.push({
            start: folgaInicio.toISOString().split('T')[0],
            end: folgaFim.toISOString().split('T')[0],
            type: 'offc'
        });
        
        const daysFolgaToEnd = daysBetween(folgaFim, nextEmbarque);
        if (daysFolgaToEnd > 1) {
            extraPeriods.push({
                start: folgaFim.toISOString().split('T')[0],
                end: nextEmbarque.toISOString().split('T')[0],
                type: 'stb'
            });
            return { type: 'stb', extraPeriods };
        }
    } else {
        extraPeriods.push({
            start: rotationEnd.toISOString().split('T')[0],
            end: nextEmbarque.toISOString().split('T')[0],
            type: 'offc'
        });
    }
    
    return { type: 'normal', extraPeriods };
}

export async function GET(request: NextRequest) {
    try {
        console.log('[ManSchedule] Buscando dados do cache MIO...');

        const { data: cacheData, error: cacheError } = await supabaseAdmin
            .from('mio_cache')
            .select('tipo, dados')
            .in('tipo', ['integrantes', 'lgp_reports']);

        if (cacheError || !cacheData || cacheData.length < 2) {
            return NextResponse.json({
                success: false,
                error: 'Cache MIO indisponível. Execute /api/mio/cache/atualizar primeiro.',
            }, { status: 503 });
        }

        const integrantes = cacheData.find(c => c.tipo === 'integrantes')?.dados as any[] || [];
        const lgpRecords = cacheData.find(c => c.tipo === 'lgp_reports')?.dados as any[] || [];

        console.log(`[ManSchedule] Cache carregado: ${integrantes.length} integrantes, ${lgpRecords.length} registros LGP`);

        const schedules: ScheduleEntry[] = [];

        for (const integrante of integrantes) {
            if (!integrante) continue;

            const personRecords: RawLGPRecord[] = (lgpRecords || []).filter((e: any) =>
                e && e['CPF'] === integrante.cpf
            ).sort((a: any, b: any) => {
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
                        cpf: integrante.cpf,
                        full_name: (integrante.nome || '').toUpperCase().trim(),
                        position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                        vessel: (record['Destino'] || integrante.base || '').trim(),
                        company: (integrante.departamento || integrante.setor || record['Centro de Custo do Integrante'] || '').trim(),
                        rotation_start: rotationStart,
                        rotation_end: rotationEnd,
                        embarque_status: record['RTPE Status'] || null,
                        local_embarque: (record['Origem'] || '').trim(),
                        rotation_type: type
                    });
                    
                    for (const extra of extraPeriods) {
                        schedules.push({
                            id: `${integrante.id}_${record['Nº RTPE'] || i}_${extra.type}`,
                            cpf: integrante.cpf,
                            full_name: (integrante.nome || '').toUpperCase().trim(),
                            position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                            vessel: (record['Destino'] || integrante.base || '').trim(),
                            company: (integrante.departamento || integrante.setor || record['Centro de Custo do Integrante'] || '').trim(),
                            rotation_start: extra.start,
                            rotation_end: extra.end,
                            embarque_status: extra.type,
                            local_embarque: (record['Origem'] || '').trim(),
                            rotation_type: extra.type
                        });
                    }
                }
            } else {
                schedules.push({
                    id: integrante.id?.toString() || Math.random().toString(),
                    cpf: integrante.cpf,
                    full_name: (integrante.nome || '').toUpperCase().trim(),
                    position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                    vessel: (integrante.base || '').trim(),
                    company: (integrante.departamento || integrante.setor || '').trim(),
                    rotation_start: null,
                    rotation_end: null,
                    embarque_status: null,
                    local_embarque: '',
                    rotation_type: 'normal'
                });
            }
        }

        const vessels = Array.from(new Set(schedules.map(s => s.vessel).filter(Boolean))).sort();
        const positions = Array.from(new Set(schedules.map(s => s.position).filter(Boolean))).sort();
        const companies = Array.from(new Set(schedules.map(s => s.company).filter(Boolean))).sort();

        return NextResponse.json({
            success: true,
            count: schedules.length,
            data: schedules,
            meta: {
                vessels,
                positions,
                companies
            }
        });

    } catch (error: any) {
        console.error('[ManSchedule API error]', error);
        return NextResponse.json({
            success: false,
            error: 'Falha ao buscar dados do MIO em tempo real.',
            message: error.message
        }, { status: 500 });
    }
}
