'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/tokenStorage';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';

interface CalendarEvent {
    date: string; // YYYY-MM-DD
    title: string;
    description?: string;
    type: string; // 'MUNICIPAL', 'NATIONAL', 'COMPANY', 'MIO'
    color?: string;
}

export default function EventsWidget() {
    const { t, locale } = useI18n();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoading(true);
                // We'll fetch company events and holiday data similar to the Calendar Display
                // For simplicity/performance in this MVP Widget, let's fetch Company Events 
                // and maybe hardcode the next few major holidays or fetch from an optimized endpoint.

                // Strategy: Fetch company events for next 30 days
                const res = await fetchWithToken('/api/calendar/company/events?rangeDays=30');
                const data = await res.json();

                let mixedEvents: CalendarEvent[] = [];

                if (data.events) {
                    mixedEvents = data.events.map((e: any) => ({
                        date: e.start.split('T')[0],
                        title: e.summary,
                        description: e.description,
                        type: 'COMPANY',
                        color: '#6339F5'
                    }));
                }

                // Add Mock Holidays for immediate visual feedback if API is empty, 
                // but ideally this should call the same holidays logic as CalendarioPage.
                // For now, let's just sort what we have.
                // TODO: Refactor holiday logic into a shared hook `useHolidays`

                // Sort by date
                mixedEvents.sort((a, b) => a.date.localeCompare(b.date));

                // Take top 3
                setEvents(mixedEvents.slice(0, 3));
            } catch (err) {
                console.error('Failed to load dashboard events', err);
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, []);

    const getMonthAbbr = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleString(locale, { month: 'short' }).replace('.', '');
    };

    const getDay = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return d;
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 h-full shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">{t('dashboard.events')}</h3>
                <Link href="/calendario" className="text-sm text-blue-600 font-semibold hover:underline">
                    {t('common.seeAll')}
                </Link>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <p className="text-sm">Sem eventos próximos</p>
                    </div>
                ) : (
                    events.map((ev, idx) => (
                        <div key={`${ev.date}-${idx}`} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-blue-100">
                            <div className="flex items-start gap-4 z-10 relative">
                                <div className="flex flex-col items-center justify-center pr-4 border-r border-gray-100 min-w-[3.5rem]">
                                    <span className="text-2xl font-bold text-gray-800">{getDay(ev.date)}</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase">{getMonthAbbr(ev.date)}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-base line-clamp-1">{ev.title}</h4>
                                    <p className="text-xs text-gray-400 line-clamp-1">{ev.description || (ev.type === 'COMPANY' ? 'Evento Corporativo' : ev.type)}</p>
                                </div>
                            </div>
                            {/* Type Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${ev.type === 'COMPANY' ? 'bg-[#6339F5]' : 'bg-orange-500'}`}></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
