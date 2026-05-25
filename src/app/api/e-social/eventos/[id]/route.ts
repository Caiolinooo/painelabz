import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('esocial_eventos')
      .select('*, esocial_eventos_catalogo!evento_codigo(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar evento:', error);
      return NextResponse.json({ error: 'Erro ao buscar evento' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, evento: data });
  } catch (error) {
    console.error('Erro em GET /api/e-social/eventos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: any = { updated_at: new Date().toISOString() };

    if (body.dados_evento !== undefined) updateData.dados_evento = body.dados_evento;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.xml_gerado !== undefined) updateData.xml_gerado = body.xml_gerado;
    if (body.protocolo_envio !== undefined) updateData.protocolo_envio = body.protocolo_envio;
    if (body.protocolo !== undefined) updateData.protocolo_envio = body.protocolo;
    if (body.numero_recibo !== undefined) updateData.numero_recibo = body.numero_recibo;
    if (body.recibo !== undefined) updateData.numero_recibo = body.recibo;
    if (body.erros_processamento !== undefined) updateData.erros_processamento = body.erros_processamento;
    if (body.erros_validacao !== undefined) updateData.erros_processamento = body.erros_validacao;
    if (body.cpf_trabalhador !== undefined) updateData.cpf_trabalhador = body.cpf_trabalhador;
    if (body.funcionario_id !== undefined) updateData.cpf_trabalhador = body.funcionario_id;
    if (body.cnpj_empregador !== undefined) updateData.cnpj_empregador = body.cnpj_empregador;
    if (body.matricula !== undefined) updateData.matricula = body.matricula;
    if (body.evento_codigo !== undefined) updateData.evento_codigo = body.evento_codigo;
    if (body.ultimo_erro !== undefined) updateData.ultimo_erro = body.ultimo_erro;

    const { data, error } = await supabaseAdmin
      .from('esocial_eventos')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erro ao atualizar evento:', error);
      return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, evento: data });
  } catch (error) {
    console.error('Erro em PUT /api/e-social/eventos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('esocial_eventos')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'Erro ao verificar evento' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    if (existing.status === 'enviado' || existing.status === 'enviando') {
      return NextResponse.json({ error: 'Não é possível excluir um evento enviado ou em envio' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('esocial_eventos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar evento:', error);
      return NextResponse.json({ error: 'Erro ao deletar evento' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro em DELETE /api/e-social/eventos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
