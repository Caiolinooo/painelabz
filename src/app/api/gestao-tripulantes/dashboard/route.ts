import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from('gt_vw_dashboard_resumo')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || {},
      meta: {
        module: 'gestao-tripulantes',
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro na API dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
