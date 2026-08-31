import { supabaseAdmin } from '@/lib/supabase';
import type { GTDashboardResumo } from '@/types/gestao-tripulantes';
import { listarDocumentosAlertas } from '@/lib/gestao-tripulantes/documentos-alertas';

const PAGE_SIZE = 1000;

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

    const [docs, asosPendentes] = await Promise.all([
      listarDocumentosAlertas({ colaboradorIds: ativos.ids }),
      supabaseAdmin
        .from('gt_documentos')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status_revisao', 'pendente_revisao'),
    ]);

    if (asosPendentes.error) {
      console.error('Erro ao contar ASOs pendentes:', asosPendentes.error);
      return { success: false, error: asosPendentes.error.message };
    }

    return {
      success: true,
      data: {
        total_colaboradores: ativos.total,
        total_embarcados: ativos.embarcados,
        total_disponiveis: ativos.disponiveis,
        total_docs_vencidos: docs.totais.vencidos_vigentes,
        total_docs_vencendo: docs.totais.vencendo_vigentes,
        total_docs_vencidos_historico: docs.totais.vencidos_historico,
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
