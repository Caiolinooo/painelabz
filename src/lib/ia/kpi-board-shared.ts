/**
 * Client-safe KPI board types + pure helpers (no Supabase).
 * Server CRUD lives in `kpi-board.ts`.
 */
import type { IADashboardLayout, IADashboardWidget } from '@/types/ia';

export const MAX_KPI_WIDGETS = 24;
export const MAX_BOARD_TITLE = 120;
export const MAX_HTML_SANDBOX_BYTES = 100_000;
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

/** html_sandbox = ADMIN-only sandboxed iframe (never parent origin / dangerouslySetInnerHTML) */
export type KpiWidgetType = 'metric' | 'table' | 'list' | 'chart' | 'markdown' | 'html_sandbox';

export const KPI_WIDGET_TYPES = [
  'metric',
  'table',
  'list',
  'chart',
  'markdown',
  'html_sandbox',
] as const satisfies readonly KpiWidgetType[];

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

/** BoardSpec → GenerativeDashboard layout (skips markdown + html_sandbox) */
export function boardSpecToLayout(spec: KpiBoardSpec, boardId?: string): IADashboardLayout {
  return {
    id: boardId || 'kpi-board',
    columns: spec.columns || 3,
    widgets: (spec.widgets || [])
      .filter((w) => w.type !== 'markdown' && w.type !== 'html_sandbox')
      .map((w) => ({
        id: w.id,
        type: w.type as IADashboardWidget['type'],
        title: w.title || '',
        data: w.data,
        config: w.config,
      })),
  };
}

export function extractHtmlSandboxSrcdoc(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.srcdoc === 'string') return o.srcdoc;
    if (typeof o.html === 'string') return o.html;
    if (typeof o.content === 'string') return o.content;
  }
  return '';
}

/** Wrap admin HTML for sandboxed iframe (no same-origin, capped CSP). */
export function wrapHtmlSandboxSrcdoc(rawHtml: string): string {
  const csp =
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; " +
    "img-src data: blob:; font-src data:; media-src 'none'; connect-src 'none'; " +
    "frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';";
  const body = String(rawHtml || '');
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"/>` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}"/>` +
    `<style>html,body{margin:0;padding:8px;font-family:system-ui,sans-serif;}</style>` +
    `</head><body>${body}</body></html>`
  );
}
