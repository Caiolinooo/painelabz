'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';

type ScheduleViewport = 'day' | 'week';

interface Props {
  loading?: boolean;
  pobCount: number;
  viewport?: ScheduleViewport;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function stepTitle(
  viewport: ScheduleViewport,
  direction: 'prev' | 'next',
  t: (key: string, defaultValue?: string) => string,
): string {
  switch (viewport) {
    case 'day':
      return direction === 'prev'
        ? t('manSchedule.prevDay', 'Dia anterior')
        : t('manSchedule.nextDay', 'Próximo dia');
    case 'week':
      return direction === 'prev'
        ? t('manSchedule.prevWeeks', 'Semana anterior')
        : t('manSchedule.nextWeeks', 'Próxima semana');
    default: {
      const _never: never = viewport;
      return _never;
    }
  }
}

export default function ManScheduleTimelineNav({
  loading = false,
  pobCount,
  viewport = 'week',
  onPrev,
  onNext,
  onToday,
}: Props) {
  const { t } = useI18n();
  const prevTitle = stepTitle(viewport, 'prev', t);
  const nextTitle = stepTitle(viewport, 'next', t);
  const todayTitle = t('manSchedule.currentWeek', 'Ir para hoje');
  const todayLabel = t('manSchedule.today', 'Hoje');
  const pobLabel = t('manSchedule.todayPob', { count: pobCount }, `Hoje: ${pobCount}P a bordo`);

  return (
    <div className="relative z-20 flex items-center gap-1 flex-shrink-0 self-end h-[34px] pointer-events-auto">
      <button
        type="button"
        onClick={onPrev}
        disabled={loading}
        title={prevTitle}
        aria-label={prevTitle}
        className="px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition text-sm font-bold"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onToday}
        disabled={loading}
        title={todayTitle}
        aria-label={todayLabel}
        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition font-semibold text-xs whitespace-nowrap"
      >
        {todayLabel}
      </button>
      <span
        data-testid="man-schedule-today-pob"
        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold whitespace-nowrap h-[34px] flex items-center"
        title={t('manSchedule.todayPobHint', 'Pessoas com ON hoje (sem asterisco)')}
      >
        {pobLabel}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        title={nextTitle}
        aria-label={nextTitle}
        className="px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition text-sm font-bold"
      >
        ›
      </button>
    </div>
  );
}
