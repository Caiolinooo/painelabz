/**
 * Resolve `users_unified` for a GT colaborador.
 * Identity on the portal is `tax_id` + `email` — never `cpf` / `full_name`.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { formatCpf, normalizeCpf } from '@/lib/gestao-tripulantes/cpf';
import {
  PORTAL_USER_SELECT,
  normalizeEmail,
  pickUniqueEmailMatch,
  pickUniqueNameCpfMatch,
  pickUniqueTaxIdMatch,
  shouldBackfillUserId,
  compatibleModuleUserIds,
  normalizePersonName,
  type PortalUser,
  type PortalUserLookup,
  type PortalUserMatchReason,
  type PortalUserResolution,
} from '@/lib/employee-hub/portal-user-match';

export {
  PORTAL_USER_SELECT,
  portalDisplayName,
  type PortalUser,
  type PortalUserLookup,
  type PortalUserMatchReason,
  type PortalUserResolution,
} from '@/lib/employee-hub/portal-user-match';

function asPortalUser(row: PortalUser | null | undefined): PortalUser | null {
  if (!row?.id) return null;
  return row;
}

async function fetchPortalUserById(userId: string): Promise<PortalUser | null> {
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return asPortalUser(data as PortalUser | null);
}

async function fetchPortalUserByTaxId(cpfDigits: string): Promise<PortalUser | null> {
  if (cpfDigits.length !== 11) return null;
  const masked = formatCpf(cpfDigits);
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .or(`tax_id.eq.${cpfDigits},tax_id.eq.${masked}`)
    .limit(5);
  if (error || !data?.length) return null;
  return pickUniqueTaxIdMatch(data as PortalUser[], cpfDigits);
}

async function fetchPortalUserByEmail(email: string): Promise<PortalUser | null> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) return null;
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .ilike('email', normalized)
    .limit(5);
  if (error || !data?.length) return null;
  return pickUniqueEmailMatch(data as PortalUser[], normalized);
}

async function fetchPortalUserByNameAndCpf(
  nome: string,
  cpfDigits: string,
): Promise<PortalUser | null> {
  const normalized = normalizePersonName(nome);
  const first = normalized.split(' ')[0] || '';
  if (first.length < 3 || cpfDigits.length !== 11) return null;
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .ilike('first_name', first)
    .limit(25);
  if (error || !data?.length) return null;
  return pickUniqueNameCpfMatch(data as PortalUser[], nome, cpfDigits);
}

async function maybeBackfillColaboradorUserId(
  colaboradorId: string,
  currentUserId: string | null | undefined,
  matched: PortalUser,
  reason: PortalUserMatchReason,
  cpfDigits: string,
): Promise<void> {
  if (
    !shouldBackfillUserId(currentUserId, matched.id, {
      reason,
      cpfDigits,
      matchedTaxId: matched.tax_id,
    })
  ) {
    return;
  }
  try {
    await supabaseAdmin
      .from('gt_colaboradores')
      .update({ user_id: matched.id, updated_at: new Date().toISOString() })
      .eq('id', colaboradorId)
      .is('user_id', null);
  } catch {
    // fail-safe: ficha still returns the resolved user
  }
}

export async function resolvePortalUser(lookup: PortalUserLookup): Promise<PortalUserResolution> {
  const cpf = normalizeCpf(lookup.cpf || '');
  const email = normalizeEmail(lookup.email);

  try {
    if (lookup.userId) {
      const byId = await fetchPortalUserById(lookup.userId);
      if (byId) {
        const [byTax, byEmail] = await Promise.all([
          fetchPortalUserByTaxId(cpf),
          fetchPortalUserByEmail(email),
        ]);
        return {
          user: byId,
          reason: 'user_id',
          moduleUserIds: compatibleModuleUserIds(byId, cpf, byTax, byEmail),
        };
      }
    }

    const byTax = await fetchPortalUserByTaxId(cpf);
    if (byTax) {
      const byEmail = await fetchPortalUserByEmail(email);
      await maybeBackfillColaboradorUserId(lookup.colaboradorId, lookup.userId, byTax, 'tax_id', cpf);
      return {
        user: byTax,
        reason: 'tax_id',
        moduleUserIds: compatibleModuleUserIds(byTax, cpf, byEmail),
      };
    }

    const byEmail = await fetchPortalUserByEmail(email);
    if (byEmail) {
      await maybeBackfillColaboradorUserId(lookup.colaboradorId, lookup.userId, byEmail, 'email', cpf);
      return {
        user: byEmail,
        reason: 'email',
        moduleUserIds: compatibleModuleUserIds(byEmail, cpf),
      };
    }

    const byName = await fetchPortalUserByNameAndCpf(lookup.nome || '', cpf);
    if (byName) {
      await maybeBackfillColaboradorUserId(lookup.colaboradorId, lookup.userId, byName, 'name_cpf', cpf);
      return {
        user: byName,
        reason: 'name_cpf',
        moduleUserIds: compatibleModuleUserIds(byName, cpf),
      };
    }
  } catch {
    return { user: null, reason: null, moduleUserIds: [] };
  }

  return { user: null, reason: null, moduleUserIds: [] };
}
