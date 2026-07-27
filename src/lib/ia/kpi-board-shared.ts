/**
 * Client-safe KPI board types + pure helpers (no Supabase).
 * Server CRUD lives in `kpi-board.ts`.
 */
import type { IADashboardLayout, IADashboardWidget } from '@/types/ia';

export const MAX_KPI_WIDGETS = 24;
export const MAX_BOARD_TITLE = 120;
export const ACTIVE_BOARD_STORAGE_KEY = 'abz_kpi_active_board_id';

export const KPI_DATASOURCE_ALLOWLIST = [
  'buscar_kpis_sistema',
  'analisar_kpis_negocio',
  'buscar_sinais_kpi_comunicacao',
  'buscar_dados_usuario',
  'buscar_reembolsos',
  'buscar_ferias',
  'buscar_epis',
  'buscar_tripulantes',
  'buscar_escalas',
  'buscar_cursos_disponiveis',
  'buscar_progresso_academy',
  'meus_emails',
  'meu_calendario',
  'minhas_conversas_teams',
] as const;

export type KpiDataSourceTool = (typeof KPI_DATASOURCE_ALLOWLIST)[number];

export type KpiWidgetType = 'metric' | 'table' | 'list' | 'chart' | 'markdown';

export interface KpiBoardWidget {
  id: string;
  type: KpiWidgetType;
  title?: string;
  data?: unknown;
  dataSource?: {
    tool: string;
    args?: Record<string, unknown>;
  };
  config?: Record<string, unknown>;
}

export interface KpiBoardSpec {
  version: 1;
  columns?: number;
  widgets: KpiBoardWidget[];
}

export type KpiBoardVisibility = 'private' | 'team' | 'org';

export interface KpiBoardRow {
  id: string;
  user_id: string;
  title: string;
  spec: KpiBoardSpec;
  revision: number;
  visibility: KpiBoardVisibility;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** BoardSpec → GenerativeDashboard layout (skips markdown) */
export function boardSpecToLayout(spec: KpiBoardSpec, boardId?: string): IADashboardLayout {
  return {
    id: boardId || 'kpi-board',
    columns: spec.columns || 3,
    widgets: (spec.widgets || [])
      .filter((w) => w.type !== 'markdown')
      .map((w) => ({
        id: w.id,
        type: w.type as IADashboardWidget['type'],
        title: w.title || '',
        data: w.data,
        config: w.config,
      })),
  };
}
