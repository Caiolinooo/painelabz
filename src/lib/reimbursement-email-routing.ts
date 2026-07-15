/**
 * Resolução de destinatários de email do módulo de reembolso.
 *
 * Três listas independentes (admin):
 * - recipients: aprovação inicial para solicitantes @groupabz.com
 * - externalRecipients: aprovação inicial para outros domínios
 * - financeEmails: após aprovação, para marcar como pago
 */

export const DEFAULT_APPROVAL_RECIPIENTS = ['andresa.oliveira@groupabz.com'];
export const DEFAULT_EXTERNAL_RECIPIENTS = ['fiscal@groupabz.com'];
export const DEFAULT_FINANCE_EMAILS = ['fiscal@groupabz.com'];

export interface ReimbursementEmailSettings {
  enableDomainRule?: boolean;
  recipients?: string[];
  externalRecipients?: string[];
  financeEmails?: string[];
}

export function isGroupAbzEmail(email: string): boolean {
  return email.toLowerCase().trim().endsWith('@groupabz.com');
}

export function normalizeEmailList(emails: string[] | undefined | null, fallback: string[]): string[] {
  if (!Array.isArray(emails) || emails.length === 0) {
    return [...fallback];
  }

  const unique = new Set<string>();
  for (const email of emails) {
    const normalized = (email || '').toLowerCase().trim();
    if (normalized.includes('@')) {
      unique.add(normalized);
    }
  }

  return unique.size > 0 ? Array.from(unique) : [...fallback];
}

/**
 * Normaliza configs antigas e garante as três listas.
 * - fiscal em recipients → financeEmails
 * - externalRecipients ausente → usa financeEmails (legado) ou default fiscal
 * - financeiro@ legado → fiscal@
 */
export function normalizeReimbursementEmailSettings(
  settings?: ReimbursementEmailSettings | null
): Required<ReimbursementEmailSettings> {
  const enableDomainRule = settings?.enableDomainRule !== false;
  let recipients = normalizeEmailList(settings?.recipients, DEFAULT_APPROVAL_RECIPIENTS);
  let financeEmails = normalizeEmailList(settings?.financeEmails, DEFAULT_FINANCE_EMAILS);

  // Migrar fiscal de recipients → financeEmails
  const fiscalInRecipients = recipients.filter((e) => e === 'fiscal@groupabz.com' || e.startsWith('fiscal@'));
  if (fiscalInRecipients.length > 0) {
    recipients = recipients.filter((e) => !(e === 'fiscal@groupabz.com' || e.startsWith('fiscal@')));
    for (const fiscal of fiscalInRecipients) {
      if (!financeEmails.includes(fiscal)) {
        financeEmails.push(fiscal);
      }
    }
  }

  // Remover legado financeiro@ quando fiscal já está na lista (ou substituir se for o único)
  const hasFiscal = financeEmails.some((e) => e === 'fiscal@groupabz.com' || e.startsWith('fiscal@'));
  if (hasFiscal) {
    financeEmails = financeEmails.filter((e) => e !== 'financeiro@groupabz.com');
  } else if (
    financeEmails.length === 1 &&
    financeEmails[0] === 'financeiro@groupabz.com'
  ) {
    financeEmails = [...DEFAULT_FINANCE_EMAILS];
  }

  // externalRecipients: se não existir na config antiga, herda financeEmails já normalizado
  const hasExplicitExternal = Array.isArray(settings?.externalRecipients) && settings!.externalRecipients!.length > 0;
  let externalRecipients = hasExplicitExternal
    ? normalizeEmailList(settings?.externalRecipients, DEFAULT_EXTERNAL_RECIPIENTS)
    : [...financeEmails];

  if (recipients.length === 0) {
    recipients = [...DEFAULT_APPROVAL_RECIPIENTS];
  }
  if (externalRecipients.length === 0) {
    externalRecipients = [...DEFAULT_EXTERNAL_RECIPIENTS];
  }
  if (financeEmails.length === 0) {
    financeEmails = [...DEFAULT_FINANCE_EMAILS];
  }

  return { enableDomainRule, recipients, externalRecipients, financeEmails };
}

/**
 * Destinatários da solicitação inicial (aprovação).
 * groupabz + regra ativa → recipients
 * caso contrário → externalRecipients
 */
export function resolveInitialApprovalRecipients(
  requesterEmail: string,
  settings?: ReimbursementEmailSettings | null
): string[] {
  const normalized = normalizeReimbursementEmailSettings(settings);

  if (normalized.enableDomainRule && isGroupAbzEmail(requesterEmail)) {
    return normalized.recipients;
  }

  return normalized.externalRecipients;
}

/**
 * Destinatários após aprovação (marcar como pago).
 * Sempre financeEmails, independentemente do domínio.
 */
export function resolveFinancePaymentRecipients(
  settings?: ReimbursementEmailSettings | null
): string[] {
  return normalizeReimbursementEmailSettings(settings).financeEmails;
}

export function getDefaultReimbursementEmailSettings(): Required<ReimbursementEmailSettings> {
  return {
    enableDomainRule: true,
    recipients: [...DEFAULT_APPROVAL_RECIPIENTS],
    externalRecipients: [...DEFAULT_EXTERNAL_RECIPIENTS],
    financeEmails: [...DEFAULT_FINANCE_EMAILS],
  };
}
