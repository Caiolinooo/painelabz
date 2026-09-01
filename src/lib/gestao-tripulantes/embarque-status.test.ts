import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dayCodeForCivilDay,
  hasAsteriskScheduleCode,
  isEmbarcadoPobDayCode,
  isRotacaoPrevista,
  parseGtDashboardKpi,
  pickEventForCivilDay,
  scheduleDisplayCode,
  type EscalaEventoDia,
} from './embarque-status';

describe('isEmbarcadoPobDayCode', () => {
  it('counts exact ON only', () => {
    assert.equal(isEmbarcadoPobDayCode('ON'), true);
    assert.equal(isEmbarcadoPobDayCode('on'), true);
    assert.equal(isEmbarcadoPobDayCode(' ON '), true);
  });

  it('rejects asterisk and other Man Schedule codes', () => {
    assert.equal(isEmbarcadoPobDayCode('ON*'), false);
    assert.equal(isEmbarcadoPobDayCode('*'), false);
    assert.equal(isEmbarcadoPobDayCode('STB'), false);
    assert.equal(isEmbarcadoPobDayCode('DBA'), false);
    assert.equal(isEmbarcadoPobDayCode('UTR'), false);
    assert.equal(isEmbarcadoPobDayCode('DHC'), false);
    assert.equal(isEmbarcadoPobDayCode('FI'), false);
    assert.equal(isEmbarcadoPobDayCode('OFF-C'), false);
    assert.equal(isEmbarcadoPobDayCode('-'), false);
    assert.equal(isEmbarcadoPobDayCode(''), false);
  });
});

describe('hasAsteriskScheduleCode', () => {
  it('detects ON* and bare *', () => {
    assert.equal(hasAsteriskScheduleCode('ON*'), true);
    assert.equal(hasAsteriskScheduleCode('*'), true);
    assert.equal(hasAsteriskScheduleCode('ON'), false);
  });
});

describe('scheduleDisplayCode / previsto', () => {
  it('maps previsto and the LGP marker to ON*', () => {
    assert.equal(scheduleDisplayCode('previsto'), 'ON*');
    assert.equal(scheduleDisplayCode('normal', 'GT_EMBARQUE=previsto | RTPE: Programado'), 'ON*');
    assert.equal(isRotacaoPrevista('normal', 'GT_EMBARQUE=previsto'), true);
    assert.equal(isRotacaoPrevista('normal', 'GT_EMBARQUE=real'), false);
    assert.equal(scheduleDisplayCode('normal', 'GT_EMBARQUE=real'), 'ON');
  });
});

describe('parseGtDashboardKpi', () => {
  it('accepts known KPI keys only', () => {
    assert.equal(parseGtDashboardKpi('embarcados'), 'embarcados');
    assert.equal(parseGtDashboardKpi('docs_vencidos'), 'docs_vencidos');
    assert.equal(parseGtDashboardKpi('nope'), '');
    assert.equal(parseGtDashboardKpi(null), '');
  });
});

describe('pickEventForCivilDay', () => {
  const hoje = '2026-09-01';
  const events: EscalaEventoDia[] = [
    {
      id: 'prev',
      tipo: 'previsto',
      data_embarque: '2026-08-28',
      data_desembarque: '2026-09-10',
      observacoes: 'GT_EMBARQUE=previsto',
    },
    {
      id: 'on',
      tipo: 'normal',
      data_embarque: '2026-09-01',
      data_desembarque: '2026-09-20',
      observacoes: 'GT_EMBARQUE=real',
    },
  ];

  it('prefers the rotation that starts today over a covering previsto', () => {
    const picked = pickEventForCivilDay(events, hoje);
    assert.equal(picked?.id, 'on');
    assert.equal(dayCodeForCivilDay(events, hoje), 'ON');
    assert.equal(isEmbarcadoPobDayCode(dayCodeForCivilDay(events, hoje)), true);
  });

  it('returns ON* when only a predicted rotation covers the day', () => {
    const onlyPrev = events.filter((e) => e.id === 'prev');
    assert.equal(dayCodeForCivilDay(onlyPrev, '2026-08-30'), 'ON*');
    assert.equal(isEmbarcadoPobDayCode(dayCodeForCivilDay(onlyPrev, '2026-08-30')), false);
  });
});
