import { supabaseAdmin } from '@/lib/supabase';

const ASO_ALERTA_SELECT = `
  id, titulo, numero_documento, numero_rastreio, data_emissao, data_validade, status_validacao,
  colaborador:gt_colaboradores(id, user_id, nome_completo, cpf, email, matricula,
    cargo:gt_cargos(nome),
    empresa:gt_empresas(nome),
    embarcacao_atual:gt_embarcacoes!embarcacao_atual_id(nome)
  )
`.replace(/\s+/g, ' ').trim();

export type AsoAlertaStatus = 'vencido' | 'vencendo';

export interface AsoVencimentoColaborador {
  id: string;
  user_id: string | null;
  nome_completo: string;
  cpf: string;
  email: string | null;
  matricula: string | null;
  cargo_nome: string | null;
  empresa_nome: string | null;
  embarcacao_nome: string | null;
}

export interface AsoVencimentoItem {
  id: string;
  titulo: string;
  numero_documento: string | null;
  numero_rastreio: string | null;
  data_emissao: string | null;
  data_validade: string;
  status_validacao: string | null;
  alerta: AsoAlertaStatus;
  colaborador: AsoVencimentoColaborador | null;
}

export interface AsosComAlerta {
  vencidos: AsoVencimentoItem[];
  vencendo: AsoVencimentoItem[];
}

function asRel<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function dataLocalISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function adicionarDiasLocalISO(dias: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  return dataLocalISO(d);
}

export type ClassificacaoValidadeCivil = 'vencido' | 'vencendo' | 'valido' | 'sem_validade';

/** Civil YYYY-MM-DD compare — never `new Date(iso)` UTC. Janela vencendo: hoje…hoje+30 inclusive. */
export function classificarValidadeCivil(
  dataValidade: string | null | undefined,
  hoje = dataLocalISO(),
  limite?: string,
): ClassificacaoValidadeCivil {
  const validade = String(dataValidade || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade)) return 'sem_validade';
  const [y, m, d] = hoje.split('-').map(Number);
  const limiteCivil = limite ?? dataLocalISO(new Date(y, (m || 1) - 1, (d || 1) + 30));
  if (validade < hoje) return 'vencido';
  if (validade <= limiteCivil) return 'vencendo';
  return 'valido';
}

function normalizarColaborador(raw: unknown): AsoVencimentoColaborador | null {
  const colab = asRel(raw as Record<string, unknown> | null);
  if (!colab || typeof colab.id !== 'string') return null;
  const cargo = asRel(colab.cargo as { nome?: string } | null);
  const empresa = asRel(colab.empresa as { nome?: string } | null);
  const embarcacao = asRel(colab.embarcacao_atual as { nome?: string } | null);
  return {
    id: colab.id as string,
    user_id: (colab.user_id as string | null) ?? null,
    nome_completo: String(colab.nome_completo || ''),
    cpf: String(colab.cpf || ''),
    email: (colab.email as string | null) ?? null,
    matricula: (colab.matricula as string | null) ?? null,
    cargo_nome: cargo?.nome ?? null,
    empresa_nome: empresa?.nome ?? null,
    embarcacao_nome: embarcacao?.nome ?? null,
  };
}

interface AsoAlertaRow {
  id: string;
  titulo: string;
  numero_documento: string | null;
  numero_rastreio: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  status_validacao: string | null;
  colaborador: unknown;
}

/**
 * ASOs vencidos ou com validade até `diasJanela` (inclusive), classificados
 * por data civil local (YYYY-MM-DD) — nunca via `Date` UTC de string ISO.
 */
export async function buscarAsosComAlerta(diasJanela = 30): Promise<AsosComAlerta> {
  const hoje = dataLocalISO();
  const limite = adicionarDiasLocalISO(diasJanela);

  const { data, error } = await supabaseAdmin
    .from('gt_documentos')
    .select(ASO_ALERTA_SELECT)
    .eq('tipo_documento', 'aso')
    .is('deleted_at', null)
    .not('data_validade', 'is', null)
    .lte('data_validade', limite)
    .order('data_validade', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const vencidos: AsoVencimentoItem[] = [];
  const vencendo: AsoVencimentoItem[] = [];

  for (const row of (data || []) as unknown as AsoAlertaRow[]) {
    const validade = String(row.data_validade || '').slice(0, 10);
    if (!validade) continue;
    const colaborador = normalizarColaborador(row.colaborador);
    if (!colaborador) continue;

    const alerta: AsoAlertaStatus =
      classificarValidadeCivil(validade, hoje, limite) === 'vencido' ? 'vencido' : 'vencendo';
    const item: AsoVencimentoItem = {
      id: row.id,
      titulo: row.titulo,
      numero_documento: row.numero_documento ?? null,
      numero_rastreio: row.numero_rastreio ?? null,
      data_emissao: row.data_emissao ?? null,
      data_validade: validade,
      status_validacao: row.status_validacao ?? null,
      alerta,
      colaborador,
    };

    if (alerta === 'vencido') vencidos.push(item);
    else vencendo.push(item);
  }

  return { vencidos, vencendo };
}
