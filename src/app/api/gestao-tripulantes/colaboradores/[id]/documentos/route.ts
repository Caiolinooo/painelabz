import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const { data: documentos, error } = await supabaseAdmin
      .from('gt_documentos')
      .select('*')
      .eq('colaborador_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar documentos:', error);
      return NextResponse.json({ error: 'Erro ao listar documentos' }, { status: 500 });
    }

    let documentosComAso = documentos || [];
    if (documentosComAso.length > 0) {
      const asoDocIds = documentosComAso
        .filter((doc: any) => doc.tipo_documento === 'aso')
        .map((doc: any) => doc.id);

      if (asoDocIds.length > 0) {
        const { data: asoRecords, error: asoError } = await supabaseAdmin
          .from('gt_documentos_aso')
          .select('*')
          .in('documento_id', asoDocIds);

        if (!asoError && asoRecords) {
          const asoDataMap: Record<string, any> = {};
          asoRecords.forEach((rec: any) => {
            asoDataMap[rec.documento_id] = rec;
          });

          documentosComAso = documentosComAso.map((doc: any) => {
            if (doc.tipo_documento === 'aso') {
              return {
                ...doc,
                aso_data: asoDataMap[doc.id] || null
              };
            }
            return doc;
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: documentosComAso
    });
  } catch (error) {
    console.error('Erro na API documentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { tipo_documento, titulo, numero_documento, data_emissao, data_validade, arquivo_url, descricao } = body;

    if (!tipo_documento || !titulo) {
      return NextResponse.json({ error: 'Tipo do documento e titulo são obrigatórios' }, { status: 400 });
    }

    const { data: documento, error: createError } = await supabaseAdmin
      .from('gt_documentos')
      .insert({
        colaborador_id: id,
        tipo_documento,
        titulo,
        numero_documento: numero_documento || null,
        data_emissao: data_emissao || null,
        data_validade: data_validade || null,
        arquivo_url: arquivo_url || null,
        descricao: descricao || null,
        status_validacao: data_validade
          ? (new Date(data_validade) < new Date() ? 'vencido' :
             new Date(data_validade) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'valido')
          : 'pendente',
        ocr_status: 'pendente',
        status_revisao: 'nao_necessita',
        notificado_vencimento: false,
        origem: 'manual'
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Erro ao criar documento:', createError);
      return NextResponse.json({ error: 'Erro ao criar documento' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: documento
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
