import { supabaseAdmin } from '@/lib/supabase';
import type { GTDashboardResumo } from '@/types/gestao-tripulantes';
import { adicionarDiasLocalISO, dataLocalISO } from '@/lib/gestao-tripulantes/aso-vencimentos';
import { listarDocumentosAlertas } from '@/lib/gestao-tripulantes/documentos-alertas';
import {
  dayCodeForCivilDay,
  isEmbarcadoPobDayCode,
  type EscalaEventoDia,
} from '@/lib/gestao-tripulantes/embarque-status';
import {
  somarDocsPorStatusPrimario,
  type DocumentoAgrupavel,
} from '@/lib/gestao-tripulantes/documento-historico';

const PAGE_SIZE = 1000;
const DOC_IN_CHUNK = 120;

interface ColabAtivoRow {
  id: string;
  centro_custo_id: string | null;
  status_embarque: string | null;
  standby: boolean | null;
}

/** Ativo + não deletado; CC inativo exclui; CC nulo entra. */
export async function listarColaboradoresDashboardAtivos(): Promise<{
  ids: string[];
  total: number;
  embarcados: number;
  disponiveis: number;
  error?: string;
}> {
  const colabs: ColabAtivoRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id, centro_custo_id, status_embarque, standby')
      .is('deleted_at', null)
      .eq('ativo', true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      return { ids: [], total: 0, embarcados: 0, disponiveis: 0, error: error.message };
    }
    const page = (data || []) as ColabAtivoRow[];
    colabs.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const inactiveCc = await supabaseAdmin.from('gt_centros_custo').select('id').eq('ativo', false);
  if (inactiveCc.error) {
    return { ids: [], total: 0, embarcados: 0, disponiveis: 0, error: inactiveCc.error.message };
  }

  const inactiveCcIds = new Set((inactiveCc.data || []).map((r) => r.id as string));
  const ativos = colabs.filter(
    (c) => !c.centro_custo_id || !inactiveCcIds.has(c.centro_custo_id),
  );

  return {
    ids: ativos.map((c) => c.id),
    total: ativos.length,
    embarcados: ativos.filter((c) => c.status_embarque === 'embarcado').length,
    disponiveis: ativos.filter((c) => c.standby === true).length,
  };
}

async function paginarSelect<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ rows: T[]; error?: string }> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { rows };
}

/**
 * Eligible collaborators whose Man Schedule cell for today is exact `ON`
 * (never `ON*` / `*` / STB / DBA / UTR / DHC).
 */
export async function listarIdsEmbarcadosHoje(
  hoje = dataLocalISO(),
  eligibleIds?: string[],
): Promise<{
  ids: string[];
  error?: string;
}> {
  let eligibleList = eligibleIds;
  if (!eligibleList) {
    const ativos = await listarColaboradoresDashboardAtivos();
    if (ativos.error) return { ids: [], error: ativos.error };
    eligibleList = ativos.ids;
  }
  const eligible = new Set(eligibleList);
  if (eligible.size === 0) return { ids: [] };

  const [embRes, afRes] = await Promise.all([
    paginarSelect<{
      id: string;
      colaborador_id: string;
      tipo: string | null;
      data_embarque: string | null;
      data_desembarque: string | null;
      data_prevista_desembarque: string | null;
      observacoes: string | null;
    }>((from, to) =>
      supabaseAdmin
        .from('gt_historico_embarques')
        .select('id, colaborador_id, tipo, data_embarque, data_desembarque, data_prevista_desembarque, observacoes')
        .is('deleted_at', null)
        .lte('data_embarque', hoje)
        .range(from, to)
        .then((r) => ({ data: r.data as typeof r.data, error: r.error })),
    ),
    paginarSelect<{
      id: string;
      colaborador_id: string;
      tipo_afastamento: string | null;
      data_inicio: string | null;
      data_fim: string | null;
      data_prevista_retorno: string | null;
      motivo: string | null;
    }>((from, to) =>
      supabaseAdmin
        .from('gt_afastamentos')
        .select('id, colaborador_id, tipo_afastamento, data_inicio, data_fim, data_prevista_retorno, motivo')
        .is('deleted_at', null)
        .range(from, to)
        .then((r) => ({ data: r.data as typeof r.data, error: r.error })),
    ),
  ]);

  if (embRes.error) return { ids: [], error: embRes.error };
  if (afRes.error) return { ids: [], error: afRes.error };

  const byColab = new Map<string, EscalaEventoDia[]>();
  const push = (colabId: string, ev: EscalaEventoDia) => {
    if (!eligible.has(colabId)) return;
    const arr = byColab.get(colabId) || [];
    arr.push(ev);
    byColab.set(colabId, arr);
  };

  for (const row of embRes.rows) {
    push(row.colaborador_id, {
      id: row.id,
      tipo: row.tipo,
      data_embarque: row.data_embarque,
      data_desembarque: row.data_desembarque,
      data_prevista_desembarque: row.data_prevista_desembarque,
      observacoes: row.observacoes,
    });
  }

  for (const af of afRes.rows) {
    const isFerias =
      String(af.tipo_afastamento || '').toLowerCase().includes('ferias') ||
      String(af.tipo_afastamento || '').toLowerCase().includes('férias');
    push(af.colaborador_id, {
      id: af.id,
      tipo: isFerias ? 'ferias' : 'afastamento',
      data_embarque: af.data_inicio,
      data_desembarque: af.data_fim || af.data_prevista_retorno,
      observacoes: af.motivo,
    });
  }

  const ids: string[] = [];
  for (const [colabId, events] of byColab) {
    const code = dayCodeForCivilDay(events, hoje);
    if (isEmbarcadoPobDayCode(code)) ids.push(colabId);
  }
  return { ids };
}

