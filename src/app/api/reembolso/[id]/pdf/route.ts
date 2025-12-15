
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateReimbursementPDF } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        console.log(`[PDF] Iniciando download do relatório para reembolso: ${id}`);

        // 1. Tentar buscar o PDF no Storage primeiro (caminho: relatorios/ID.pdf)
        const fileName = `relatorios/${id}.pdf`;
        const bucketName = 'comprovantes';

        const { data: fileData, error: fileError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .download(fileName);

        if (!fileError && fileData) {
            console.log(`[PDF] Arquivo encontrado no Storage: ${fileName}`);
            // Converter Blob para ArrayBuffer para Buffer
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="Relatorio_Despesas_${id.slice(0, 8)}.pdf"`,
                },
            });
        }

        console.log(`[PDF] Arquivo não encontrado no Storage via download (${fileError?.message}). Gerando novo...`);

        // 2. Se não existir, buscar dados do reembolso no banco
        let protocol = id;
        let reimbursementData: any = null;

        // Tentar buscar por ID primeiro
        let { data: reimbursement, error: dbError } = await supabaseAdmin
            .from('Reimbursement')
            .select('*, user:email(first_name, last_name, department)')
            .eq('id', id)
            .single();

        if (dbError || !reimbursement) {
            // Tentar buscar por protocolo se ID falhar
            const { data: byProtocol, error: protocolError } = await supabaseAdmin
                .from('Reimbursement')
                .select('*, user:email(first_name, last_name, department)')
                .eq('protocolo', id)
                .single();

            if (protocolError || !byProtocol) {
                console.error('[PDF] Reembolso não encontrado no banco:', dbError || protocolError);
                return NextResponse.json({ error: 'Reembolso não encontrado' }, { status: 404 });
            }
            reimbursement = byProtocol;
        }

        // 3. Gerar o PDF
        const pdfBuffer = await generateReimbursementPDF({
            id: reimbursement.id,
            created_at: reimbursement.created_at,
            valor: reimbursement.valor_total || reimbursement.valorTotal || 0,
            descricao: reimbursement.descricao,
            status: reimbursement.status,
            user_email: reimbursement.email,
            user_name: reimbursement.nome || reimbursement.user?.first_name ? `${reimbursement.user.first_name} ${reimbursement.user.last_name}` : null,
            department: reimbursement.centro_custo || reimbursement.centroCusto,
            category: reimbursement.tipo_reembolso || reimbursement.tipoReembolso,
            items: reimbursement.items // Se houver items detalhados
        });

        // 4. Salvar no Storage para cache futuro (fire and forget ou await)
        // Usar upsert para garantir
        const { error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error('[PDF] Erro ao salvar PDF gerado no Storage:', uploadError);
            // Não falhar o request, apenas logar
        } else {
            console.log(`[PDF] PDF gerado e salvo no Storage com sucesso: ${fileName}`);
        }

        // 5. Retornar o arquivo gerado
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Relatorio_Despesas_${reimbursement.id.slice(0, 8)}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('[PDF] Erro fatal ao processar download:', error);
        return NextResponse.json({ error: 'Erro interno ao gerar PDF' }, { status: 500 });
    }
}
