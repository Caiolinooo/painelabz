import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardDebugRoute } from '@/lib/debug-route-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = await guardDebugRoute(request);
  if (blocked) return blocked;

  try {
    const { data: avaliacoes } = await supabaseAdmin
      .from('avaliacoes_desempenho')
      .select('id, funcionario_id, avaliador_id, status')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: mapeamento } = await supabaseAdmin
      .from('avaliacao_colaborador_gerente')
      .select('*');

    return NextResponse.json({
      success: true,
      avaliacoes,
      mapeamento,
      aguardando: avaliacoes?.filter(a => a.status === 'aguardando_aprovacao') || []
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
