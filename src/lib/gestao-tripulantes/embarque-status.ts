import { DEFAULT_TIPOS_EVENTO_ESCALA, mapDbTipoToCodigo } from '@/lib/gestao-tripulantes/escala-tipos';

/** Machine marker persisted on LGP rows without Embarque Real. */
export const GT_EMBARQUE_MARKER_PREVISTO = 'GT_EMBARQUE=previsto';
export const GT_EMBARQUE_MARKER_REAL = 'GT_EMBARQUE=real';

export const GT_DASHBOARD_KPIS = ['colaboradores', 'embarcados', 'disponiveis', 'docs_vencidos'] as const;
export type GtDashboardKpi = (typeof GT_DASHBOARD_KPIS)[number];

export interface EscalaEventoDia {
  id?: string;
  tipo: string | null;
  data_embarque: string | null;
  data_desembarque: string | null;
  data_prevista_desembarque?: string | null;
  observacoes?: string | null;
}

const OPEN_END_FALLBACK_DAYS = 90;

export function parseGtDashboardKpi(raw: string | null | undefined): GtDashboardKpi | '' {
  const key = String(raw || '').trim().toLowerCase();
  if ((GT_DASHBOARD_KPIS as readonly string[]).includes(key)) return key as GtDashboardKpi;
  return '';
}

export function normalizeScheduleDayCode(code: string | null | undefined): string {
  return String(code || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/** ON*, bare *, UTR*, etc. — never POB. */
export function hasAsteriskScheduleCode(code: string | null | undefined): boolean {
  return normalizeScheduleDayCode(code).includes('*');
}

/**
 * People on board (POB / "Embarcados Agora").
 * Exact `ON` only. `ON*`, `*`, STB, DBA, FI, OFF-C, TRE, FER, UTR, DHC, `-` do not count.
 */
export function isEmbarcadoPobDayCode(code: string | null | undefined): boolean {
  if (hasAsteriskScheduleCode(code)) return false;
  return normalizeScheduleDayCode(code) === 'ON';
}

export function isRotacaoPrevista(
  tipo: string | null | undefined,
  observacoes?: string | null,
): boolean {
  const obs = String(observacoes || '');
  if (obs.includes(GT_EMBARQUE_MARKER_PREVISTO)) return true;
  const codigo = mapDbTipoToCodigo(tipo);
  if (codigo === 'previsto') return true;
  return hasAsteriskScheduleCode(tipo);
}

export function scheduleDisplayCode(
  rotationType: string | null | undefined,
  observacoes?: string | null,
): string {
  if (isRotacaoPrevista(rotationType, observacoes)) return 'ON*';
  const codigo = mapDbTipoToCodigo(rotationType);
  const seed = DEFAULT_TIPOS_EVENTO_ESCALA.find((t) => t.codigo === codigo);
  if (seed) return seed.display_code;
  if (codigo === 'normal') return 'ON';
  if (codigo === 'offc') return 'OFF-C';
  return String(rotationType || '').toUpperCase();
}

function parseYmdLocal(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd).trim());
  if (!m) return null;
  const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ymdOf(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function eventCoversCivilDay(ev: EscalaEventoDia, ymd: string): boolean {
  const start = parseYmdLocal(ev.data_embarque);
  if (!start) return false;
  const day = parseYmdLocal(ymd);
  if (!day) return false;
  day.setHours(12, 0, 0, 0);

  const endRaw = ev.data_desembarque || ev.data_prevista_desembarque;
  const end = endRaw
    ? parseYmdLocal(endRaw)
    : new Date(start.getTime() + OPEN_END_FALLBACK_DAYS * 24 * 60 * 60 * 1000);
  if (!end) return false;
  end.setHours(23, 59, 59, 999);
  return day >= start && day <= end;
}

function isSpecificRotationTipo(tipo: string | null | undefined): boolean {
  const codigo = mapDbTipoToCodigo(tipo);
  return codigo !== 'normal' && codigo !== '';
}

/** Same scoring idea as Man Schedule cell pick: start-on-day, then specific tipo, then persisted id. */
export function pickEventForCivilDay(
  events: EscalaEventoDia[],
  ymd: string,
): EscalaEventoDia | null {
  let best: EscalaEventoDia | null = null;
  let bestScore = -1;
  for (const ev of events) {
    if (!eventCoversCivilDay(ev, ymd)) continue;
    const start = parseYmdLocal(ev.data_embarque);
    const startsToday = start ? ymdOf(start) === ymd : false;
    const score = (startsToday ? 1000 : 10) + (isSpecificRotationTipo(ev.tipo) ? 50 : 0) + (ev.id ? 5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = ev;
    }
  }
  return best;
}

export function dayCodeForCivilDay(events: EscalaEventoDia[], ymd: string): string {
  const picked = pickEventForCivilDay(events, ymd);
  if (!picked) return '';
  return scheduleDisplayCode(picked.tipo, picked.observacoes);
}

export function composeLgpObservacoes(realizado: boolean, rtpeStatus?: string | null): string {
  const marker = realizado ? GT_EMBARQUE_MARKER_REAL : GT_EMBARQUE_MARKER_PREVISTO;
  const rtpe = rtpeStatus ? `RTPE: ${rtpeStatus}` : '';
  return [marker, rtpe].filter(Boolean).join(' | ');
}
