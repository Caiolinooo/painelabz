/**
 * Configuração centralizada do módulo de Férias.
 *
 * Este módulo concentra as regras de negócio do módulo de férias que
 * anteriormente estavam espalhadas pelo código ou hardcoded.
 *
 * Permite ajustar facilmente:
 * - Prazo mínimo de antecedência para solicitação (legislação / política DP)
 * - E-mails adicionais que devem ser notificados quando uma nova
 *   solicitação de férias é aberta (solicitação do DP - Carlos Gallo + RH)
 */

import { getCredential } from '@/lib/secure-credentials';

/**
 * Prazo mínimo de antecedência (em dias) para uma solicitação de férias.
 *
 * Solicitação do DP (Carlos Gallo): alterar para 40 dias de antecedência,
 * contemplando tanto o período de solicitação quanto o de processamento,
 * a fim de garantir o cumprimento do prazo de envio previsto na legislação.
 *
 * Este valor pode ser sobrescrevido via variável de ambiente
 * `LEAVE_ADVANCE_NOTICE_DAYS`.
 */
export const LEAVE_ADVANCE_NOTICE_DAYS = Number(
  process.env.LEAVE_ADVANCE_NOTICE_DAYS || '40'
);

/**
 * Email padrão do responsável do DP (Carlos Gallo) que deve ser incluído
 * nas notificações de novas solicitações de férias.
 *
 * Pode ser sobrescrito via:
 * 1. Credencial `CARLOS_GALLO_EMAIL` no banco (app_secrets)
 * 2. Variável de ambiente `CARLOS_GALLO_EMAIL`
 * 3. Fallback hardcoded abaixo
 */
export async function getCarlosGalloEmail(): Promise<string> {
  const fromDb = await getCredential('CARLOS_GALLO_EMAIL');
  return fromDb || process.env.CARLOS_GALLO_EMAIL || 'carlos.gallo@groupabz.com';
}

/**
 * Retorna a lista de emails adicionais que devem ser notificados quando
 * uma nova solicitação de férias é aberta (além do RH e do colaborador).
 *
 * Atualmente inclui apenas o Carlos Gallo (solicitação do DP), mas a lista
 * pode ser expandida via variável de ambiente
 * `LEAVE_EXTRA_NOTIFY_EMAILS` (separados por vírgula).
 */
export async function getLeaveExtraNotifyEmails(): Promise<string[]> {
  const emails: string[] = [];

  // Carlos Gallo (solicitação do DP)
  const carlosEmail = await getCarlosGalloEmail();
  if (carlosEmail) {
    emails.push(carlosEmail);
  }

  // Emails adicionais via variável de ambiente (separados por vírgula)
  const extraEnv = process.env.LEAVE_EXTRA_NOTIFY_EMAILS;
  if (extraEnv) {
    extraEnv
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
      .forEach(email => {
        if (!emails.includes(email)) {
          emails.push(email);
        }
      });
  }

  return emails;
}

/**
 * Calcula a data mínima permitida para o início das férias com base no
 * prazo de antecedência. Retorna no formato `YYYY-MM-DD` para uso em
 * inputs `type="date"`.
 */
export function getMinLeaveStartDate(from: Date = new Date()): string {
  const minDate = new Date(from);
  minDate.setDate(minDate.getDate() + LEAVE_ADVANCE_NOTICE_DAYS);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, '0');
  const day = String(minDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida se a data de início das férias atende ao prazo mínimo de
 * antecedência.
 *
 * @param startDate Data de início no formato `YYYY-MM-DD`
 * @returns Objeto com `valid` (booleano) e `errorMessage` (string) caso inválido
 */
export function validateLeaveAdvanceNotice(startDate: string, now: Date = new Date()): {
  valid: boolean;
  errorMessage?: string;
  minDate?: string;
  daysAhead?: number;
} {
  if (!startDate) {
    return {
      valid: false,
      errorMessage: 'Data de início é obrigatória'
    };
  }

  // Parse sem aplicar timezone para evitar off-by-one
  const [year, month, day] = startDate.split('-').map(Number);
  if (!year || !month || !day) {
    return {
      valid: false,
      errorMessage: 'Data de início inválida'
    };
  }

  // Data de início ao meio-dia para evitar problemas de timezone
  const start = new Date(year, month - 1, day, 12, 0, 0);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  if (isNaN(start.getTime())) {
    return {
      valid: false,
      errorMessage: 'Data de início inválida'
    };
  }

  const diffMs = start.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < LEAVE_ADVANCE_NOTICE_DAYS) {
    const minDate = getMinLeaveStartDate(now);
    return {
      valid: false,
      errorMessage: `A data de início das férias deve ser solicitada com no mínimo ${LEAVE_ADVANCE_NOTICE_DAYS} dias de antecedência (solicitação do DP para cumprimento do prazo legal de processamento). A data mais próxima permitida é ${formatDatePTBR(minDate)}.`,
      minDate,
      daysAhead: diffDays
    };
  }

  return {
    valid: true,
    daysAhead: diffDays
  };
}

/**
 * Formata uma data `YYYY-MM-DD` para o padrão brasileiro `DD/MM/YYYY`.
 */
export function formatDatePTBR(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
