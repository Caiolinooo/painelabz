'use client';

/**
 * Renderiza um KpiBoardSpec com widgets allowlisted.
 * Reusa GenerativeDashboard para metric/table/list/chart; markdown local.
 */
import React from 'react';
import GenerativeDashboard from '@/components/IA/GenerativeDashboard';
import type { IADashboardLayout } from '@/types/ia';
import type { KpiBoardSpec, KpiBoardWidget } from '@/lib/ia/kpi-board-shared';
import { boardSpecToLayout } from '@/lib/ia/kpi-board-shared';

interface Props {
  boardId?: string;
  title?: string;
  spec: KpiBoardSpec;
  revision?: number;
}

export default function KpiBoardRenderer({ boardId, title, spec, revision }: Props) {
  if (!spec?.widgets?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Nenhum widget neste quadro. Peça ao Companion: “monte um quadro KPI com minhas pendências”.
      </div>
    );
  }

  const layout: IADashboardLayout = boardSpecToLayout(spec, boardId);
  const markdownWidgets = spec.widgets.filter((w) => w.type === 'markdown');

  return (
    <div className="space-y-4">
      {(title || revision !== undefined) && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            {title || 'Quadro KPI'}
          </h2>
          {revision !== undefined && (
            <span className="text-xs text-gray-400">rev {revision}</span>
          )}
        </div>
      )}

      <GenerativeDashboard layout={layout} />

      {markdownWidgets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {markdownWidgets.map((w) => (
            <MarkdownWidgetCard key={w.id} widget={w} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarkdownWidgetCard({ widget }: { widget: KpiBoardWidget }) {
  const content =
    typeof widget.data === 'object' && widget.data && 'content' in (widget.data as object)
      ? String((widget.data as { content?: string }).content || '')
      : typeof widget.data === 'string'
        ? widget.data
        : '';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {widget.title && (
        <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {widget.title}
          </h4>
        </div>
      )}
      <div className="p-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
        {content || <span className="text-gray-400 italic">Sem conteúdo</span>}
      </div>
    </div>
  );
}
