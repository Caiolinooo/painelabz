import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { generatePurchaseRequestPDF } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { id } = params;
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Fetch the purchase request
        const { data: rqfData, error: dbError } = await supabaseAdmin
            .from('purchase_requests')
            .select(`
                *,
                sectors(name)
            `)
            .eq('id', id)
            .single();

        if (dbError || !rqfData) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Fetch Items
        const { data: items, error: itemsError } = await supabaseAdmin
            .from('purchase_request_items')
            .select('*')
            .eq('purchase_request_id', id);

        if (itemsError) {
             return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
        }

        const pdfData = {
            ...rqfData,
            sector_name: rqfData.sectors?.name,
            items: items || []
        };

        // Generate PDF
        const pdfBuffer = await generatePurchaseRequestPDF(pdfData);

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="RQF_${rqfData.rqf_number || id.slice(0,8)}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('[PDF] Erro fatal ao processar RQF pdf:', error);
        return NextResponse.json({ error: 'Erro interno ao gerar PDF' }, { status: 500 });
    }
}