const DOC_GROUP_SELECT =
  'id, colaborador_id, tipo_documento, subtipo, titulo, descricao, origem, data_emissao, data_validade, status_validacao, created_at';

/** Primary-only vencido/vencendo (obsolete siblings of a valid course do not count). */
async function countDocsPorValidadeCivil(
  colaboradorIds: string[],
  hoje: string,
  _limite: string,
): Promise<{ vencidos: number; vencendo: number; error?: string }> {
  void _limite;
  if (colaboradorIds.length === 0) return { vencidos: 0, vencendo: 0 };

  const docs: DocumentoAgrupavel[] = [];
  for (let i = 0; i < colaboradorIds.length; i += DOC_IN_CHUNK) {
    const part = colaboradorIds.slice(i, i + DOC_IN_CHUNK);
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('gt_documentos')
        .select(DOC_GROUP_SELECT)
        .in('colaborador_id', part)
        .is('deleted_at', null)
        .range(from, from + PAGE_SIZE - 1);
      if (error) return { vencidos: 0, vencendo: 0, error: error.message };
      const page = (data || []) as DocumentoAgrupavel[];
      docs.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  const summed = somarDocsPorStatusPrimario(docs, hoje);
  return { vencidos: summed.vencidos, vencendo: summed.vencendo };
}

export async function getDashboardData(): Promise<{
  success: boolean;
  data?: GTDashboardResumo;
  error?: string;
}> {
  try {
    const ativos = await listarColaboradoresDashboardAtivos();
    if (ativos.error) {
      console.error('Erro ao buscar colaboradores do dashboard:', ativos.error);
      return { success: false, error: ativos.error };
    }

    const hoje = dataLocalISO();
    const limite = adicionarDiasLocalISO(30);
    const [docs, asosPendentes, pob, alertas] = await Promise.all([
      countDocsPorValidadeCivil(ativos.ids, hoje, limite),
      supabaseAdmin
        .from('gt_documentos')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status_revisao', 'pendente_revisao'),
      listarIdsEmbarcadosHoje(hoje, ativos.ids),
      listarDocumentosAlertas({ colaboradorIds: ativos.ids }),
    ]);

    if (docs.error) {
      console.error('Erro ao contar documentos do dashboard:', docs.error);
      return { success: false, error: docs.error };
    }
    if (asosPendentes.error) {
      console.error('Erro ao contar ASOs pendentes:', asosPendentes.error);
      return { success: false, error: asosPendentes.error.message };
    }
    if (pob.error) {
      console.error('Erro ao contar embarcados (POB) do dashboard:', pob.error);
      return { success: false, error: pob.error };
    }

    return {
      success: true,
      data: {
        total_colaboradores: ativos.total,
        total_embarcados: pob.ids.length,
        total_disponiveis: ativos.disponiveis,
        total_docs_vencidos: docs.vencidos,
        total_docs_vencendo: docs.vencendo,
        total_docs_vencidos_historico: alertas.totais.vencidos_historico,
        asos_pendentes_revisao: asosPendentes.count || 0,
      },
    };
  } catch (error) {
    console.error('Erro inesperado no dashboard-service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
