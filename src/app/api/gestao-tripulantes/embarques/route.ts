import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

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
      observacoes
    } = body;

    if (!colaborador_cpf || !tipo || !data_embarque || !data_desembarque) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Buscar colaborador pelo CPF para obter o ID correto
    const cleanCpf = colaborador_cpf.replace(/\D/g, '');
    const { data: colab, error: colabErr } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id')
      .eq('cpf', cleanCpf)
      .is('deleted_at', null)
      .maybeSingle();

    if (colabErr || !colab) {
      return NextResponse.json({ error: `Colaborador com CPF ${colaborador_cpf} não encontrado na base local.` }, { status: 404 });
    }

    // Mapear rotation_type para tipo esperado pelo banco
    let dbTipo = 'normal';
    if (tipo === 'fi') dbTipo = 'folga_indenizada';
    else if (tipo === 'dba') dbTipo = 'dobra';
    else if (tipo === 'stb') dbTipo = 'standby';
    else if (tipo === 'offc') {
      // Para folga/off-duty, não criamos registro de embarque ativo (tipo folga_indenizada ou semelhante pode ser usado, mas criamos como normal ou folga?)
      // A restrição do banco é: ARRAY['normal', 'dobra', 'folga_indenizada', 'standby', 'substituicao', 'treinamento']
      // Se for folga comum (offc), não é um embarque ativo. Podemos mapear como folga_indenizada ou apenas ignorar/não inserir?
      // Na verdade, se o usuário quer marcar folga (offc), podemos salvar como normal e preencher observações ou usar folga_indenizada.
      dbTipo = 'folga_indenizada';
    }

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
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao inserir evento de embarque:', error);
      return NextResponse.json({ error: 'Erro ao criar evento de escala' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro na API de embarques:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
