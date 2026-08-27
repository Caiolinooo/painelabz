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

    const [
      colabs,
      embarcados,
      disponiveis,
      vencidos,
      vencendo,
      asosPendentes,
    ] = await Promise.all([
      supabaseAdmin.from('gt_colaboradores').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabaseAdmin.from('gt_colaboradores').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status_embarque', 'embarcado'),
      supabaseAdmin.from('gt_colaboradores').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('standby', true),
      supabaseAdmin.from('gt_documentos').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status_validacao', 'vencido'),
      supabaseAdmin.from('gt_documentos').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status_validacao', 'vencendo'),
      supabaseAdmin.from('gt_documentos').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status_revisao', 'pendente_revisao'),
    ]);

    const firstError = [colabs, embarcados, disponiveis, vencidos, vencendo, asosPendentes].find((r) => r.error);
    if (firstError?.error) {
      console.error('Erro ao buscar dados do dashboard:', firstError.error);
      return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_colaboradores: colabs.count || 0,
        total_embarcados: embarcados.count || 0,
        total_disponiveis: disponiveis.count || 0,
        total_docs_vencidos: vencidos.count || 0,
        total_docs_vencendo: vencendo.count || 0,
        asos_pendentes_revisao: asosPendentes.count || 0,
      },
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
