import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { processarDocumentoOCR } from '@/lib/ocr';
import type { OCRTipoDocumento } from '@/types/ocr';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const tableName = body.table || 'documentos';
    const bucketName = body.bucket || 'gestao-tripulantes-documentos';
    const urlField = body.url_field || 'arquivo_url';
    const tipoField = body.tipo_field || 'tipo_documento';
    const ocrStatusField = body.ocr_status_field || 'ocr_status';
    const ocrTextField = body.ocr_texto_field || 'ocr_texto';
    const ocrDadosField = body.ocr_dados_field || 'ocr_dados_extraidos';
    const ocrDataField = body.ocr_data_field || 'ocr_data';
    const ocrErroField = body.ocr_erro_field || 'ocr_erro';

    const { data: documento, error: docError } = await supabaseAdmin
      .from(tableName)
      .select(`*`)
      .eq('id', id)
      .maybeSingle();

    if (docError || !documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    const arquivoUrl = documento[urlField];
    if (!arquivoUrl) {
      return NextResponse.json({ error: 'Documento não possui arquivo para processar OCR' }, { status: 400 });
    }

    await supabaseAdmin
      .from(tableName)
      .update({ [ocrStatusField]: 'processando', updated_at: new Date().toISOString() })
      .eq('id', id);

    const tipoDocumento = documento[tipoField] as OCRTipoDocumento | undefined;
    const result = await processarDocumentoOCR(arquivoUrl, tipoDocumento);

    if (!result.success || !result.data) {
      await supabaseAdmin
        .from(tableName)
        .update({
          [ocrStatusField]: 'erro',
          [ocrErroField]: result.error || 'Falha no processamento OCR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ error: result.error || 'Erro ao processar OCR' }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({
        [ocrStatusField]: 'concluido',
        [ocrTextField]: result.data.texto,
        [ocrDadosField]: result.data.dadosExtraidos,
        [ocrDataField]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao salvar resultado do OCR' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        documento: updated,
        ocr: {
          confianca: result.data.confianca,
          dados_extraidos: result.data.dadosExtraidos,
          texto_extraido: result.data.texto.substring(0, 500),
        },
      },
    });
  } catch (error) {
    console.error('[OCR Document Process] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
