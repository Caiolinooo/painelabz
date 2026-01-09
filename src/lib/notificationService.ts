import { supabase } from './supabase';
import { Database } from '@/types/supabase';

// Define the shape based on our new schema
export interface NotificationEvent {
  recipients: string[]; // List of user_ids
  type: 'like' | 'comment' | 'mention' | 'system' | 'invite' | 'evaluation';
  title: string;
  message: string;
  link?: string;
  actor_id?: string;
  resource_id?: string;
  metadata?: any;
}

/**
 * Core function to distribute a notification to multiple recipients (Fan-out).
 */
export const distributeNotification = async (event: NotificationEvent) => {
  if (!event.recipients.length) return;

  // De-duplicate recipients
  const uniqueRecipients = [...new Set(event.recipients)];

  const notificationsToInsert = uniqueRecipients.map(userId => ({
    user_id: userId,
    type: event.type,
    title: event.title,
    message: event.message,
    link: event.link || null,
    actor_id: event.actor_id || null,
    resource_id: event.resource_id || null,
    metadata: event.metadata || {},
    is_read: false,
    // Legacy support if needed, or remove if table doesn't have it anymore (we have it as nullable)
    action_url: event.link || null
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationsToInsert)
    .select();

  if (error) {
    console.error('Error distributing notifications:', error);
    throw error;
  }

  return data;
};

/**
 * Legacy wrapper for backward compatibility
 */
export const createNotification = async (notification: { user_id: string; title: string; message: string; link?: string }) => {
  return distributeNotification({
    recipients: [notification.user_id],
    type: 'system', // Default type
    title: notification.title,
    message: notification.message,
    link: notification.link
  });
};

/**
 * Sends a notification for a new evaluation.
 */
export const sendNewEvaluationNotification = async (evaluation: any) => {
  const evaluationId = evaluation.id;

  // Fetch full details to get names
  const { data: fullEvaluation } = await supabase
    .from('avaliacoes_desempenho')
    .select(`
      *,
      periodo:periodos_avaliacao(id, nome),
      funcionario:users_unified!avaliacoes_desempenho_funcionario_id_fkey(id, name),
      avaliador:users_unified!avaliacoes_desempenho_avaliador_id_fkey(id, name)
    `)
    .eq('id', evaluationId)
    .single();

  const ev = fullEvaluation || evaluation;
  const periodoNome = ev.periodo?.nome || 'Período';
  const colaboradorNome = ev.funcionario?.name || 'Colaborador';
  const linkRelativo = `/avaliacao/ver/${evaluationId}`;

  // Notify Employee (Actor = Manager)
  await distributeNotification({
    recipients: [ev.funcionario_id],
    type: 'evaluation',
    title: 'Nova Avaliação',
    message: `Uma nova avaliação para o período ${periodoNome} foi iniciada.`,
    link: linkRelativo,
    actor_id: ev.avaliador_id,
    resource_id: evaluationId
  });

  // Notify Manager (System notification)
  await distributeNotification({
    recipients: [ev.avaliador_id],
    type: 'evaluation',
    title: 'Avaliação Iniciada',
    message: `Você iniciou uma avaliação para ${colaboradorNome}.`,
    link: linkRelativo,
    resource_id: evaluationId
  });
};

/**
 * Sends a notification when a self-evaluation is completed.
 */
export const sendSelfEvaluationCompleteNotification = async (evaluation: any) => {
  const evaluationId = evaluation.id;

  const { data: fullEvaluation } = await supabase
    .from('avaliacoes_desempenho')
    .select(`
      *,
      funcionario:users_unified!avaliacoes_desempenho_funcionario_id_fkey(id, name)
    `)
    .eq('id', evaluationId)
    .single();

  const ev = fullEvaluation || evaluation;
  const colaboradorNome = ev.funcionario?.name || 'Colaborador';
  const linkRelativo = `/avaliacao/ver/${evaluationId}`;

  // Notify Manager (Actor = Employee)
  await distributeNotification({
    recipients: [ev.avaliador_id],
    type: 'evaluation',
    title: 'Autoavaliação Concluída',
    message: `${colaboradorNome} completou a autoavaliação.`,
    link: linkRelativo,
    actor_id: ev.funcionario_id,
    resource_id: evaluationId
  });
};

/**
 * Sends a notification when an evaluation is approved.
 */
export const sendEvaluationApprovedNotification = async (evaluation: any) => {
  const evaluationId = evaluation.id;

  const { data: fullEvaluation } = await supabase
    .from('avaliacoes_desempenho')
    .select(`
      *,
      periodo:periodos_avaliacao(id, nome)
    `)
    .eq('id', evaluationId)
    .single();

  const ev = fullEvaluation || evaluation;
  const periodoNome = ev.periodo?.nome || 'Período';
  const linkRelativo = `/avaliacao/ver/${evaluationId}`;

  // Notify Employee (System or Manager)
  await distributeNotification({
    recipients: [ev.funcionario_id],
    type: 'evaluation',
    title: 'Avaliação Concluída',
    message: `Sua avaliação para ${periodoNome} foi finalizada.`,
    link: linkRelativo,
    resource_id: evaluationId
  });
};
