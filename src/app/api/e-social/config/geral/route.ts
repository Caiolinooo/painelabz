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
      .select('valor')
      .eq('chave', 'geral')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    const config = data?.valor || { ambiente: 'homologacao', autonomia_envio: false, consultar_automatico: false };

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Erro em GET /api/e-social/config/geral:', error);
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

    const { data, error } = await supabaseAdmin
      .from('esocial_configuracoes')
      .upsert({
        chave: 'geral',
        valor: body,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chave' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: data.valor });
  } catch (error) {
    console.error('Erro em PUT /api/e-social/config/geral:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
