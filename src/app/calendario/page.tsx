'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FiInfo } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { MIOCalendarEvent } from '@/types/mio';
import { fetchWithToken } from '@/lib/tokenStorage';


interface CompanyEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay?: boolean;
}

// Define the structure for a holiday
interface Holiday {
  date: string; // Format: YYYY-MM-DD
  name: string;
  type: string;
  description?: string;
  source?: string;
}

// Define Macaé holidays
const MACAE_HOLIDAYS: Omit<Holiday, 'date'>[] = [
  { name: 'São Jorge', type: 'MUNICIPAL', description: 'Feriado Municipal de Macaé' },
  { name: 'São João Batista', type: 'MUNICIPAL', description: 'Feriado Municipal de Macaé' },
  { name: 'Aniversário de Macaé', type: 'MUNICIPAL', description: 'Feriado Municipal de Macaé' },
  { name: 'Consciência Negra', type: 'MUNICIPAL', description: 'Feriado Municipal/Estadual (RJ)' },
];

// Define UK holidays
const UK_HOLIDAYS: Omit<Holiday, 'date'>[] = [
  { name: 'New Year\'s Day', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Good Friday', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Easter Monday', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Early May Bank Holiday', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Spring Bank Holiday', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Summer Bank Holiday', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Christmas Day', type: 'UK', description: 'UK Bank Holiday' },
  { name: 'Boxing Day', type: 'UK', description: 'UK Bank Holiday' },
];

// Helpers
const getMacaeHolidayDate = (holidayName: string, year: number): string | null => {
  switch (holidayName) {
    case 'São Jorge': return `${year}-04-23`;
    case 'São João Batista': return `${year}-06-24`;
    case 'Aniversário de Macaé': return `${year}-07-29`;
    case 'Consciência Negra': return `${year}-11-20`;
    default: return null;
  }
};

const getUKHolidayDate = (holidayName: string, year: number): string | null => {
  switch (holidayName) {
    case 'New Year\'s Day': return `${year}-01-01`;
    case 'Good Friday': return year === 2024 ? '2024-03-29' : year === 2025 ? '2025-04-18' : `${year}-04-10`;
    case 'Easter Monday': return year === 2024 ? '2024-04-01' : year === 2025 ? '2025-04-21' : `${year}-04-13`;
    case 'Early May Bank Holiday': return `${year}-05-06`;
    case 'Spring Bank Holiday': return `${year}-05-27`;
    case 'Summer Bank Holiday': return `${year}-08-26`;
    case 'Christmas Day': return `${year}-12-25`;
    case 'Boxing Day': return `${year}-12-26`;
    default: return null;
  }
};

// APIs
const BRASIL_API_URL = 'https://brasilapi.com.br/api/feriados/v1/';
const SCRAPE_API_URL = '/api/scrape-holidays';

// Static Fallback
const BRAZILIAN_HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    { date: '2024-01-01', name: 'Confraternização Universal', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-02-13', name: 'Carnaval', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-04-21', name: 'Tiradentes', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-05-01', name: 'Dia do Trabalho', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-05-30', name: 'Corpus Christi', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-09-07', name: 'Independência do Brasil', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-11-02', name: 'Finados', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-11-15', name: 'Proclamação da República', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2024-12-25', name: 'Natal', type: 'NATIONAL', description: 'Feriado Nacional' }
  ],
  2025: [
    { date: '2025-01-01', name: 'Confraternização Universal', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-03-04', name: 'Carnaval', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-04-21', name: 'Tiradentes', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-05-01', name: 'Dia do Trabalho', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-06-19', name: 'Corpus Christi', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-09-07', name: 'Independência do Brasil', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-11-02', name: 'Finados', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-11-15', name: 'Proclamação da República', type: 'NATIONAL', description: 'Feriado Nacional' },
    { date: '2025-12-25', name: 'Natal', type: 'NATIONAL', description: 'Feriado Nacional' }
  ]
};

async function fetchBrasilApiHolidays(year: number): Promise<Holiday[]> {
  const url = `${BRASIL_API_URL}${year}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const data = await response.json();
  return data.map((h: any) => ({
    date: h.date,
    name: h.name,
    type: h.type.toUpperCase(),
  }));
}

async function fetchScrapedHolidays(year: number): Promise<Holiday[]> {
  const url = `${SCRAPE_API_URL}?year=${year}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const result = await response.json();
  if (!result.success) throw new Error('Unsuccessful');
  return result.data;
}

