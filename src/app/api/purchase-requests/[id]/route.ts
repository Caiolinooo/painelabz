import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { PurchaseRequest } from '@/types/purchase-request';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
        }

        const { id } = params;

        // Get purchase request
        const { data: requestData, error: requestError } = await supabase
            .from('purchase_requests')
            .select('*')
            .eq('id', id);

        if (requestError) {
            console.error('Error fetching purchase request:', requestError);
            return NextResponse.json({ error: 'Erro ao buscar requisição' }, { status: 500 });
        }

        if (!requestData || requestData.length === 0) {
            return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
        }

        const purchaseRequest = requestData[0];

        // Get items
        const { data: itemsData, error: itemsError } = await supabase
            .from('purchase_request_items')
            .select('*')
            .eq('purchase_request_id', id);

        if (itemsError) {
            console.error('Error fetching items:', itemsError);
            return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 });
        }

        // Get approval flow
        const { data: flowData, error: flowError } = await supabase
            .from('approval_flows')
            .select('*')
            .eq('purchase_request_id', id);

        if (flowError) {
            console.error('Error fetching approval flow:', flowError);
            return NextResponse.json({ error: 'Erro ao buscar fluxo de aprovação' }, { status: 500 });
        }

        return NextResponse.json({
            data: {
                ...purchaseRequest,
                items: itemsData || [],
                approval_flow: flowData?.[0] || null
            }
        });

    } catch (error: any) {
        console.error('Error in purchase request details:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { items, ...formData } = body;

        // Verify request belongs to user and is draft
        const { data: currentRequest, error: checkError } = await supabase
            .from('purchase_requests')
            .select('created_by, status')
            .eq('id', id)
            .single();

        if (checkError || !currentRequest) {
            return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
        }

        if (currentRequest.created_by !== authResult.user.id) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        if (currentRequest.status !== 'draft') {
            return NextResponse.json({ error: 'Apenas requisições em rascunho podem ser editadas' }, { status: 400 });
        }

        // Update purchase request
        const { error: updateError } = await supabase
            .from('purchase_requests')
            .update({
                ...formData,
                updated_at: new Date()
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating purchase request:', updateError);
            return NextResponse.json({ error: 'Erro ao atualizar requisição' }, { status: 500 });
        }

        // Update items - easiest way is delete and re-insert
        if (items && items.length > 0) {
            await supabase
                .from('purchase_request_items')
                .delete()
                .eq('purchase_request_id', id);

            const itemInserts = items.map((item: any) => ({
                purchase_request_id: id,
                description: item.description,
                quantity: item.quantity,
                unit_value: item.unit_value,
                total_value: item.quantity * item.unit_value
            }));

            const { error: itemError } = await supabase
                .from('purchase_request_items')
                .insert(itemInserts);

            if (itemError) {
                console.error('Error inserting updated items:', itemError);
                return NextResponse.json({ error: 'Erro ao atualizar itens' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error updating purchase request:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
        }

        const { id } = params;

        // Verify request belongs to user and is draft
        const { data: currentRequest, error: checkError } = await supabase
            .from('purchase_requests')
            .select('created_by, status')
            .eq('id', id)
            .single();

        if (checkError || !currentRequest) {
            return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
        }

        if (currentRequest.created_by !== authResult.user.id) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        if (currentRequest.status !== 'draft') {
            return NextResponse.json({ error: 'Apenas requisições em rascunho podem ser excluídas' }, { status: 400 });
        }

        // Delete purchase request (items and flow will be deleted automatically if ON DELETE CASCADE is set)
        const { error: deleteError } = await supabase
            .from('purchase_requests')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting purchase request:', deleteError);
            return NextResponse.json({ error: 'Erro ao excluir requisição' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting purchase request:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}