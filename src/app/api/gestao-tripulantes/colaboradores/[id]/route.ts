import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { autoGenerateESocialEvents } from '@/services/eSocialAutoService';

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

    const { data: colaborador, error } = await supabaseAdmin
      .from('gt_vw_colaboradores_completo')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar colaborador:', error);
      return NextResponse.json({ error: 'Erro ao buscar colaborador' }, { status: 500 });
    }

    if (!colaborador) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const { data: allDocs } = await supabaseAdmin
      .from('gt_documentos')
      .select('*')
      .eq('colaborador_id', id)
      .is('deleted_at', null)
      .order('data_validade', { ascending: false, nullsFirst: false });

    let documentos = allDocs || [];
    
    // Populate aso_data for ASO documents
    const asoDocIds = documentos.filter(d => d.tipo_documento === 'aso').map(d => d.id);
    if (asoDocIds.length > 0) {
      const { data: asoRecords } = await supabaseAdmin
        .from('gt_documentos_aso')
        .select('*')
        .in('documento_id', asoDocIds);
        
      if (asoRecords) {
        const asoDataMap: Record<string, any> = {};
        asoRecords.forEach(rec => { asoDataMap[rec.documento_id] = rec; });
        documentos = documentos.map(doc => {
          if (doc.tipo_documento === 'aso') {
            return { ...doc, aso_data: asoDataMap[doc.id] || null };
          }
          return doc;
        });
      }

      // Cross-reference e-Social → ASO: garante que numero_recibo,
      // protocolo_envio e data_processamento estejam disponíveis na
      // query de documentos (para UI e resumo exportável futuro).
      const { data: eventosVinculados } = await supabaseAdmin
        .from('esocial_eventos')
        .select('id, evento_codigo, status, protocolo_envio, numero_recibo, data_envio, data_processamento, entidade_origem_id, created_at')
        .in('entidade_origem_id', asoDocIds)
        .order('created_at', { ascending: false });
      const eventoPorDocId: Record<string, any> = {};
      (eventosVinculados || []).forEach(ev => {
        const docKey = ev.entidade_origem_id as string;
        if (!eventoPorDocId[docKey]) eventoPorDocId[docKey] = ev; // mais recente primeiro
      });
      documentos = documentos.map(doc => {
        const ev = eventoPorDocId[doc.id];
        if (!ev) return doc;
        return {
          ...doc,
          aso_data: {
            ...(doc.aso_data || {}),
            esocial_evento_ref: {
              id: ev.id,
              evento_codigo: ev.evento_codigo,
              status: ev.status,
              numero_recibo: ev.numero_recibo,
              protocolo_envio: ev.protocolo_envio,
              data_envio: ev.data_envio,
              data_processamento: ev.data_processamento,
            },
          },
        };
      });
    }

    // Dedup treinamentos: mantém só o mais recente por título
    const seenTitles = new Set<string>();
    documentos = documentos.filter(d => {
      if (d.tipo_documento !== 'treinamento') return true;
      if (!d.titulo) return true;
      const key = d.titulo.toLowerCase().trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    const { data: embarques } = await supabaseAdmin
      .from('gt_historico_embarques')
      .select('*, embarcacao:gt_embarcacoes(nome)')
      .eq('colaborador_id', id)
      .is('deleted_at', null)
      .order('data_embarque', { ascending: false });

    const { data: substituicoes } = await supabaseAdmin
      .from('gt_historico_substituicoes')
      .select('*, substituto:gt_colaboradores!substituto_id(nome_completo), substituido:gt_colaboradores!substituido_id(nome_completo)')
      .or(`substituto_id.eq.${id},substituido_id.eq.${id}`)
      .order('created_at', { ascending: false });

    const cpfClean = colaborador?.cpf ? colaborador.cpf.replace(/\D/g, '') : '';
    let esocialAsos: any[] = [];
    if (cpfClean) {
      const { data: events } = await supabaseAdmin
        .from('esocial_eventos')
        .select('*')
        .eq('evento_codigo', 'S-2220')
        .eq('cpf_trabalhador', cpfClean);
      esocialAsos = events || [];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...colaborador,
        documentos: documentos || [],
        embarques: embarques || [],
        substituicoes: substituicoes || [],
        esocial_asos: esocialAsos
      }
    });
  } catch (error) {
    console.error('Erro ao obter colaborador:', error);
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

    const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() };

    delete updateData.id;
    delete updateData.created_at;
    delete updateData.deleted_at;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('gt_colaboradores')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar colaborador:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 });
    }

    if (updated && updated.id) {
      autoGenerateESocialEvents(updated.id).catch(err => {
        console.error('[eSocialAuto] Failed in background execution on update:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar colaborador:', error);
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

    const { error: softDeleteError } = await supabaseAdmin
      .from('gt_colaboradores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (softDeleteError) {
      console.error('Erro ao excluir colaborador:', softDeleteError);
      return NextResponse.json({ error: 'Erro ao excluir colaborador' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Colaborador excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir colaborador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
