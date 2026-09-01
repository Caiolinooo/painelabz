import { supabaseAdmin } from '@/lib/supabase';
import {
  displayNameFromUser,
  isFechamentoRole,
  type AprovadorObrigatorio,
} from './fechamento-assinatura';

const PORTAL_USER_SELECT =
  'id, first_name, last_name, name, email, role, tax_id, signature_url, active';

export interface PortalGestorOption extends AprovadorObrigatorio {
  id: string;
  role: string;
  cpf?: string;
  signature_url?: string | null;
}

export type PortalUsuarioOption = PortalGestorOption;

interface PortalUserRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  tax_id?: string | null;
  signature_url?: string | null;
  active?: boolean | null;
}

function mapPortalUser(row: PortalUserRow): PortalGestorOption {
  const email = String(row.email || '').trim().toLowerCase();
  return {
    id: row.id,
    nome: displayNameFromUser(row),
    email,
    cargo: row.role || undefined,
    role: String(row.role || ''),
    cpf: row.tax_id || '',
    signature_url: row.signature_url || null,
  };
}

async function listarPortalAtivos(opts: { somenteGestores: boolean }): Promise<PortalGestorOption[]> {
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .order('first_name');

  if (error) {
    console.error(opts.somenteGestores ? '[listarGestoresPortal]' : '[listarUsuariosPortalAtivos]', error);
    return [];
  }

  return ((data || []) as PortalUserRow[])
    .filter((row) =>
      Boolean(row.id)
      && row.active !== false
      && String(row.email || '').trim()
      && (!opts.somenteGestores || isFechamentoRole(row.role)),
    )
    .map(mapPortalUser);
}

/** ADMIN/MANAGER ativos — ASO logística e atalhos que ainda filtram gestores. */
export function listarGestoresPortal(): Promise<PortalGestorOption[]> {
  return listarPortalAtivos({ somenteGestores: true });
}

/** Qualquer usuário ativo com e-mail — dropdown de aprovadores do fechamento (role irrelevante). */
export function listarUsuariosPortalAtivos(): Promise<PortalUsuarioOption[]> {
  return listarPortalAtivos({ somenteGestores: false });
}

export const listarUsuariosPortal = listarUsuariosPortalAtivos;

export async function loadFechamentoAtor(userId: string): Promise<{
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  role: string;
  signatureUrl: string;
} | null> {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[loadFechamentoAtor]', error);
    return null;
  }
  if (!data) return null;
  const row = data as PortalUserRow;
  const role = String(row.role || '');
  return {
    id: row.id,
    nome: displayNameFromUser(row),
    email: String(row.email || '').trim().toLowerCase(),
    cpf: row.tax_id || '',
    cargo: role || 'Aprovador',
    role,
    signatureUrl: row.signature_url || '',
  };
}
