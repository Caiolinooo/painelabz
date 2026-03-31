import { NextRequest, NextResponse } from 'next/server';
import { mioClient } from '@/lib/mio/client';

export const revalidate = 60;

export async function GET(request: NextRequest) {
    try {
        console.log('[ManSchedule] Buscando integrantes do MIO...');
        const integrantes = await mioClient.getIntegrantes();

        console.log('[ManSchedule] Buscando embarques do MIO...');
        const embarques = await mioClient.getEmbarques();

        // Build a flat list of crew members with ALL their embarques
        const schedules: any[] = [];

        for (const integrante of integrantes) {
            if (!integrante) continue;

            // Find ALL embarques for this person (not just the most recent)
            const personEmbarques = (embarques || []).filter(e =>
                e && e.cpf === integrante.cpf &&
                (e.status === 'programado' || e.status === 'embarcado' || e.status === 'desembarcado')
            );

            if (personEmbarques.length > 0) {
                // Create one entry per embarque so the frontend can paint multiple rotation blocks
                for (const emb of personEmbarques) {
                    schedules.push({
                        id: `${integrante.id}_${emb.id}`,
                        cpf: integrante.cpf,
                        full_name: (integrante.nome || '').toUpperCase().trim(),
                        position: (integrante.cargo || integrante.funcao || '').toUpperCase().trim(),
                        vessel: (emb.plataforma_unidade || integrante.base || '').trim(),
                        company: (integrante.departamento || integrante.setor || '').trim(),
                        rotation_start: emb.data_embarque || null,
                        rotation_end: emb.data_desembarque_prevista || emb.data_desembarque_real || null,
                        embarque_status: emb.status || null,
                        local_embarque: (emb.local_embarque || '').trim()
                    });
                }
            } else {
                // Include crew member even without embarque (they exist in the system)
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
                    local_embarque: ''
                });
            }
        }

        // Extract unique vessels for the filter dropdown
        const vessels = Array.from(new Set(schedules.map(s => s.vessel).filter(Boolean))).sort();

        // Extract unique positions
        const positions = Array.from(new Set(schedules.map(s => s.position).filter(Boolean))).sort();

        // Extract unique companies
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
