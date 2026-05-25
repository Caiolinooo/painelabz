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

    const { data, error } = await supabaseAdmin
      .from('esocial_configuracoes')
      .select('*')
      .order('chave', { ascending: true });

    if (error) {
      console.error('Erro ao buscar configurações e-social:', error);
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    const configMap: Record<string, string> = {};
    for (const item of data || []) {
      configMap[item.chave] = item.valor;
    }

    return NextResponse.json({
      success: true,
      configuracoes: configMap,
      configuracoes_lista: data || [],
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/configuracoes:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    if (!body.configuracoes || typeof body.configuracoes !== 'object') {
      return NextResponse.json({ error: 'configuracoes (objeto chave-valor) é obrigatório' }, { status: 400 });
    }

    const records = Object.entries(body.configuracoes).map(([chave, valor]) => ({
      chave,
      valor: typeof valor === 'string' ? valor : JSON.parse(JSON.stringify(valor)),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from('esocial_configuracoes')
      .upsert(records, { onConflict: 'chave' })
      .select();

    if (error) {
      console.error('Erro ao salvar configurações e-social:', error);
      return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
    }

    const configMap: Record<string, string> = {};
    for (const item of data || []) {
      configMap[item.chave] = item.valor;
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso',
      configuracoes: configMap,
    });
  } catch (error) {
    console.error('Erro em PUT /api/e-social/configuracoes:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
