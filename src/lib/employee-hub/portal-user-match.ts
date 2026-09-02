/**
 * Pure portal-identity helpers. Safe for tests and client UI.
 * `users_unified` identity is `tax_id` + `email` — never `cpf` / `full_name`.
 */

import { normalizeCpf } from '@/lib/gestao-tripulantes/cpf';

export const PORTAL_USER_SELECT =
  'id, first_name, last_name, email, phone_number, role, department, active, tax_id, created_at';

export type PortalUserMatchReason = 'user_id' | 'tax_id' | 'email' | 'name_cpf';

export interface PortalUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number?: string | null;
  role: string | null;
  department?: string | null;
  active?: boolean | null;
  tax_id?: string | null;
  created_at?: string | null;
}

export interface PortalUserLookup {
  colaboradorId: string;
  userId?: string | null;
  cpf: string;
  email: string;
  nome?: string | null;
}

export interface PortalUserResolution {
  user: PortalUser | null;
  reason: PortalUserMatchReason | null;
  moduleUserIds: string[];
}

export function normalizeEmail(raw: string | null | undefined): string {
  return String(raw || '').trim().toLowerCase();
}

export function emailsMatchExact(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeEmail(left);
  const b = normalizeEmail(right);
  return Boolean(a && b && a === b && a.includes('@'));
}

export function taxIdDigitsMatch(
  taxId: string | null | undefined,
  cpfDigits: string,
): boolean {
  if (cpfDigits.length !== 11) return false;
  return normalizeCpf(taxId || '') === cpfDigits;
}

export function normalizePersonName(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function portalDisplayName(
  user: Pick<PortalUser, 'first_name' | 'last_name' | 'email'>,
): string {
  const assembled = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return assembled || user.email || '';
}

export function shouldBackfillUserId(
  currentUserId: string | null | undefined,
  matchedUserId: string | null | undefined,
): boolean {
  if (!matchedUserId) return false;
  return !currentUserId;
}

export function pickUniqueTaxIdMatch(rows: PortalUser[], cpfDigits: string): PortalUser | null {
  const hits = rows.filter((row) => taxIdDigitsMatch(row.tax_id, cpfDigits));
  return hits.length === 1 ? hits[0] : null;
}

export function pickUniqueEmailMatch(rows: PortalUser[], email: string): PortalUser | null {
  const hits = rows.filter((row) => emailsMatchExact(row.email, email));
  return hits.length === 1 ? hits[0] : null;
}

export function pickUniqueNameCpfMatch(
  rows: PortalUser[],
  nome: string,
  cpfDigits: string,
): PortalUser | null {
  const want = normalizePersonName(nome);
  if (!want || cpfDigits.length !== 11) return null;
  const hits = rows.filter((row) => {
    if (!taxIdDigitsMatch(row.tax_id, cpfDigits)) return false;
    return normalizePersonName(portalDisplayName(row)) === want;
  });
  return hits.length === 1 ? hits[0] : null;
}

export function uniqueUserIds(...ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
