/**
 * KPI Quadro Branco v1 — board store (Zod-validated spec)
 * Widgets allowlisted: metric | table | list | chart | markdown
 * dataSource refs allowlisted portal tools only — never secrets / free-form JS.
 */
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import type { IADashboardLayout, IADashboardWidget } from '@/types/ia';
import {
  ACTIVE_BOARD_STORAGE_KEY,
  KPI_DATASOURCE_ALLOWLIST,
  MAX_BOARD_TITLE,
  MAX_KPI_WIDGETS,
  boardSpecToLayout,
  type KpiBoardRow,
  type KpiBoardSpec,
  type KpiBoardVisibility,
  type KpiBoardWidget,
} from './kpi-board-shared';

export {
  ACTIVE_BOARD_STORAGE_KEY,
  KPI_DATASOURCE_ALLOWLIST,
  MAX_BOARD_TITLE,
  MAX_KPI_WIDGETS,
  boardSpecToLayout,
};
export type {
  KpiBoardRow,
  KpiBoardSpec,
  KpiBoardVisibility,
  KpiBoardWidget,
  KpiDataSourceTool,
} from './kpi-board-shared';

const secretLikeKey =
  /^(password|passwd|secret|token|api[_-]?key|authorization|bearer|connection[_-]?string|private[_-]?key)$/i;

function stripSecretKeys(value: unknown, depth = 0): unknown {
  if (depth > 6) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(value)) return '[redacted]';
    return value.slice(0, 4000);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => stripSecretKeys(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (secretLikeKey.test(k)) continue;
      out[k] = stripSecretKeys(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

const dataSourceSchema = z.object({
  tool: z.enum(KPI_DATASOURCE_ALLOWLIST as unknown as [string, ...string[]]),
  args: z.record(z.unknown()).optional().default({}),
});

const widgetBaseSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(['metric', 'table', 'list', 'chart', 'markdown']),
  title: z.string().max(120).optional().default(''),
  data: z.unknown().optional(),
  dataSource: dataSourceSchema.optional(),
  config: z.record(z.unknown()).optional(),
});

