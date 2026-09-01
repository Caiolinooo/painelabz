import { supabaseAdmin } from '@/lib/supabase';
import { findColaboradorByCpf } from '@/lib/gestao-tripulantes/cpf-lookup';
import { normalizeCpf } from '@/lib/utils/identity';
import { normalizePersonName } from './names';
import type { CollaboratorIdentity } from './types';

export { normalizePersonName };

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = (value || '').trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function digitsOrNull(raw: string | null | undefined): string | null {
  const digits = normalizeCpf(raw || '');
  return digits.length === 11 ? digits : null;
}

interface UserRow {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  cpf?: string | null;
  tax_id?: string | null;
  position?: string | null;
  department?: string | null;
  sector_id?: string | null;
}

interface ColabRow {
  id: string;
  nome_completo?: string | null;
  cpf?: string | null;
  email?: string | null;
  cargo_nome?: string | null;
}

function identityFromUser(user: UserRow, colab?: ColabRow | null): CollaboratorIdentity {
  const fullName = firstNonEmpty(
    `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    user.name,
    colab?.nome_completo
  );
  const email = firstNonEmpty(user.email, colab?.email);
  return {
    userId: user.id,
    colaboradorId: colab?.id || null,
    cpfDigits: digitsOrNull(user.cpf) || digitsOrNull(user.tax_id) || digitsOrNull(colab?.cpf),
    email,
    emailLower: email ? email.toLowerCase() : null,
    fullName,
    fullNameNormalized: normalizePersonName(fullName),
    position: firstNonEmpty(user.position, colab?.cargo_nome),
    department: user.department || null,
    sectorId: user.sector_id || null,
  };
}

function identityFromColab(colab: ColabRow, user?: UserRow | null): CollaboratorIdentity {
  if (user) return identityFromUser(user, colab);
  const email = firstNonEmpty(colab.email);
  return {
    userId: null,
    colaboradorId: colab.id,
    cpfDigits: digitsOrNull(colab.cpf),
    email,
    emailLower: email ? email.toLowerCase() : null,
    fullName: colab.nome_completo || null,
    fullNameNormalized: normalizePersonName(colab.nome_completo),
    position: colab.cargo_nome || null,
    department: null,
    sectorId: null,
  };
}

async function findColaboradorByCpfOrEmail(
  cpfDigits: string | null,
  emailLower: string | null
): Promise<ColabRow | null> {
  if (cpfDigits) {
    const hit = await findColaboradorByCpf(cpfDigits);
    if (hit) {
      const { data } = await supabaseAdmin
        .from('gt_colaboradores')
        .select('id, nome_completo, cpf, email')
        .eq('id', hit.id)
        .maybeSingle();
      if (data) return data;
    }
  }
  if (emailLower) {
    const { data } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id, nome_completo, cpf, email')
      .is('deleted_at', null)
      .ilike('email', emailLower)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function findUserByCpfOrEmail(
  cpfDigits: string | null,
  emailLower: string | null
): Promise<UserRow | null> {
  if (cpfDigits) {
    const { data } = await supabaseAdmin
      .from('users_unified')
      .select('id, email, first_name, last_name, name, cpf, tax_id, position, department, sector_id')
      .or(`cpf.eq.${cpfDigits},tax_id.eq.${cpfDigits}`)
      .limit(5);
    const match = (data || []).find(
      (row) => digitsOrNull(row.cpf) === cpfDigits || digitsOrNull(row.tax_id) === cpfDigits
    );
    if (match) return match;
  }
  if (emailLower) {
    const { data } = await supabaseAdmin
      .from('users_unified')
      .select('id, email, first_name, last_name, name, cpf, tax_id, position, department, sector_id')
      .ilike('email', emailLower)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function resolveCollaboratorIdentity(opts: {
  userId?: string | null;
  colaboradorId?: string | null;
}): Promise<CollaboratorIdentity | null> {
  const userId = opts.userId || null;
  const colaboradorId = opts.colaboradorId || null;
  if (!userId && !colaboradorId) return null;

  let user: UserRow | null = null;
  let colab: ColabRow | null = null;

  if (userId) {
    const { data } = await supabaseAdmin
      .from('users_unified')
      .select('id, email, first_name, last_name, name, cpf, tax_id, position, department, sector_id')
      .eq('id', userId)
      .maybeSingle();
    user = data;
  }

  if (colaboradorId) {
    const { data } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id, nome_completo, cpf, email')
      .eq('id', colaboradorId)
      .is('deleted_at', null)
      .maybeSingle();
    colab = data;
  }

  if (user && !colab) {
    colab = await findColaboradorByCpfOrEmail(
      digitsOrNull(user.cpf) || digitsOrNull(user.tax_id),
      user.email ? user.email.toLowerCase() : null
    );
  }

  if (colab && !user) {
    user = await findUserByCpfOrEmail(
      digitsOrNull(colab.cpf),
      colab.email ? colab.email.toLowerCase() : null
    );
  }

  if (user) return identityFromUser(user, colab);
  if (colab) return identityFromColab(colab, user);
  return null;
}
