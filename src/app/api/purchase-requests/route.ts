import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { PurchaseRequest } from '@/types/purchase-request';

const SECTOR_CODE_STOPWORDS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E']);

function getCurrentDateCode(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function buildSectorCode(sectorName?: string | null) {
    const normalized = (sectorName || 'RQ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    const parts = normalized
        .split(/[^A-Z0-9]+/)
        .filter(Boolean)
        .filter(part => !SECTOR_CODE_STOPWORDS.has(part));

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`;
    }

    const compact = (parts[0] || normalized.replace(/[^A-Z0-9]/g, '') || 'RQ').slice(0, 2);
    return compact.padEnd(2, 'X');
}

async function generateRcfNumber(sectorId: string) {
    const { data: sector } = await supabaseAdmin
        .from('sectors')
        .select('name')
        .eq('id', sectorId)
        .maybeSingle();

    const baseRcfNumber = `RQF-${getCurrentDateCode()}-${buildSectorCode(sector?.name)}`;

    const { data: existingNumbers } = await supabaseAdmin
        .from('purchase_requests')
        .select('rqf_number')
        .ilike('rqf_number', `${baseRcfNumber}%`);

    const highestSequence = (existingNumbers || []).reduce((max, row) => {
        const currentNumber = row.rqf_number;
        if (!currentNumber) return max;
        if (currentNumber === baseRcfNumber) return Math.max(max, 1);
        if (!currentNumber.startsWith(`${baseRcfNumber}-`)) return max;

        const suffix = Number(currentNumber.replace(`${baseRcfNumber}-`, ''));
        return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0);

    if (highestSequence === 0) {
        return `${baseRcfNumber}-01`;
    }

    return `${baseRcfNumber}-${String(highestSequence + 1).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { items, ...formData } = body;

        // Validate required fields
        if (!formData.provider_name || !formData.buyer_name || !formData.sector_id) {
            return NextResponse.json({ error: 'Dados obrigatórios não preenchidos' }, { status: 400 });
        }

        // Create purchase request
        const { data: requestData, error: requestError } = await supabase
            .from('purchase_requests')
            .insert({
                ...formData,
                status: 'draft',
                created_by: authResult.user.id,
                created_at: new Date()
            })
            .select();

        if (requestError) {
            console.error('Error creating purchase request:', requestError);
            return NextResponse.json({ error: 'Erro ao criar requisição' }, { status: 500 });
        }

        const purchaseRequestId = requestData[0].id;

        // Insert items
        const itemInserts = items.map((item: any) => ({
            purchase_request_id: purchaseRequestId,
            description: item.description,
            quantity: item.quantity,
            unit_value: item.unit_value,
            total_value: item.quantity * item.unit_value
        }));

        const { error: itemError } = await supabase
            .from('purchase_request_items')
            .insert(itemInserts);

        if (itemError) {
            console.error('Error inserting items:', itemError);
            return NextResponse.json({ error: 'Erro ao inserir itens' }, { status: 500 });
        }

        // Generate RQF number
        const rqfNumber = await generateRcfNumber(formData.sector_id);

        // Update request with RQF number
        await supabase
            .from('purchase_requests')
            .update({ rqf_number: rqfNumber })
            .eq('id', purchaseRequestId);

        // Create workflow entry
        await supabase
            .from('approval_flows')
            .insert({
                purchase_request_id: purchaseRequestId,
                current_step: 'pending',
                created_at: new Date()
            });

        return NextResponse.json({ 
            data: { 
                id: purchaseRequestId,
                rqf_number: rqfNumber,
                status: 'draft'
            }
        });

    } catch (error: any) {
        console.error('Error in purchase request creation:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}