export const kpiBoardSpecSchema = z
  .object({
    version: z.literal(1).default(1),
    columns: z.number().int().min(1).max(4).optional().default(3),
    widgets: z.array(widgetBaseSchema).max(MAX_KPI_WIDGETS),
  })
  .superRefine((spec, ctx) => {
    if (!spec.widgets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Board precisa de ao menos 1 widget',
        path: ['widgets'],
      });
    }
    for (let i = 0; i < spec.widgets.length; i++) {
      const w = spec.widgets[i];
      if (w.data === undefined && !w.dataSource) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Widget ${w.id}: informe data ou dataSource`,
          path: ['widgets', i],
        });
      }
    }
  });

export function sanitizeBoardSpec(
  raw: unknown
): { ok: true; spec: KpiBoardSpec } | { ok: false; error: string } {
  const cleaned = stripSecretKeys(raw);
  const parsed = kpiBoardSpecSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const widgets = parsed.data.widgets.map((w) => ({
    ...w,
    data: w.data !== undefined ? stripSecretKeys(w.data) : undefined,
    dataSource: w.dataSource
      ? {
          tool: w.dataSource.tool,
          args: (stripSecretKeys(w.dataSource.args || {}) as Record<string, unknown>) || {},
        }
      : undefined,
    config: w.config ? (stripSecretKeys(w.config) as Record<string, unknown>) : undefined,
  }));
  return { ok: true, spec: { version: 1, columns: parsed.data.columns, widgets } };
}

/** Convert GenerativeDashboard / render_dashboard layout → BoardSpec */
export function layoutToBoardSpec(
  layout: IADashboardLayout | Record<string, unknown>
): KpiBoardSpec | null {
  const widgetsRaw =
    (layout as IADashboardLayout)?.widgets || (layout as { widgets?: unknown[] }).widgets;
  if (!Array.isArray(widgetsRaw) || widgetsRaw.length === 0) return null;

  const widgets = widgetsRaw.slice(0, MAX_KPI_WIDGETS).map(
    (w: IADashboardWidget | Record<string, unknown>, i: number) => {
      const type = String((w as IADashboardWidget).type || 'metric');
      const allowed = (['metric', 'table', 'list', 'chart', 'markdown'] as const).includes(
        type as 'metric'
      )
        ? (type as KpiBoardWidget['type'])
        : 'metric';
      return {
        id: String((w as IADashboardWidget).id || `w${i + 1}`),
        type: allowed,
        title: String((w as IADashboardWidget).title || ''),
        data: stripSecretKeys((w as IADashboardWidget).data),
        config: (w as IADashboardWidget).config
          ? (stripSecretKeys((w as IADashboardWidget).config) as Record<string, unknown>)
          : undefined,
      };
    }
  );

  const columns =
    Number((layout as IADashboardLayout).columns) ||
    (widgets.length > 2 ? 3 : Math.max(1, widgets.length));
  const result = sanitizeBoardSpec({
    version: 1,
    columns: Math.min(4, Math.max(1, columns)),
    widgets,
  });
  return result.ok ? result.spec : null;
}

export async function listKpiBoards(
  userId: string,
  opts?: { limit?: number }
): Promise<KpiBoardRow[]> {
  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(opts?.limit ?? 20);

  if (error) {
    console.warn('[KpiBoard] list error:', error.message);
    return [];
  }
  return (data || []) as KpiBoardRow[];
}

export async function getKpiBoard(userId: string, boardId: string): Promise<KpiBoardRow | null> {
  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .select('*')
    .eq('user_id', userId)
    .eq('id', boardId)
    .maybeSingle();

  if (error) {
    console.warn('[KpiBoard] get error:', error.message);
    return null;
  }
  return data as KpiBoardRow | null;
}

export async function getActiveKpiBoard(userId: string): Promise<KpiBoardRow | null> {
  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('[KpiBoard] getActive error:', error.message);
    return null;
  }
  if (data) return data as KpiBoardRow;

  const list = await listKpiBoards(userId, { limit: 1 });
  return list[0] || null;
}

async function clearActiveFlags(userId: string): Promise<void> {
  await supabaseAdmin
    .from('ia_kpi_boards')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);
}

export async function createKpiBoard(input: {
  userId: string;
  title: string;
  spec: unknown;
  visibility?: KpiBoardVisibility;
  setActive?: boolean;
}): Promise<{ board: KpiBoardRow | null; error?: string }> {
  const title = (input.title || 'Quadro KPI').trim().slice(0, MAX_BOARD_TITLE);
  const sanitized = sanitizeBoardSpec(input.spec);
  if (!sanitized.ok) return { board: null, error: sanitized.error };

  const setActive = input.setActive !== false;
  if (setActive) await clearActiveFlags(input.userId);

  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .insert({
      user_id: input.userId,
      title: title || 'Quadro KPI',
      spec: sanitized.spec,
      revision: 1,
      visibility: input.visibility || 'private',
      is_active: setActive,
    })
    .select()
    .single();

  if (error) {
    console.warn('[KpiBoard] create error:', error.message);
    return { board: null, error: error.message };
  }
  return { board: data as KpiBoardRow };
}

export async function updateKpiBoard(input: {
  userId: string;
  boardId: string;
  title?: string;
  spec?: unknown;
  visibility?: KpiBoardVisibility;
  setActive?: boolean;
}): Promise<{ board: KpiBoardRow | null; error?: string }> {
  const existing = await getKpiBoard(input.userId, input.boardId);
  if (!existing) return { board: null, error: 'Quadro não encontrado' };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    revision: (existing.revision || 1) + 1,
  };

  if (input.title !== undefined) {
    patch.title = String(input.title).trim().slice(0, MAX_BOARD_TITLE) || existing.title;
  }
  if (input.visibility) patch.visibility = input.visibility;
  if (input.spec !== undefined) {
    const sanitized = sanitizeBoardSpec(input.spec);
    if (!sanitized.ok) return { board: null, error: sanitized.error };
    patch.spec = sanitized.spec;
  }
  if (input.setActive) {
    await clearActiveFlags(input.userId);
    patch.is_active = true;
  }

  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .update(patch)
    .eq('id', input.boardId)
    .eq('user_id', input.userId)
    .select()
    .single();

  if (error) {
    console.warn('[KpiBoard] update error:', error.message);
    return { board: null, error: error.message };
  }
  return { board: data as KpiBoardRow };
}

export async function setActiveKpiBoard(
  userId: string,
  boardId: string
): Promise<KpiBoardRow | null> {
  const existing = await getKpiBoard(userId, boardId);
  if (!existing) return null;
  await clearActiveFlags(userId);
  const { data, error } = await supabaseAdmin
    .from('ia_kpi_boards')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', boardId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    console.warn('[KpiBoard] setActive error:', error.message);
    return null;
  }
  return data as KpiBoardRow;
}

/** Persist render_dashboard layout as board (create or update active) */
export async function upsertBoardFromDashboardLayout(input: {
  userId: string;
  layout: IADashboardLayout | Record<string, unknown>;
  title?: string;
}): Promise<KpiBoardRow | null> {
  const spec = layoutToBoardSpec(input.layout);
  if (!spec) return null;

  const title =
    input.title ||
    (typeof (input.layout as { title?: string }).title === 'string'
      ? (input.layout as { title?: string }).title
      : null) ||
    `Dashboard ${new Date().toLocaleDateString('pt-BR')}`;

  const active = await getActiveKpiBoard(input.userId);
  if (active && active.title.startsWith('Dashboard ')) {
    const { board } = await updateKpiBoard({
      userId: input.userId,
      boardId: active.id,
      title: title!,
      spec,
      setActive: true,
    });
    return board;
  }

  const { board } = await createKpiBoard({
    userId: input.userId,
    title: title!,
    spec,
    setActive: true,
  });
  return board;
}

export function buildOpenKpiBoardCommands(boardId: string, title?: string) {
  return [
    {
      action: 'OPEN_KPI_BOARD' as const,
      target: boardId,
      label: title ? `Abrindo quadro: ${title}` : 'Abrindo quadro KPI',
      value: { boardId },
    },
    {
      action: 'NAVIGATE' as const,
      target: '/kpi',
      label: 'Abrindo /kpi',
    },
  ];
}

/** Brief index for Companion / Chat system prompts */
export async function buildKpiBoardsPromptBlock(userId: string): Promise<string> {
  const boards = await listKpiBoards(userId, { limit: 8 });
  const forbid =
    `PROIBIDO ao usuário pedir alterar KPI/minigame/HTML: dizer “não consigo injetar”, dump HTML/JS, “salve como .html” ou abrir fora do portal. ` +
    `Correto: widgets allowlisted + tools + abrir /kpi.\n`;

  if (!boards.length) {
    return (
      `\n\n## Quadros KPI (quadro branco)\n` +
      forbid +
      `Nenhum quadro salvo. Use \`criar_quadro_kpi\` ou \`render_dashboard\` para montar widgets (metric/table/list/chart/markdown) e depois \`abrir_quadro_kpi\`.\n` +
      `dataSource só com tools allowlisted (ex: buscar_kpis_sistema).\n`
    );
  }

  const lines = boards.map(
    (b) =>
      `- ${b.is_active ? '[ATIVO] ' : ''}${b.title} (id=${b.id}, rev=${b.revision}, widgets=${
        Array.isArray((b.spec as KpiBoardSpec)?.widgets)
          ? (b.spec as KpiBoardSpec).widgets.length
          : '?'
      })`
  );

  return (
    `\n\n## Quadros KPI (quadro branco)\n` +
    forbid +
    `Quadros persistidos do usuário. Use \`listar_quadros_kpi\` / \`atualizar_quadro_kpi\` / \`abrir_quadro_kpi\`.\n` +
    `Após criar/atualizar, chame \`abrir_quadro_kpi\` (ou navegar_portal kpi) para abrir /kpi.\n` +
    lines.join('\n') +
    `\n`
  );
}
