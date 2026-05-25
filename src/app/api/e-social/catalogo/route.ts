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
    const grupo = searchParams.get('grupo');
    const apenasAtivos = searchParams.get('ativos') !== 'false';

    let query = supabaseAdmin
      .from('esocial_eventos_catalogo')
      .select('*');

    if (grupo) {
      query = query.eq('grupo', grupo);
    }
    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    query = query.order('codigo_evento', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar catálogo e-social:', error);
      return NextResponse.json({ error: 'Erro ao listar catálogo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      catalogo: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/catalogo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
