/**
 * CPF helpers for Gestão de Tripulantes / ASO / e-Social / PoliWeb.
 * Digits-only normalize is centralized in `@/lib/utils/identity`.
 * Safe for client + server. DB lookups live in `cpf-lookup.ts` (server only).
 */

import { formatCpf, normalizeCpf } from '@/lib/utils/identity';

export { formatCpf, normalizeCpf };

export type AsoIdentityMatch = 'match' | 'reassigned' | 'quarantine' | 'unknown' | 'frozen';

export const ESOCIAL_STATUS_QUEUED = ['pendente', 'enviado', 'processado'] as const;
export const ESOCIAL_STATUS_GLOBAL = ['enviado', 'processado'] as const;

export function isEsocialQueuedOrBeyond(status: string | null | undefined): boolean {
  return ESOCIAL_STATUS_QUEUED.includes((status || '') as (typeof ESOCIAL_STATUS_QUEUED)[number]);
}

export function isEsocialGlobalVisible(status: string | null | undefined): boolean {
  return ESOCIAL_STATUS_GLOBAL.includes((status || '') as (typeof ESOCIAL_STATUS_GLOBAL)[number]);
}

export function cpfsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCpf(a || '');
  const nb = normalizeCpf(b || '');
  if (na.length !== 11 || nb.length !== 11) return false;
  return na === nb;
}
