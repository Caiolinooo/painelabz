import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { mapCodigoToDbTipo } from '@/lib/gestao-tripulantes/escala-tipos';
import { findColaboradorByCpf } from '@/lib/gestao-tripulantes/cpf-lookup';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      colaborador_cpf,
      tipo,
      data_embarque,
      data_desembarque,
      local_embarque,
      local_desembarque,
      observacoes,
    } = body;

    if (!colaborador_cpf || !tipo || !data_embarque || !data_desembarque) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const colab = await findColaboradorByCpf(String(colaborador_cpf));
    if (!colab) {
      return NextResponse.json(
        { error: `Colaborador com CPF ${colaborador_cpf} não encontrado na base local.` },
        { status: 404 }
      );
    }

    // offc → 'offc' (não colapsa para folga_indenizada/fi)
    const dbTipo = mapCodigoToDbTipo(String(tipo));

    const { data, error } = await supabaseAdmin
      .from('gt_historico_embarques')
      .insert({
        colaborador_id: colab.id,
        tipo: dbTipo,
        data_embarque,
        data_desembarque,
        local_embarque: local_embarque || '',
        local_desembarque: local_desembarque || '',
        observacoes: observacoes || '',
        origem: 'local',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao inserir evento de embarque:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao criar evento de escala' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Erro na API de embarques:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
