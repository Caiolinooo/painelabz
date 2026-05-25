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
    const cargo = searchParams.get('cargo');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('esocial_fatores_risco')
      .select('*')
      .order('cargo', { ascending: true });

    if (cargo) {
      query = query.ilike('cargo', cargo);
    }
    if (search) {
      query = query.ilike('cargo', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar fatores de risco:', error);
      return NextResponse.json({ error: 'Erro ao listar fatores de risco' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fatores: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/fatores-risco:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
