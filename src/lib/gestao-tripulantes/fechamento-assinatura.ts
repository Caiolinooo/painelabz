import { normalizeCpf } from '@/lib/utils/identity';

export const FECHAMENTO_STATUS = [
  'pendente_revisao',
  'em_aprovacao',
  'aprovado',
  'rejeitado',
  'enviado',
] as const;

export type FechamentoStatus = (typeof FECHAMENTO_STATUS)[number];

export interface AprovadorObrigatorio {
  id?: string;
  nome: string;
  email: string;
  cargo?: string;
}

export interface AssinaturaFechamento {
  userId?: string;
  email?: string;
  nome?: string;
  cpf?: string;
  cargo?: string;
  assinado_em?: string;
  dataHora?: string;
  ip?: string;
  assinaturaUrl?: string;
  assinaturaHash?: string;
}

export interface PortalUserNameRow {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
}

const FECHAMENTO_ROLES = [
  'ADMIN',
  'ADMINISTRADOR',
  'SUPERADMIN',
  'MANAGER',
  'GERENTE',
] as const;

export function isFechamentoRole(role: string | undefined | null): boolean {
  const r = (role || '').trim().toUpperCase();
  return (FECHAMENTO_ROLES as readonly string[]).includes(r);
}

export function isFechamentoStatus(value: string | null | undefined): value is FechamentoStatus {
  return (FECHAMENTO_STATUS as readonly string[]).includes(String(value || ''));
}

export function labelFechamentoStatus(
  status: FechamentoStatus,
  extras?: { assinados?: number; obrigatorios?: number },
): string {
  switch (status) {
    case 'enviado':
      return 'Enviado ao DP';
    case 'aprovado':
      return 'Aprovado (100%)';
    case 'em_aprovacao': {
      const den = extras?.obrigatorios && extras.obrigatorios > 0 ? extras.obrigatorios : 1;
      return `Em Aprovação (${extras?.assinados ?? 0}/${den})`;
    }
    case 'rejeitado':
      return 'Rejeitado';
    case 'pendente_revisao':
      return 'Pendente';
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function displayNameFromUser(row: PortalUserNameRow): string {
  const composed = `${row.first_name || ''} ${row.last_name || ''}`.trim();
  return composed || (row.name || '').trim() || (row.email || '').trim() || 'Usuário';
}

export function normalizeAprovadoresObrigatorios(raw: unknown): AprovadorObrigatorio[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AprovadorObrigatorio[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const email = String(rec.email || '').trim().toLowerCase();
    const id = String(rec.id || '').trim();
    if (!email && !id) continue;
    const key = email || `id:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: id || undefined,
      nome: String(rec.nome || rec.name || email || 'Aprovador').trim(),
      email,
      cargo: rec.cargo ? String(rec.cargo) : undefined,
    });
  }
  return out;
}

export function assinaturaCobreAprovador(
  obr: AprovadorObrigatorio,
  assinaturas: AssinaturaFechamento[],
): boolean {
  const obrEmail = (obr.email || '').toLowerCase().trim();
  const obrId = (obr.id || '').trim();
  return assinaturas.some((sig) => {
    const sigEmail = (sig.email || '').toLowerCase().trim();
    const sigId = String(sig.userId || '').trim();
    return (Boolean(obrEmail) && Boolean(sigEmail) && sigEmail === obrEmail)
      || (Boolean(obrId) && Boolean(sigId) && sigId === obrId);
  });
}

/**
 * Empty required list: a single ADMIN/MANAGER signature completes (100%).
 * Named list of N: every listed member must have signed; extras do not block.
 */
export function avaliarAssinaturasFechamento(
  obrigatorios: AprovadorObrigatorio[],
  assinaturas: AssinaturaFechamento[],
): { todosAssinaram: boolean; pendentes: AprovadorObrigatorio[] } {
  if (obrigatorios.length === 0) {
    return { todosAssinaram: assinaturas.length > 0, pendentes: [] };
  }
  const pendentes = obrigatorios.filter((obr) => !assinaturaCobreAprovador(obr, assinaturas));
  return { todosAssinaram: pendentes.length === 0, pendentes };
}

export function montarHashFechamento(input: {
  mesAno: string;
  nome: string;
  cpf: string;
  dataIso: string;
  ip: string;
}): string {
  const cpf = normalizeCpf(input.cpf || '') || (input.cpf || '');
  return `GT_FECHAMENTO:${input.mesAno}:${input.nome}:${cpf}:${input.dataIso}:${input.ip}`;
}

export function mensagemErroAssinaturaAusente(): string {
  return 'Assinatura digital é obrigatória para o fechamento. Cadastre sua assinatura e confirme no modal para continuar.';
}
