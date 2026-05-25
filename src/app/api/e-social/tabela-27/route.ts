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
    const search = searchParams.get('search');
    const codigo = searchParams.get('codigo');
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('esocial_tabela_27')
      .select('*', { count: 'exact' });

    if (codigo) {
      query = query.eq('codigo', codigo);
    }

    if (search) {
      // Search by codigo or description
      query = query.or(`codigo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Sort by codigo
    query = query.order('codigo', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar Tabela 27:', error);
      return NextResponse.json({ error: 'Erro ao listar Tabela 27' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/tabela-27:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
