import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    if (!body.evento_codigo || !body.cpf_trabalhador) {
      return NextResponse.json({ error: 'evento_codigo e cpf_trabalhador são obrigatórios' }, { status: 400 });
    }

    const ignorarId = body.ignorar_id || null;

    let query = supabaseAdmin
      .from('esocial_eventos')
      .select('id, evento_codigo, cpf_trabalhador, cnpj_empregador, status, protocolo_envio, numero_recibo, data_envio, created_at, dados_evento')
      .eq('evento_codigo', body.evento_codigo)
      .eq('cpf_trabalhador', body.cpf_trabalhador)
      .in('status', ['enviado', 'processado', 'fila_envio', 'enviando', 'pendente_revisao', 'revisao_aprovado']);

    if (body.cnpj_empregador) {
      query = query.eq('cnpj_empregador', body.cnpj_empregador);
    }

    if (body.periodo) {
      query = query.filter('dados_evento->>competencia', 'eq', body.periodo);
    }

    if (ignorarId) {
      query = query.neq('id', ignorarId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao verificar duplicidade:', error);
      return NextResponse.json({ error: 'Erro ao verificar duplicidade' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      duplicado: (data || []).length > 0,
      eventos_existentes: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro em POST /api/e-social/eventos/verificar-duplicidade:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
