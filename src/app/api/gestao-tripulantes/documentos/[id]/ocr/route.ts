import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { processarDocumentoOCR, processarImagensPreRenderizadas } from '@/lib/ocr';
import { extrairDadosASODoTexto } from '@/lib/gestao-tripulantes/ocr-processor';
import type { OCRTipoDocumento } from '@/types/ocr';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — LLM vision pode levar tempo

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

    const { data: documento, error: docError } = await supabaseAdmin
      .from('gt_documentos')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    if (!documento.arquivo_url) {
      return NextResponse.json({ error: 'Documento não possui arquivo para processar OCR' }, { status: 400 });
    }

    // Atualizar status para processando
    await supabaseAdmin
      .from('gt_documentos')
      .update({ ocr_status: 'processando', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Verificar se o cliente enviou imagens pré-renderizadas (browser Canvas API)
    let result;
    try {
      const body = await request.json();
      const clientImages: string[] | undefined = body?.images;

      if (clientImages && Array.isArray(clientImages) && clientImages.length > 0) {
        // NOVO FLUXO: Imagens renderizadas pelo navegador → direto para LLM Vision
        console.log(`[OCR/Route] Recebidas ${clientImages.length} imagens pré-renderizadas do cliente.`);
        result = await processarImagensPreRenderizadas(
          clientImages,
          documento.tipo_documento as OCRTipoDocumento
        );
      } else {
        // FLUXO LEGADO: Processamento server-side (pdf-parse, etc.)
        result = await processarDocumentoOCR(
          documento.arquivo_url,
          documento.tipo_documento as OCRTipoDocumento
        );
      }
    } catch {
      // Se o body não for JSON válido (ex: POST sem body), usar fluxo legado
      result = await processarDocumentoOCR(
        documento.arquivo_url,
        documento.tipo_documento as OCRTipoDocumento
      );
    }

    if (!result.success || !result.data) {
      await supabaseAdmin
        .from('gt_documentos')
        .update({
          ocr_status: 'erro',
          ocr_erro: result.error || 'Falha no processamento OCR',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return NextResponse.json({ error: result.error || 'Erro ao processar OCR' }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('gt_documentos')
      .update({
        ocr_status: 'concluido',
        ocr_texto: result.data.texto,
        ocr_dados_extraidos: result.data.dadosExtraidos,
        ocr_data: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar OCR do documento:', updateError);
      return NextResponse.json({ error: 'Erro ao salvar resultado do OCR' }, { status: 500 });
    }

    if (documento.tipo_documento === 'aso') {
      await extrairDadosASODoTexto(
        id,
        result.data.texto,
        result.data.dadosExtraidos,
        documento.colaborador_id,
        documento.data_emissao
      ).catch((asoErr) => {
        console.error('Erro ao processar dados de ASO:', asoErr);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        documento: updated,
        ocr: {
          confianca: result.data.confianca,
          dados_extraidos: result.data.dadosExtraidos,
          texto_extraido: result.data.texto.substring(0, 500)
        }
      }
    });
  } catch (error) {
    console.error('Erro na API OCR:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
