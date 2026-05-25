import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const codigo = searchParams.get('codigo');
    const modulo_origem = searchParams.get('modulo_origem');
    const cpf_trabalhador = searchParams.get('cpf_trabalhador') || searchParams.get('funcionario_id');
    const cnpj_empregador = searchParams.get('cnpj_empregador');
    const competencia = searchParams.get('competencia');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('esocial_eventos')
      .select('*, esocial_eventos_catalogo!evento_codigo(nome)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (codigo) query = query.eq('evento_codigo', codigo);
    if (modulo_origem) query = query.eq('modulo_origem', modulo_origem);
    if (cpf_trabalhador) query = query.eq('cpf_trabalhador', cpf_trabalhador);
    if (cnpj_empregador) query = query.eq('cnpj_empregador', cnpj_empregador);
    if (competencia) query = query.eq('dados_evento->>competencia', competencia);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar eventos e-social:', error);
      return NextResponse.json({ error: 'Erro ao listar eventos' }, { status: 500 });
    }

    const eventos = (data || []).map((item: any) => ({
      ...item,
      evento_nome: item.esocial_eventos_catalogo?.nome || null,
    }));

    // Fetch dashboard summary using admin client
    const { data: dashboardData } = await supabaseAdmin
      .from('esocial_vw_dashboard')
      .select('*')
      .maybeSingle();

    return NextResponse.json({
      success: true,
      eventos,
      total: count || 0,
      limit,
      offset,
      resumo: dashboardData || null,
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/eventos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    if (!body.evento_codigo) {
      return NextResponse.json({ error: 'evento_codigo é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('esocial_eventos')
      .insert({
        evento_codigo: body.evento_codigo,
        cpf_trabalhador: body.cpf_trabalhador ? String(body.cpf_trabalhador).replace(/\D/g, '') : (body.cpf ? String(body.cpf).replace(/\D/g, '') : null),
        cnpj_empregador: body.cnpj_empregador ? String(body.cnpj_empregador).replace(/\D/g, '') : (body.cnpj ? String(body.cnpj).replace(/\D/g, '') : null),
        matricula: body.matricula || null,
        dados_evento: body.dados_evento || {},
        status: body.status || 'rascunho',
        modulo_origem: body.modulo_origem || 'manual',
        entidade_origem_id: body.entidade_origem_id || null,
        entidade_origem_tipo: body.entidade_origem_tipo || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar evento e-social:', error);
      return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 });
    }

    return NextResponse.json({ success: true, evento: data }, { status: 201 });
  } catch (error) {
    console.error('Erro em POST /api/e-social/eventos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
