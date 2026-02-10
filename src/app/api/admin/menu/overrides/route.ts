import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { unifiedDataService } from '@/lib/unifiedDataService';

export const dynamic = 'force-dynamic';

// GET - Obter overrides para um setor
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sectorId = searchParams.get('sector_id');

        if (!sectorId) {
            return NextResponse.json(
                { error: 'sector_id is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('card_overrides')
            .select('*')
            .eq('sector_id', sectorId);

        if (error) {
            console.error('Erro ao buscar overrides:', error);
            return NextResponse.json(
                { error: 'Erro interno do servidor' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro na API de menu overrides:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// POST - Criar ou atualizar override
export async function POST(request: NextRequest) {
    try {
        // Validar token de admin se necessário (geralmente tratado por middleware ou verificação de sessão aqui)
        // Assumindo que quem chama essa rota já passou por autenticação no frontend

        const body = await request.json();
        const { card_id, sector_id, custom_label, custom_icon, enabled, order } = body;

        if (!card_id || !sector_id) {
            return NextResponse.json(
                { error: 'card_id and sector_id are required' },
                { status: 400 }
            );
        }

        // Usar unifiedDataService para garantir cache invalidation
        await unifiedDataService.upsertOverride({
            card_id,
            sector_id,
            custom_label,
            custom_icon,
            enabled,
            order
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar override:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
