// Sistema completo de notificações para avaliações de desempenho
// Fluxo: Período Aberto → Autoavaliação → Revisão Gerencial → Ajustes → Finalização

interface CreateEvaluationNotificationParams {
  userId: string;
  type: 'period_opened' | 'evaluation_created' | 'self_evaluation_completed' | 'manager_review_pending' | 'evaluation_returned' | 'evaluation_revised' | 'evaluation_completed';
  evaluationId?: string;
  periodId?: string;
  employeeName?: string;
  managerName?: string;
  periodName?: string;
  comments?: string;
}

/**
 * Cria uma notificação relacionada a avaliação de desempenho
 */
import { sendGlobalNotification } from './global-notifications';

/**
 * Cria uma notificação relacionada a avaliação de desempenho
 */
export async function createEvaluationNotification(params: CreateEvaluationNotificationParams): Promise<boolean> {
  const { userId, type, evaluationId, employeeName, managerName, periodName, comments } = params;

  // Definir título e mensagem baseado no tipo
  let title = '';
  let message = '';
  let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

  switch (type) {
    case 'period_opened':
      title = '🚀 Novo Período de Avaliação';
      message = `O período de avaliação "${periodName}" foi aberto! Acesse para iniciar sua autoavaliação.`;
      priority = 'high';
      break;

    case 'evaluation_created':
      title = '📝 Nova Avaliação Disponível';
      message = `Uma nova avaliação de desempenho foi criada para o período: ${periodName || 'N/A'}. Acesse para iniciar sua autoavaliação.`;
      priority = 'high';
      break;

    case 'self_evaluation_completed':
      title = '✅ Autoavaliação Concluída';
      message = `${employeeName} completou a autoavaliação e está aguardando sua revisão como gestor.`;
      priority = 'high';
      break;

    case 'manager_review_pending':
      title = '👨‍💼 Revisão Gerencial Pendente';
      message = `Você tem uma avaliação de ${employeeName} aguardando sua revisão e aprovação.`;
      priority = 'high';
      break;

    case 'evaluation_returned':
      title = '🔄 Avaliação Devolvida para Ajustes';
      message = `Sua avaliação foi devolvida pelo gestor ${managerName} para ajustes. Verifique os comentários e reenvie.`;
      priority = 'urgent';
      break;

    case 'evaluation_revised':
      if (employeeName) {
        // Notificação para gerente quando funcionário adiciona comentário
        title = '💬 Comentário Final Adicionado';
        message = `${employeeName} adicionou o comentário final na avaliação. Revise e finalize a avaliação.`;
      } else if (managerName) {
        // Notificação para funcionário quando gerente aprova
        title = '✅ Avaliação Aprovada pelo Gerente';
        message = `${managerName} aprovou sua avaliação. Adicione seu comentário final para concluir o processo.`;
      } else {
        title = '📝 Avaliação Revisada';
        message = 'A avaliação foi revisada. Verifique os detalhes.';
      }
      priority = 'high';
      break;

    case 'evaluation_completed':
      title = '🎉 Avaliação Finalizada';
      message = `Sua avaliação de desempenho foi finalizada por ${managerName}! Visualize os resultados e feedback.`;
      priority = 'normal';
      break;

    default:
      return false;
  }

  const actionUrl = type === 'period_opened' ? `/avaliacao` : `/avaliacao/ver/${evaluationId}`;

  const result = await sendGlobalNotification({
    userId,
    submodule: 'evaluation',
    type,
    title,
    message,
    data: {
      evaluation_id: evaluationId,
      period_id: params.periodId,
      employee_name: employeeName,
      manager_name: managerName,
      period_name: periodName,
      comments: comments
    },
    actionUrl,
    priority,
    channels: ['in-app', 'email', 'push']
  });

  return result.success;
}

/**
 * Notifica todos os usuários quando um período de avaliação é aberto
 */
export async function notifyPeriodOpened(
  userIds: string[],
  periodId: string,
  periodName: string
): Promise<boolean> {
  const results = await Promise.allSettled(
    userIds.map(userId =>
      createEvaluationNotification({
        userId,
        type: 'period_opened',
        periodId,
        periodName
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Notificações de período aberto enviadas: ${successful}/${userIds.length}`);
  return successful > 0;
}

/**
 * Notifica o colaborador quando uma nova avaliação é criada
 */
export async function notifyEmployeeEvaluationCreated(
  employeeId: string,
  evaluationId: string,
  periodName: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: employeeId,
    type: 'evaluation_created',
    evaluationId,
    periodName
  });
}

/**
 * Notifica o gerente quando o colaborador completa a autoavaliação
 */
export async function notifyManagerSelfEvaluationCompleted(
  managerId: string,
  evaluationId: string,
  employeeName: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: managerId,
    type: 'self_evaluation_completed',
    evaluationId,
    employeeName
  });
}

/**
 * Notifica o gerente quando há avaliação pendente para revisão
 */
export async function notifyManagerEvaluationPending(
  managerId: string,
  evaluationId: string,
  employeeName: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: managerId,
    type: 'manager_review_pending',
    evaluationId,
    employeeName
  });
}

/**
 * Notifica o colaborador quando a avaliação é devolvida para ajustes
 */
export async function notifyEmployeeEvaluationReturned(
  employeeId: string,
  evaluationId: string,
  managerName: string,
  comments?: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: employeeId,
    type: 'evaluation_returned',
    evaluationId,
    managerName,
    comments
  });
}

/**
 * Notifica o gerente quando o colaborador revisa a avaliação
 */
export async function notifyManagerEvaluationRevised(
  managerId: string,
  evaluationId: string,
  employeeName: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: managerId,
    type: 'evaluation_revised',
    evaluationId,
    employeeName
  });
}

/**
 * Notifica o colaborador quando a avaliação é finalizada pelo gerente
 */
export async function notifyEmployeeEvaluationCompleted(
  employeeId: string,
  evaluationId: string,
  managerName: string
): Promise<boolean> {
  return createEvaluationNotification({
    userId: employeeId,
    type: 'evaluation_completed',
    evaluationId,
    managerName
  });
}