export default function CalendarioPage() {
  const { t, locale } = useI18n();
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([]);
  const [mioEvents, setMioEvents] = useState<MIOCalendarEvent[]>([]);
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([]);
  const [companyConfig, setCompanyConfig] = useState({ marker_color: '#6339F5' });
  const [viewDate, setViewDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = viewDate.getFullYear();

  // Load MIO Events
  useEffect(() => {
    const loadMio = async () => {
      try {
        const res = await fetchWithToken('/api/mio/calendar');
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setMioEvents(data.events);
        }
      } catch (err) {
        console.error('MIO Calendar Error:', err);
      }
    };
    loadMio();
  }, [currentYear]);

  // Load Company Config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetchWithToken('/api/admin/calendar/company/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.marker_color) setCompanyConfig({ marker_color: data.marker_color });
        }
      } catch (err) {
        console.error('Company Config Error:', err);
      }
    };
    loadConfig();
  }, []);

  // Load Company Events
  useEffect(() => {
    const loadCompanyEvents = async () => {
      try {
        // Fetch 90 days to cover current view and a bit beyond
        const res = await fetchWithToken('/api/calendar/company/events?rangeDays=90');
        const data = await res.json();
        if (data.events) {
          setCompanyEvents(data.events);
        }
      } catch (err) {
        console.error('Company Events Error:', err);
      }
    };
    loadCompanyEvents();
  }, [currentYear]);

  // Load Holidays
  useEffect(() => {
    const loadHolidays = async () => {
      setLoading(true);
      setError(null);
      let national: Holiday[] = [];
      try {
        if (locale === 'en-US') {
          const uk: Holiday[] = [];
          UK_HOLIDAYS.forEach(h => {
            const d = getUKHolidayDate(h.name, currentYear);
            if (d) uk.push({ ...h, date: d });
          });
          national = uk;
        } else {
          try {
            national = await fetchBrasilApiHolidays(currentYear);
          } catch {
            try {
              national = await fetchScrapedHolidays(currentYear);
            } catch {
              national = BRAZILIAN_HOLIDAYS[currentYear] || BRAZILIAN_HOLIDAYS[2024];
            }
          }
        }

        const holidaysMap = new Map<string, Holiday>();
        national.forEach(h => holidaysMap.set(h.date + h.name, h));

        if (locale === 'pt-BR') {
          MACAE_HOLIDAYS.forEach(h => {
            const d = getMacaeHolidayDate(h.name, currentYear);
            if (d) holidaysMap.set(d + h.name, { ...h, date: d });
          });
        }

        const sorted = Array.from(holidaysMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        setAllHolidays(sorted);
      } catch (e: any) {
        setError(e.message);
        setAllHolidays([]);
      } finally {
        setLoading(false);
      }
    };
    loadHolidays();
  }, [currentYear, locale, t]);

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate && (activeStartDate.getFullYear() !== viewDate.getFullYear() || activeStartDate.getMonth() !== viewDate.getMonth())) {
      setViewDate(activeStartDate);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    const holidays = allHolidays.filter(h => h.date === dStr);
    const mio = mioEvents.filter(e => e.start.startsWith(dStr));
    const company = companyEvents.filter(e => e.start.startsWith(dStr));
    return { holidays, mio, company };
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const { holidays, mio, company } = getEventsForDate(date);
    if (!holidays.length && !mio.length && !company.length) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex justify-center gap-1 flex-wrap max-w-full px-1">
        {holidays.length > 0 && (
          <div
            className={`h-1.5 w-1.5 rounded-full ${holidays.some(h => h.type === 'MUNICIPAL') ? 'bg-orange-500' : 'bg-blue-500'}`}
            title={holidays.map(h => h.name).join(', ')}
          ></div>
        )}
        {mio.map(e => (
          <div
            key={e.id}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: e.color || '#6339F5' }}
            title={`${e.title}\n${e.description || ''}`}
          ></div>
        ))}
        {company.map(e => (
          <div
            key={e.id}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: companyConfig.marker_color }}
            title={`${e.summary}\n${e.description || ''}`}
          ></div>
        ))}
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const { holidays, mio, company } = getEventsForDate(date);
    return (holidays.length || mio.length || company.length) ? 'relative font-semibold' : null;
  };

  const eventsThisMonth = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();

    const hList = allHolidays.filter(h => {
      const [hy, hm, hd] = h.date.split('-').map(Number);
      const d = new Date(Date.UTC(hy, hm - 1, hd));
      return d.getUTCMonth() === m && d.getUTCFullYear() === y;
    }).map(h => ({ ...h, source: 'holiday', color: h.type === 'MUNICIPAL' ? '#f97316' : '#3b82f6' }));

    const mList = mioEvents.filter(e => {
      const d = new Date(e.start);
      return d.getMonth() === m && d.getFullYear() === y;
    }).map(e => ({
      date: e.start.split('T')[0],
      name: e.title,
      type: e.type.toUpperCase(),
      description: e.description,
      source: 'mio',
      color: e.color
    }));

    const cList = companyEvents.filter(e => {
      const d = new Date(e.start);
      return d.getMonth() === m && d.getFullYear() === y;
    }).map(e => ({
      date: e.start.split('T')[0],
      name: e.summary,
      type: 'EMPRESA',
      description: e.description,
      source: 'company',
      color: companyConfig.marker_color
    }));

    return [...hList, ...mList, ...cList].sort((a, b) => a.date.localeCompare(b.date));
  }, [allHolidays, mioEvents, companyEvents, viewDate, companyConfig.marker_color]);

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-2">{t('calendario.title')}</h1>
      <p className="text-gray-600 mb-6">{t('calendario.description')}</p>

      {error && !loading && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-md flex items-center gap-2">
          <FiInfo /> <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg shadow-md">
          {loading && <p className="text-center text-gray-500 mb-4">{t('calendario.loading')}</p>}
          <Calendar
            onActiveStartDateChange={handleActiveStartDateChange}
            activeStartDate={viewDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            locale={locale}
            className="w-full border-none custom-calendar-styling"
            showNeighboringMonth={false}
          />
          <div className="flex justify-center gap-4 mt-4 text-xs text-gray-600">
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Feriado Nacional</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500"></span> Feriado Municipal</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#4169E1' }}></span> Embarque</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#FFD700' }}></span> Curso</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: companyConfig.marker_color }}></span> Eventos Empresa</div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-abz-text-black mb-4 border-b pb-2">
            Eventos de {new Date(currentYear, viewDate.getMonth()).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </h2>

          {!loading && eventsThisMonth.length === 0 && <p className="text-gray-500 text-sm italic">{t('calendario.noEventsThisMonth')}</p>}

          <ul className="space-y-3 overflow-y-auto max-h-96 pr-2">
            {eventsThisMonth.map((ev, idx) => {
              const [Y, M, D] = ev.date.split('-').map(Number);
              const dObj = new Date(Date.UTC(Y, M - 1, D));
              const isMio = ev.source === 'mio';
              const isCompany = ev.source === 'company';
              const borderColor = ev.color || '#ccc';
              const bgColor = isMio || isCompany ? `${ev.color}15` : (ev.type === 'MUNICIPAL' ? '#fff7ed' : '#eff6ff');

              return (
                <li key={`${ev.date}-${idx}`} className="text-sm border-l-4 pl-3 p-2 rounded-r-md" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                  <span className="font-semibold block text-abz-text-dark">
                    {dObj.toLocaleDateString(locale, { day: '2-digit', timeZone: 'UTC' })} - {ev.name}
                  </span>
                  <span className="text-xs text-gray-600">({ev.type})</span>
                  {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <style jsx global>{`
        .custom-calendar-styling .react-calendar { border: none; font-family: inherit; }
        .custom-calendar-styling .react-calendar__navigation button { color: #0D1B42; min-width: 44px; background: none; font-size: 1rem; font-weight: 600; padding: 8px 0; }
        .custom-calendar-styling .react-calendar__navigation button:disabled { ***REMOVED*** #f0f0f0; color: #aaa; }
        .custom-calendar-styling .react-calendar__navigation button:enabled:hover, .custom-calendar-styling .react-calendar__navigation button:enabled:focus { ***REMOVED*** #E0F2FE; }
        .custom-calendar-styling .react-calendar__month-view__weekdays { text-align: center; text-transform: uppercase; font-weight: bold; font-size: 0.75em; padding-bottom: 0.5em; color: #6339F5; }
        .custom-calendar-styling .react-calendar__month-view__weekdays__weekday { padding: 0.5em; }
        .custom-calendar-styling .react-calendar__month-view__days__day--weekend { color: #d10000; }
        .custom-calendar-styling .react-calendar__month-view__days__day--neighboringMonth { color: #999; }
        .custom-calendar-styling .react-calendar__tile { max-width: 100%; padding: 10px 6px; background: none; text-align: center; line-height: 1.5; font-size: 0.875rem; height: 60px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
        .custom-calendar-styling .react-calendar__tile:disabled { ***REMOVED*** #f0f0f0; color: #aaa; }
        .custom-calendar-styling .react-calendar__tile:enabled:hover, .custom-calendar-styling .react-calendar__tile:enabled:focus { ***REMOVED*** #E0F2FE; border-radius: 4px; }
        .custom-calendar-styling .react-calendar__tile--now { background: #FFF3E0; font-weight: bold; border-radius: 4px; }
        .custom-calendar-styling .react-calendar__tile--now:enabled:hover, .custom-calendar-styling .react-calendar__tile--now:enabled:focus { background: #FFE0B2; }
        .custom-calendar-styling .react-calendar__tile--active { background: #6339F5; color: white; border-radius: 4px; }
        .custom-calendar-styling .react-calendar__tile--active:enabled:hover, .custom-calendar-styling .react-calendar__tile--active:enabled:focus { background: #5127d4; }
        .custom-calendar-styling .react-calendar__tile.relative abbr { position: relative; z-index: 1; padding-bottom: 2px; }
      `}</style>


    </MainLayout>
  );
}
