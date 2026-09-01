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

export async function listarGestoresPortal(): Promise<PortalGestorOption[]> {
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select(PORTAL_USER_SELECT)
    .order('first_name');

  if (error) {
    console.error('[listarGestoresPortal]', error);
    return [];
  }

  return ((data || []) as PortalUserRow[])
    .filter((row) =>
      Boolean(row.id)
      && row.active !== false
      && isFechamentoRole(row.role)
      && String(row.email || '').trim(),
    )
    .map(mapPortalUser);
}

export async function loadFechamentoAtor(userId: string): Promise<{
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
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
  return {
    id: row.id,
    nome: displayNameFromUser(row),
    email: String(row.email || '').trim().toLowerCase(),
    cpf: row.tax_id || '',
    cargo: String(row.role || 'Gestor'),
    signatureUrl: row.signature_url || '',
  };
}
