import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import {
  notifyEmployeeEvaluationCompleted,
  notifyManagerSelfEvaluationCompleted,
  notifyManagerEvaluationPending,
  notifyEmployeeEvaluationReturned,
  notifyManagerEvaluationRevised
} from '@/lib/evaluation-notifications';

/**
 * GET /api/avaliacao/[id]
 * Busca uma avaliação específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticação via cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('abzToken')?.value || cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Usar instância síncrona do supabaseAdmin

    const { data: avaliacao, error } = await supabaseAdmin
      .from('avaliacoes_desempenho')
      .select(`
        *,
        funcionario:users_unified!avaliacoes_desempenho_funcionario_id_fkey(id, first_name, last_name, email),
        avaliador:users_unified!avaliacoes_desempenho_avaliador_id_fkey(id, first_name, last_name, email),
        periodo:periodos_avaliacao(id, nome, data_inicio, data_fim)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar avaliação:', error);
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar permissão: usuário deve ser o colaborador ou o avaliador
    const userId = decoded.userId;
    const isCollaborator = avaliacao.funcionario_id === userId;
    const isManager = avaliacao.avaliador_id === userId;

    if (!isCollaborator && !isManager) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para acessar esta avaliação' },
        { status: 403 }
      );
    }

    // Verificar se o funcionário é líder (via tabela lideres)
    // Primeiro tenta via RPC se existir
    let isEmployeeLeader = false;
    try {
      const { data: isLeaderRpc, error: rpcError } = await supabaseAdmin
        .rpc('is_usuario_lider', { p_usuario_id: avaliacao.funcionario_id });

      if (!rpcError) {
        isEmployeeLeader = !!isLeaderRpc;
      } else {
        // Fallback: consulta direta na tabela lideres
        const { data: liderData } = await supabaseAdmin
          .from('lideres')
          .select('id')
          .eq('user_id', avaliacao.funcionario_id)
          .eq('ativo', true)
          .is('data_fim', null)
          .single();

        isEmployeeLeader = !!liderData;
      }
    } catch (err) {
      console.warn('Erro ao verificar liderança:', err);
      // Mantém false em caso de erro
    }

    return NextResponse.json({
      success: true,
      data: avaliacao,
      data: avaliacao,
      userId: userId, // Adicionar userId na resposta
      isEmployeeLeader // Adicionar status de liderança na resposta
    });

  } catch (error: any) {
    console.error('Erro em GET /api/avaliacao/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/avaliacao/[id]
 * Atualiza uma avaliação (respostas e status)
 * 
 * Body: { respostas?: Record<string, any>, status?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticação via cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('abzToken')?.value || cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { respostas, status, solicitar_ajustes } = body;

    // Usar instância síncrona do supabaseAdmin

    // 1. Buscar avaliação atual
    const { data: avaliacaoAtual, error: fetchError } = await supabaseAdmin
      .from('avaliacoes_desempenho')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !avaliacaoAtual) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      );
    }

    // 2. Verificar permissão
    const isCollaborator = avaliacaoAtual.funcionario_id === userId;
    const isManager = avaliacaoAtual.avaliador_id === userId;

    if (!isCollaborator && !isManager) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para editar esta avaliação' },
        { status: 403 }
      );
    }

    // 2.1. Bloquear edição de avaliações concluídas
    if (avaliacaoAtual.status === 'concluida') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta avaliação já foi concluída e não pode mais ser editada',
          hint: 'Apenas administradores podem excluir avaliações concluídas'
        },
        { status: 400 }
      );
    }

    // 3. Validar transições de status
    const statusAtual = avaliacaoAtual.status;

    // Colaborador pode editar se status for: pendente, em_andamento, devolvida
    const statusEditaveisColaborador = ['pendente', 'em_andamento', 'devolvida'];
    if (isCollaborator && !isManager && !statusEditaveisColaborador.includes(statusAtual)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Você não pode mais editar esta avaliação',
          hint: statusAtual === 'aguardando_aprovacao'
            ? 'A avaliação foi enviada para aprovação do gestor. Aguarde a análise ou possível devolução.'
            : statusAtual === 'aprovada_aguardando_comentario'
              ? 'A avaliação foi aprovada pelo gestor. Aguarde a finalização ou adicione seu comentário final.'
              : 'A avaliação já foi concluída ou cancelada.'
        },
        { status: 400 }
      );
    }

    // Gerente só pode editar se status for aguardando_aprovacao ou aguardando_finalizacao
    if (isManager && !isCollaborator && !['aguardando_aprovacao', 'aguardando_finalizacao'].includes(statusAtual)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta avaliação ainda não está disponível para revisão gerencial',
          hint: statusAtual === 'pendente' || statusAtual === 'em_andamento'
            ? 'Aguardando o colaborador finalizar a autoavaliação'
            : 'A avaliação já foi concluída'
        },
        { status: 400 }
      );
    }

    // 4. Preparar atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (respostas !== undefined) {
      // Mesclar respostas existentes com novas
      updateData.respostas = {
        ...avaliacaoAtual.respostas,
        ...respostas
      };
    }

    if (status !== undefined) {
      // Validar transições permitidas (status corretos do banco)
      const transicoesPermitidas: Record<string, string[]> = {
        'pendente': ['em_andamento', 'aguardando_aprovacao', 'cancelada'],
        'em_andamento': ['aguardando_aprovacao', 'cancelada'],
        'aguardando_aprovacao': ['aprovada_aguardando_comentario', 'devolvida', 'cancelada'],
        'aprovada_aguardando_comentario': ['aguardando_finalizacao', 'devolvida', 'cancelada'],
        'aguardando_finalizacao': ['concluida', 'devolvida', 'cancelada'],
        'devolvida': ['aguardando_aprovacao', 'cancelada'],
        'concluida': [], // Status final
        'cancelada': [] // Status final
      };

      if (
        statusAtual !== status &&
        (!transicoesPermitidas[statusAtual] ||
          !transicoesPermitidas[statusAtual].includes(status))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Transição de status inválida: ${statusAtual} → ${status}`,
            hint: `Transições permitidas: ${transicoesPermitidas[statusAtual]?.join(', ') || 'nenhuma'}`
          },
          { status: 400 }
        );
      }

      updateData.status = status;

      // Se status mudar para concluída, calcular nota final
      if (status === 'concluida') {
        const respostasCompletas = updateData.respostas || avaliacaoAtual.respostas;

        // Coletar apenas notas das questões gerenciais (Q15-Q24)
        // Q11-Q14 (colaborador) não têm notas, apenas comentários
        const notasGerenciais = Object.values(respostasCompletas)
          .map((r: any) => r?.nota)
          .filter((n): n is number => typeof n === 'number' && n > 0);

        if (notasGerenciais.length > 0) {
          updateData.nota_final = (
            notasGerenciais.reduce((sum, n) => sum + n, 0) / notasGerenciais.length
          ).toFixed(2);
        }
      }
    }

    // 5. Atualizar avaliação
    const { data: avaliacaoAtualizada, error: updateError } = await supabaseAdmin
      .from('avaliacoes_desempenho')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar avaliação:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar avaliação' },
        { status: 500 }
      );
    }

    // 6. Enviar notificações baseadas na mudança de status
    if (status && status !== statusAtual) {
      try {
        // Buscar dados do colaborador e gerente para notificações
        const { data: employee } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name')
          .eq('id', avaliacaoAtualizada.funcionario_id)
          .single();

        const { data: manager } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name')
          .eq('id', avaliacaoAtualizada.avaliador_id)
          .single();

        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Colaborador';
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Gestor';

        // Notificar quando colaborador envia autoavaliação para aprovação
        if (status === 'aguardando_aprovacao' && manager && (statusAtual === 'pendente' || statusAtual === 'em_andamento')) {
          await notifyManagerSelfEvaluationCompleted(
            manager.id,
            avaliacaoAtualizada.id,
            employeeName
          );
        }

        // Notificar quando gerente devolve para ajustes
        if (status === 'devolvida' && employee) {
          await notifyEmployeeEvaluationReturned(
            employee.id,
            avaliacaoAtualizada.id,
            managerName,
            avaliacaoAtualizada.respostas?.['Q15']?.comentario || ''
          );
        }

        // Notificar quando colaborador reenvia após ajustes
        if (status === 'aguardando_aprovacao' && manager && statusAtual === 'devolvida') {
          await notifyManagerEvaluationRevised(
            manager.id,
            avaliacaoAtualizada.id,
            employeeName
          );
        }

        // Notificar quando gerente finaliza a avaliação
        if (status === 'concluida' && employee) {
          await notifyEmployeeEvaluationCompleted(
            employee.id,
            avaliacaoAtualizada.id,
            managerName
          );
        }
      } catch (notificationError) {
        // Não bloquear a operação se notificação falhar
        console.error('Erro ao enviar notificação (não bloqueante):', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Avaliação atualizada com sucesso',
      data: avaliacaoAtualizada
    });

  } catch (error: any) {
    console.error('Erro em PATCH /api/avaliacao/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
