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

    const { data, error } = await supabaseAdmin
      .from('gt_documentos')
      .select('*, gt_colaboradores(nome_completo, cpf, matricula)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar documento:', error);
      return NextResponse.json({ error: 'Erro ao buscar documento' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // If it's an ASO document, also fetch the ASO metadata
    let asoData = null;
    if (data.tipo_documento === 'aso') {
      const { data: aso, error: asoError } = await supabaseAdmin
        .from('gt_documentos_aso')
        .select('*')
        .eq('documento_id', id)
        .maybeSingle();

      if (!asoError && aso) {
        asoData = aso;
      }
    }

    return NextResponse.json({ success: true, data: { ...data, aso: asoData } });
  } catch (error) {
    console.error('Erro ao obter documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
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

    const { aso, ...docFields } = body;
    const updateData: Record<string, any> = { ...docFields, updated_at: new Date().toISOString() };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.deleted_at;
    delete updateData.colaborador_id;

    const { data, error } = await supabaseAdmin
      .from('gt_documentos')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar documento:', error);
      return NextResponse.json({ error: 'Erro ao atualizar documento' }, { status: 500 });
    }

    // If ASO data was provided, upsert it into gt_documentos_aso
    if (aso && typeof aso === 'object') {
      const asoPayload: Record<string, any> = { ...aso, documento_id: id, updated_at: new Date().toISOString() };
      delete asoPayload.id;
      delete asoPayload.created_at;
      delete asoPayload.deleted_at;

      // Resolve exam codes on manual save
      if (Array.isArray(asoPayload.exames_realizados)) {
        const { buscarCodigoExame } = await import('@/lib/e-social/codigos');
        for (const ex of asoPayload.exames_realizados) {
          if (!ex.codProc || ex.codProc === '9999') {
            const resolvedCode = await buscarCodigoExame(ex.nome);
            ex.codProc = resolvedCode || '9999';
          }
        }
      }

      const { error: asoError } = await supabaseAdmin
        .from('gt_documentos_aso')
        .upsert({
          documento_id: id,
          ...asoPayload,
        }, { onConflict: 'documento_id' });

      if (asoError) {
        console.error('Erro ao atualizar dados do ASO:', asoError);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabaseAdmin
      .from('gt_documentos')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir documento:', error);
      return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
