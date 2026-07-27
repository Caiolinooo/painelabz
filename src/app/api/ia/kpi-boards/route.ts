/**
 * API: /api/ia/kpi-boards
 * GET  — list boards (or ?active=1 / ?id=uuid with resolve)
 * POST — create board
 * PATCH — update / set active
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import {
  createKpiBoard,
  getActiveKpiBoard,
  getKpiBoard,
  listKpiBoards,
  setActiveKpiBoard,
  updateKpiBoard,
  type KpiBoardSpec,
  KPI_DATASOURCE_ALLOWLIST,
} from '@/lib/ia/kpi-board';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function resolveWidgetData(
  spec: KpiBoardSpec,
  userId: string,
  userRole: string
): Promise<KpiBoardSpec> {
  const { executeToolCall } = await import('@/lib/ia/tools');
  const widgets = [];

  for (const w of spec.widgets) {
    if (!w.dataSource) {
      widgets.push(w);
      continue;
    }
    const tool = w.dataSource.tool;
    if (!(KPI_DATASOURCE_ALLOWLIST as readonly string[]).includes(tool)) {
      widgets.push({
        ...w,
        data: w.data ?? { error: `dataSource não allowlisted: ${tool}` },
      });
      continue;
    }
    try {
      const raw = await executeToolCall(tool, w.dataSource.args || {}, userRole, userId);
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        /* keep string */
      }
      widgets.push({
        ...w,
        data: w.type === 'markdown'
          ? { content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2).slice(0, 8000) }
          : w.data ?? adaptToolResultToWidget(w.type, parsed),
      });
    } catch (err) {
      widgets.push({
        ...w,
        data: w.data ?? {
          error: err instanceof Error ? err.message : 'Falha ao resolver dataSource',
        },
      });
    }
  }

  return { ...spec, widgets };
}

function adaptToolResultToWidget(type: string, parsed: unknown): unknown {
  if (type === 'metric') {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const o = parsed as Record<string, unknown>;
      if (o.value !== undefined) return o;
      // Heuristic: first numeric field
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'number') return { value: v, label: k };
      }
    }
    return { value: '—', label: 'Resultado' };
  }
  if (type === 'table') {
    if (Array.isArray(parsed)) {
      const rows = parsed.slice(0, 50);
      const keys = rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0] as object).slice(0, 8) : [];
      return {
        columns: keys.map((k) => ({ key: k, label: k })),
        rows,
      };
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      const arr = (o.data || o.items || o.results || o.memorias || o.skills) as unknown;
      if (Array.isArray(arr)) return adaptToolResultToWidget('table', arr);
    }
  }
  if (type === 'list') {
    if (Array.isArray(parsed)) {
      return {
        items: parsed.slice(0, 30).map((item, i) => {
          if (typeof item === 'string') return { id: i, title: item };
          const o = item as Record<string, unknown>;
          return {
            id: o.id ?? i,
            title: String(o.title || o.nome || o.name || o.label || o.assunto || 'Item'),
            subtitle: String(o.subtitle || o.status || o.email || ''),
            status: o.status === 'urgent' ? 'urgent' : undefined,
          };
        }),
      };
    }
  }
  if (type === 'chart') {
    if (Array.isArray(parsed)) {
      return {
        type: 'bar',
        items: parsed.slice(0, 24).map((item, i) => {
          if (typeof item === 'number') return { name: String(i + 1), value: item };
          const o = item as Record<string, unknown>;
          return {
            name: String(o.name || o.label || o.mes || i + 1),
            value: Number(o.value ?? o.total ?? o.count ?? 0),
          };
        }),
      };
    }
  }
  if (type === 'markdown') {
    return {
      content: typeof parsed === 'string' ? parsed : '```json\n' + JSON.stringify(parsed, null, 2).slice(0, 6000) + '\n```',
    };
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const userId = tokenResult.payload.userId as string;
    const role = String(tokenResult.payload.role || 'USER');
    const id = request.nextUrl.searchParams.get('id');
    const active = request.nextUrl.searchParams.get('active') === '1';
    const resolve = request.nextUrl.searchParams.get('resolve') !== '0';

    let board = null;
    if (id) {
      board = await getKpiBoard(userId, id);
    } else if (active) {
      board = await getActiveKpiBoard(userId);
    } else {
      const boards = await listKpiBoards(userId, { limit: 30 });
      return NextResponse.json({ success: true, boards });
    }

    if (!board) {
      return NextResponse.json({ error: 'Quadro não encontrado' }, { status: 404 });
    }

    let spec = board.spec as KpiBoardSpec;
    if (resolve) {
      spec = await resolveWidgetData(spec, userId, role);
    }

    return NextResponse.json({
      success: true,
      board: { ...board, spec },
    });
  } catch (err) {
    console.error('[API KPI Boards GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const userId = tokenResult.payload.userId as string;
    const body = await request.json();
    const { board, error } = await createKpiBoard({
      userId,
      title: body.title || 'Quadro KPI',
      spec: body.spec,
      visibility: body.visibility,
      setActive: body.setActive !== false,
    });
    if (!board) {
      return NextResponse.json({ error: error || 'Falha ao criar' }, { status: 400 });
    }
    return NextResponse.json({ success: true, board });
  } catch (err) {
    console.error('[API KPI Boards POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const userId = tokenResult.payload.userId as string;
    const body = await request.json();
    const boardId = String(body.id || body.boardId || '');
    if (!boardId) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }

    if (body.setActive && body.spec === undefined && body.title === undefined) {
      const board = await setActiveKpiBoard(userId, boardId);
      if (!board) return NextResponse.json({ error: 'Quadro não encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, board });
    }

    const { board, error } = await updateKpiBoard({
      userId,
      boardId,
      title: body.title,
      spec: body.spec,
      visibility: body.visibility,
      setActive: body.setActive,
    });
    if (!board) {
      return NextResponse.json({ error: error || 'Falha ao atualizar' }, { status: 400 });
    }
    return NextResponse.json({ success: true, board });
  } catch (err) {
    console.error('[API KPI Boards PATCH]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
