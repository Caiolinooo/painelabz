import { NextRequest, NextResponse } from 'next/server';
import { getEsocialTimeline } from '@/lib/employee-hub/employee-hub-service';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get CPF from colaborador
    const { data: colab } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('cpf')
      .eq('id', id)
      .maybeSingle();

    if (!colab?.cpf) {
      return NextResponse.json({ error: 'Colaborador não encontrado ou sem CPF' }, { status: 404 });
    }

    const cpf = colab.cpf.replace(/\D/g, '');
    const timeline = await getEsocialTimeline(cpf);

    return NextResponse.json({ timeline, cpf });
  } catch (err: any) {
    console.error('[employee-hub/timeline] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
