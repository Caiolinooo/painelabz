/**
 * Configuração centralizada do módulo de Férias.
 *
 * Este módulo concentra as regras de negócio do módulo de férias que
 * anteriormente estavam espalhadas pelo código ou hardcoded.
 *
 * Permite ajustar facilmente (via painel admin em /admin/leave-settings):
 * - Prazo mínimo de antecedência para solicitação (legislação / política DP)
 * - E-mails adicionais que devem ser notificados quando uma nova
 *   solicitação de férias é aberta (solicitação do DP - Carlos Gallo + RH)
 *
 * Todas as configurações têm 3 camadas de fallback:
 *   1. Banco de dados (tabela app_secrets) - configurável via painel admin
 *   2. Variável de ambiente
 *   3. Hardcoded fallback (default)
 */

import { getCredential } from '@/lib/secure-credentials';

/**
 * Prazo mínimo de antecedência (em dias) para uma solicitação de férias.
 *
 * Solicitação do DP (Carlos Gallo): 40 dias de antecedência,
 * contemplando tanto o período de solicitação quanto o de processamento,
 * a fim de garantir o cumprimento do prazo de envio previsto na legislação.
 *
 * Este valor é o FALLBACK usado quando nada está configurado no banco
 * nem na env. O valor efetivo pode ser alterado pelo admin em
 * /admin/leave-settings (credencial `LEAVE_ADVANCE_NOTICE_DAYS`).
 */
export const DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS = 40;

/**
 * Chaves das credenciais armazenadas no banco (tabela app_secrets).
 */
export const LEAVE_ADVANCE_NOTICE_DAYS_KEY = 'LEAVE_ADVANCE_NOTICE_DAYS';
export const CARLOS_GALLO_EMAIL_KEY = 'CARLOS_GALLO_EMAIL';
export const LEAVE_EXTRA_NOTIFY_EMAILS_KEY = 'LEAVE_EXTRA_NOTIFY_EMAILS';

/**
 * @deprecated Use `getAdvanceNoticeDays()` (async) ou
 * `DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS` (constante).
 *
 * Mantido para compatibilidade com código que ainda usa o valor
 * sincronizado (ex: UI que carrega a configuração via API no mount).
 */
export const LEAVE_ADVANCE_NOTICE_DAYS = Number(
  process.env.LEAVE_ADVANCE_NOTICE_DAYS || String(DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS)
);

/**
 * Retorna o prazo mínimo de antecedência (em dias) configurado no banco,
 * com fallback para env e constante default.
 *
 * Lê da credencial `LEAVE_ADVANCE_NOTICE_DAYS` no banco, que é
 * configurável via painel admin em /admin/leave-settings.
 */
export async function getAdvanceNoticeDays(): Promise<number> {
  const fromDb = await getCredential(LEAVE_ADVANCE_NOTICE_DAYS_KEY);
  if (fromDb) {
    const parsed = parseInt(fromDb, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const fromEnv = Number(process.env.LEAVE_ADVANCE_NOTICE_DAYS);
  if (!isNaN(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS;
}

/**
 * Email padrão do responsável do DP (Carlos Gallo) que deve ser incluído
 * nas notificações de novas solicitações de férias.
 *
 * Pode ser sobrescrito via:
 * 1. Credencial `CARLOS_GALLO_EMAIL` no banco (app_secrets) - configurável via admin
 * 2. Variável de ambiente `CARLOS_GALLO_EMAIL`
 * 3. Fallback hardcoded abaixo
 */
export async function getCarlosGalloEmail(): Promise<string> {
  const fromDb = await getCredential(CARLOS_GALLO_EMAIL_KEY);
  return fromDb || process.env.CARLOS_GALLO_EMAIL || 'carlos.gallo@groupabz.com';
}

/**
 * Retorna a lista de emails adicionais que devem ser notificados quando
 * uma nova solicitação de férias é aberta (além do RH e do colaborador).
 *
 * Atualmente inclui apenas o Carlos Gallo (solicitação do DP), mas a lista
 * pode ser expandida via:
 * 1. Credencial `LEAVE_EXTRA_NOTIFY_EMAILS` no banco (separados por vírgula)
 *    - configurável via painel admin
 * 2. Variável de ambiente `LEAVE_EXTRA_NOTIFY_EMAILS` (separados por vírgula)
 */
export async function getLeaveExtraNotifyEmails(): Promise<string[]> {
  const emails: string[] = [];

  // Carlos Gallo (solicitação do DP)
  const carlosEmail = await getCarlosGalloEmail();
  if (carlosEmail) {
    emails.push(carlosEmail);
  }

  // Emails adicionais via credencial no banco (separados por vírgula)
  const fromDb = await getCredential(LEAVE_EXTRA_NOTIFY_EMAILS_KEY);
  if (fromDb) {
    fromDb
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
      .forEach(email => {
        if (!emails.includes(email)) {
          emails.push(email);
        }
      });
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
 *
 * @deprecated Use `getMinLeaveStartDateAsync()` para usar o valor
 * configurado no banco. Esta versão síncrona usa o fallback default.
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
 * Versão async de `getMinLeaveStartDate()` que usa o valor configurado
 * no banco (via painel admin).
 */
export async function getMinLeaveStartDateAsync(from: Date = new Date()): Promise<string> {
  const advanceDays = await getAdvanceNoticeDays();
  const minDate = new Date(from);
  minDate.setDate(minDate.getDate() + advanceDays);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, '0');
  const day = String(minDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida se a data de início das férias atende ao prazo mínimo de
 * antecedência.
 *
 * @deprecated Use `validateLeaveAdvanceNoticeAsync()` para usar o valor
 * configurado no banco. Esta versão síncrona usa o fallback default.
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
  return validateLeaveAdvanceNoticeWithDays(startDate, LEAVE_ADVANCE_NOTICE_DAYS, now);
}

/**
 * Versão async de `validateLeaveAdvanceNotice()` que usa o valor
 * configurado no banco (via painel admin).
 */
export async function validateLeaveAdvanceNoticeAsync(
  startDate: string,
  now: Date = new Date()
): Promise<{
  valid: boolean;
  errorMessage?: string;
  minDate?: string;
  daysAhead?: number;
  requiredDays?: number;
}> {
  const advanceDays = await getAdvanceNoticeDays();
  const result = validateLeaveAdvanceNoticeWithDays(startDate, advanceDays, now);
  return { ...result, requiredDays: advanceDays };
}

/**
 * Implementação compartilhada entre as versões sync e async.
 */
function validateLeaveAdvanceNoticeWithDays(
  startDate: string,
  advanceDays: number,
  now: Date
): {
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

  if (diffDays < advanceDays) {
    const minDate = getMinLeaveStartDateForDays(now, advanceDays);
    return {
      valid: false,
      errorMessage: `A data de início das férias deve ser solicitada com no mínimo ${advanceDays} dias de antecedência (solicitação do DP para cumprimento do prazo legal de processamento). A data mais próxima permitida é ${formatDatePTBR(minDate)}.`,
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
 * Helper para calcular a data mínima para um número específico de dias.
 */
function getMinLeaveStartDateForDays(from: Date, advanceDays: number): string {
  const minDate = new Date(from);
  minDate.setDate(minDate.getDate() + advanceDays);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, '0');
  const day = String(minDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
