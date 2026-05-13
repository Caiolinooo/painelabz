/**
 * Helpers para internacionalização (i18n)
 * Funções utilitárias para facilitar o uso de traduções em todo o sistema
 */

import { getTranslation, type Locale } from '@/i18n';
import { supabaseAdmin } from './supabase';
import { baseTemplate } from './emailTemplates';

/**
 * Obtém o idioma preferido de um usuário
 * @param userId ID do usuário
 * @returns Locale do usuário ou 'pt-BR' como padrão
 */
export async function getUserLocale(userId: string): Promise<Locale> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users_unified')
      .select('language')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn(`Não foi possível obter idioma do usuário ${userId}, usando padrão pt-BR`);
      return 'pt-BR';
    }

    // Validar se o idioma é suportado
    const supportedLocales: Locale[] = ['pt-BR', 'en-US'];
    const userLanguage = data.language as Locale;

    if (supportedLocales.includes(userLanguage)) {
      return userLanguage;
    }

    return 'pt-BR';
  } catch (error) {
    console.error('Erro ao obter idioma do usuário:', error);
    return 'pt-BR';
  }
}

/**
 * Traduz uma chave com interpolação de variáveis
 * @param locale Idioma
 * @param key Chave de tradução
 * @param variables Variáveis para interpolação
 * @returns String traduzida
 */
export function t(
  locale: Locale,
  key: string,
  variables?: Record<string, string | number>
): string {
  let translation = getTranslation(locale, key);

  // Interpolar variáveis
  if (variables) {
    Object.entries(variables).forEach(([varKey, value]) => {
      const regex = new RegExp(`\\{${varKey}\\}`, 'g');
      translation = translation.replace(regex, String(value));
    });
  }

  return translation;
}

/**
 * Obtém tradução de notificação de avaliação
 * @param userId ID do usuário
 * @param type Tipo de notificação
 * @param variables Variáveis para interpolação
 * @returns Título e mensagem traduzidos
 */
export async function getEvaluationNotificationTranslation(
  userId: string,
  type: 'period_opened' | 'evaluation_created' | 'self_evaluation_completed' | 
        'manager_review_pending' | 'evaluation_returned' | 'evaluation_revised' | 
        'evaluation_completed',
  variables?: Record<string, string>
): Promise<{ title: string; message: string }> {
  const locale = await getUserLocale(userId);

  let titleKey = '';
  let messageKey = '';

  switch (type) {
    case 'period_opened':
      titleKey = 'notifications.evaluation.periodOpened.title';
      messageKey = 'notifications.evaluation.periodOpened.message';
      break;
    case 'evaluation_created':
      titleKey = 'notifications.evaluation.evaluationCreated.title';
      messageKey = 'notifications.evaluation.evaluationCreated.message';
      break;
    case 'self_evaluation_completed':
      titleKey = 'notifications.evaluation.selfEvaluationCompleted.title';
      messageKey = 'notifications.evaluation.selfEvaluationCompleted.message';
      break;
    case 'manager_review_pending':
      titleKey = 'notifications.evaluation.managerReviewPending.title';
      messageKey = 'notifications.evaluation.managerReviewPending.message';
      break;
    case 'evaluation_returned':
      titleKey = 'notifications.evaluation.evaluationReturned.title';
      messageKey = 'notifications.evaluation.evaluationReturned.message';
      break;
    case 'evaluation_revised':
      // Determinar qual variante usar baseado nas variáveis
      if (variables?.employeeName) {
        titleKey = 'notifications.evaluation.evaluationRevised.titleByEmployee';
        messageKey = 'notifications.evaluation.evaluationRevised.messageByEmployee';
      } else if (variables?.managerName) {
        titleKey = 'notifications.evaluation.evaluationRevised.titleByManager';
        messageKey = 'notifications.evaluation.evaluationRevised.messageByManager';
      } else {
        titleKey = 'notifications.evaluation.evaluationRevised.titleGeneric';
        messageKey = 'notifications.evaluation.evaluationRevised.messageGeneric';
      }
      break;
    case 'evaluation_completed':
      titleKey = 'notifications.evaluation.evaluationCompleted.title';
      messageKey = 'notifications.evaluation.evaluationCompleted.message';
      break;
  }

  return {
    title: t(locale, titleKey, variables),
    message: t(locale, messageKey, variables)
  };
}

/**
 * Obtém tradução de notificação de reembolso
 * @param userId ID do usuário
 * @param type Tipo de notificação
 * @param variables Variáveis para interpolação
 * @returns Título e mensagem traduzidos
 */
export async function getReimbursementNotificationTranslation(
  userId: string,
  type: 'submitted' | 'approved' | 'rejected',
  variables?: Record<string, string>
): Promise<{ title: string; message: string }> {
  const locale = await getUserLocale(userId);

  const titleKey = `notifications.reimbursement.${type}.title`;
  const messageKey = `notifications.reimbursement.${type}.message`;

  return {
    title: t(locale, titleKey, variables),
    message: t(locale, messageKey, variables)
  };
}

/**
 * Obtém tradução de template de email
 * @param userId ID do usuário
 * @param templateType Tipo de template
 * @param variables Variáveis para interpolação
 * @returns Assunto e conteúdo HTML traduzidos
 */
export async function getEmailTemplate(
  userId: string,
  templateType: 'accessApproved' | 'accessRejected' | 'inviteCode' | 
                'reimbursementSubmitted' | 'reimbursementApproved' | 
                'reimbursementRejected' | 'welcome' | 'passwordExpiry',
  variables?: Record<string, string>
): Promise<{ subject: string; greeting: string; closing: string; team: string }> {
  const locale = await getUserLocale(userId);

  const subject = t(locale, `emailTemplates.subjects.${templateType}`, variables);
  const greeting = t(locale, 'emailTemplates.greetings.hello', variables);
  const closing = t(locale, 'emailTemplates.closings.regards');
  const team = t(locale, 'emailTemplates.closings.team');

  return { subject, greeting, closing, team };
}

/**
 * Obtém traduções comuns de email
 * @param userId ID do usuário
 * @returns Traduções comuns
 */
export async function getEmailCommonTranslations(userId: string): Promise<{
  viewDetails: string;
  contactSupport: string;
  automaticNotification: string;
  doNotReply: string;
  needHelp: string;
  accessSystem: string;
}> {
  const locale = await getUserLocale(userId);

  return {
    viewDetails: t(locale, 'emailTemplates.common.viewDetails'),
    contactSupport: t(locale, 'emailTemplates.common.contactSupport'),
    automaticNotification: t(locale, 'emailTemplates.common.automaticNotification'),
    doNotReply: t(locale, 'emailTemplates.common.doNotReply'),
    needHelp: t(locale, 'emailTemplates.common.needHelp'),
    accessSystem: t(locale, 'emailTemplates.common.accessSystem')
  };
}

/**
 * Gera HTML de email traduzido
 * @param userId ID do usuário
 * @param title Título do email
 * @param content Conteúdo principal
 * @param actionUrl URL de ação (opcional)
 * @param actionText Texto do botão de ação (opcional)
 * @returns HTML do email
 */
export async function generateTranslatedEmailHTML(
  userId: string,
  title: string,
  content: string,
  actionUrl?: string,
  actionText?: string
): Promise<string> {
  const locale = await getUserLocale(userId);
  const common = await getEmailCommonTranslations(userId);

  const actionButton = actionUrl && actionText ? `
    <div style="margin: 30px 0; text-align: center;">
      <a href="${actionUrl}" 
         style="***REMOVED*** #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        ${actionText}
      </a>
    </div>
  ` : '';

  return baseTemplate(`
    <div style="color: #333;">
      <!-- Header -->
      <div style="***REMOVED*** #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: white;">${title}</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 10px 0; font-size: 16px; line-height: 1.6;">
        ${content}
        ${actionButton}
      </div>
    </div>
  `, locale);
}

/**
 * Exemplo de uso em notificações:
 * 
 * const { title, message } = await getEvaluationNotificationTranslation(
 *   userId,
 *   'period_opened',
 *   { periodName: 'Avaliação Anual 2024' }
 * );
 * 
 * await createNotification({
 *   userId,
 *   title,
 *   message,
 *   type: 'evaluation'
 * });
 */

/**
 * Exemplo de uso em emails:
 * 
 * const { subject, greeting, closing, team } = await getEmailTemplate(
 *   userId,
 *   'reimbursementApproved',
 *   { protocol: 'RB-2024-001', amount: 'R$ 150,00' }
 * );
 * 
 * const html = await generateTranslatedEmailHTML(
 *   userId,
 *   subject,
 *   `<p>${greeting} ${userName},</p>
 *    <p>Seu reembolso foi aprovado!</p>
 *    <p>${closing},<br>${team}</p>`,
 *   '/reembolso/RB-2024-001',
 *   'Ver Detalhes'
 * );
 * 
 * await sendEmail(userEmail, subject, '', html);
 */
