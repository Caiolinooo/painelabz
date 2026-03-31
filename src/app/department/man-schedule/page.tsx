'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FiDownload, FiSearch, FiNavigation } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { useI18n } from '@/contexts/I18nContext';

interface CrewSchedule {
    id: string;
    cpf: string;
    full_name: string;
    position: string;
    vessel: string;
    company: string;
    rotation_start: string | null;
    rotation_end: string | null;
    embarque_status: string | null;
    local_embarque: string;
}

interface ApiMeta {
    vessels: string[];
    positions: string[];
    companies: string[];
}

// Position display order — positions not listed here go to the end, sorted alphabetically
const POSITION_ORDER: string[] = [
    'CHEF MANAGER',
    'DAY / NIGHT CHEF',
    'DAY/NIGHT CHEF',
    'ASST. COOK',
    'ASST.COOK',
    'BAKER',
    'LEAD STEWARD',
    'STEWARD',
    'LAUNDRY',
    'GALLEY HAND',
];

function normalizePosition(pos: string): string {
    return pos.toUpperCase().replace(/\s+/g, ' ').trim();
}

function getPositionSortKey(pos: string): number {
    const norm = normalizePosition(pos);
    const idx = POSITION_ORDER.findIndex(p => norm.includes(p) || p.includes(norm));
    return idx >= 0 ? idx : 999;
}

export default function ManSchedulePage() {
    const { t, locale } = useI18n();
    const [allSchedules, setAllSchedules] = useState<CrewSchedule[]>([]);
    const [meta, setMeta] = useState<ApiMeta>({ vessels: [], positions: [], companies: [] });
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [filterVessel, setFilterVessel] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterPosition, setFilterPosition] = useState('');

    // Timeline navigation
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const fetchSchedules = useCallback(async () => {
        try {
            const res = await fetch('/api/man-schedule/realtime');
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Erro na API');
            setAllSchedules(result.data || []);
            if (result.meta) setMeta(result.meta);
        } catch (error) {
            console.error('Error fetching schedules:', error);
            toast.error(t('common.error', 'Erro ao carregar escala do MIO.'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    // ─── Filtered data & Cascading Dropdowns ───
    const filteredSchedules = useMemo(() => {
        const sName = searchName.trim().toLowerCase();
        const fVes = filterVessel.trim().toLowerCase();
        const fComp = filterCompany.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();

        return allSchedules.filter(s => {
            const matchName = !sName || s.full_name?.toLowerCase().includes(sName);
            const matchVessel = !fVes || (s.vessel || '').trim().toLowerCase() === fVes;
            const matchCompany = !fComp || (s.company || '').trim().toLowerCase() === fComp;
            const matchPosition = !fPos || (s.position || '').trim().toLowerCase() === fPos;
            return matchName && matchVessel && matchCompany && matchPosition;
        });
    }, [allSchedules, searchName, filterVessel, filterCompany, filterPosition]);

    const availableCompanies = useMemo(() => {
        const fVes = filterVessel.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();
        const valid = allSchedules.filter(s => 
            (!fVes || (s.vessel || '').trim().toLowerCase() === fVes) &&
            (!fPos || (s.position || '').trim().toLowerCase() === fPos)
        ).map(s => (s.company || '').trim()).filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterVessel, filterPosition]);

    const availableVessels = useMemo(() => {
        const fComp = filterCompany.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();
        const valid = allSchedules.filter(s => 
            (!fComp || (s.company || '').trim().toLowerCase() === fComp) &&
            (!fPos || (s.position || '').trim().toLowerCase() === fPos)
        ).map(s => (s.vessel || '').trim()).filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterCompany, filterPosition]);

    const availablePositions = useMemo(() => {
        const fComp = filterCompany.trim().toLowerCase();
        const fVes = filterVessel.trim().toLowerCase();
        const valid = allSchedules.filter(s => 
            (!fComp || (s.company || '').trim().toLowerCase() === fComp) &&
            (!fVes || (s.vessel || '').trim().toLowerCase() === fVes)
        ).map(s => (s.position || '').trim()).filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterCompany, filterVessel]);

    // ─── Build dynamic rows grouped by position ───
    const positionGroups = useMemo(() => {
        // Deduplicate crew per position (a person may have multiple embarque entries)
        const byPosition: Record<string, { name: string; cpf: string; rotations: { start: string | null; end: string | null }[] }[]> = {};

        for (const s of filteredSchedules) {
            const pos = normalizePosition(s.position) || 'SEM CARGO';
            if (!byPosition[pos]) byPosition[pos] = [];

            const existing = byPosition[pos].find(c => c.cpf === s.cpf);
            if (existing) {
                // Same crew member, different rotation — add rotation
                if (s.rotation_start || s.rotation_end) {
                    existing.rotations.push({ start: s.rotation_start, end: s.rotation_end });
                }
            } else {
                byPosition[pos].push({
                    name: s.full_name,
                    cpf: s.cpf,
                    rotations: (s.rotation_start || s.rotation_end)
                        ? [{ start: s.rotation_start, end: s.rotation_end }]
                        : []
                });
            }
        }

        // Convert to sorted array
        return Object.entries(byPosition)
            .sort(([a], [b]) => getPositionSortKey(a) - getPositionSortKey(b) || a.localeCompare(b))
            .map(([position, members]) => ({ position, members, count: members.length }));
    }, [filteredSchedules]);

    // ─── Dynamic timeline calculation ───
    const { weeks, timelineStart } = useMemo(() => {
        // Find earliest and latest dates across all visible rotations
        let earliest: Date | null = null;
        let latest: Date | null = null;

        for (const group of positionGroups) {
            for (const m of group.members) {
                for (const r of m.rotations) {
                    if (r.start) {
                        const d = new Date(r.start);
                        if (!earliest || d < earliest) earliest = d;
                    }
                    if (r.end) {
                        const d = new Date(r.end);
                        if (!latest || d > latest) latest = d;
                    }
                }
            }
        }

        // Fallback: if no dates, show current year range
        if (!earliest) earliest = new Date(new Date().getFullYear(), 0, 1);
        if (!latest) latest = new Date(new Date().getFullYear(), 11, 31);

        // Snap earliest to start of week (Saturday to match original)
        const snapToSaturday = (d: Date) => {
            const day = d.getDay();
            const diff = (day >= 6) ? day - 6 : day + 1; // distance to previous Saturday
            d.setDate(d.getDate() - diff);
            return d;
        };

        const start = snapToSaturday(new Date(earliest));
        // Add 2 weeks buffer before and after
        start.setDate(start.getDate() - 14);

        const endDate = new Date(latest);
        endDate.setDate(endDate.getDate() + 14);

        const totalWeeks = Math.max(Math.ceil((endDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)), 12);

        const generatedWeeks = [];
        for (let i = 0; i < totalWeeks; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i * 7);
            generatedWeeks.push({ date: new Date(d) });
        }

        return { weeks: generatedWeeks, timelineStart: start };
    }, [positionGroups]);

    // ─── Current week calculation ───
    const currentWeekIndex = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let idx = -1;
        for (let i = 0; i < weeks.length; i++) {
            const weekStart = new Date(weeks[i].date);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            if (today >= weekStart && today <= weekEnd) {
                idx = i;
                break;
            }
        }
        
        // If today not found, find closest week
        if (idx === -1 && weeks.length > 0) {
            let minDiff = Infinity;
            weeks.forEach((week, i) => {
                const diff = Math.abs(today.getTime() - new Date(week.date).getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    idx = i;
                }
            });
        }
        
        return idx >= 0 ? idx : 0;
    }, [weeks]);

    const scrollToWeek = useCallback((weekIdx: number) => {
        if (!tableContainerRef.current || weekIdx < 0) return;
        
        const container = tableContainerRef.current;
        // Each week column is ~24px + borders, 3 fixed columns = 530px
        const fixedColsWidth = 530;
        const targetScroll = fixedColsWidth + (weekIdx * 26);
        
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }, []);

    const scrollToCurrentWeek = useCallback(() => {
        scrollToWeek(currentWeekIndex);
    }, [scrollToWeek, currentWeekIndex]);

    const scrollToMonth = useCallback((monthsAhead: number) => {
        if (!tableContainerRef.current || weeks.length === 0) return;
        
        const today = new Date();
        const targetDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);
        
        let closestIdx = 0;
        let minDiff = Infinity;
        
        weeks.forEach((week, i) => {
            const diff = Math.abs(targetDate.getTime() - new Date(week.date).getTime());
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        });
        
        scrollToWeek(closestIdx);
    }, [weeks, scrollToWeek]);

    // ─── Format helpers ───
    const formatHeaderDate = (d: Date) => {
        const dayStr = d.getDate().toString().padStart(2, '0');
        const monthStr = d.toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { month: 'short' });
        const yearStr = d.getFullYear().toString().substring(2);
        const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).replace('.', '');
        return `${dayStr}-${capitalizedMonth}-${yearStr}`;
    };

    const getDayAbbr = (d: Date) => {
        return d.toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { weekday: 'short' }).replace('.', '');
    };

    // ─── Check exact rotation status for the week ───
    const getWeekStatus = (weekDate: Date, rotations: { start: string | null; end: string | null }[]): '' | 'ON' | 'OFF-C' => {
        const wStart = new Date(weekDate);
        wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);

        for (const r of rotations) {
            if (!r.start) continue;
            const rStart = new Date(r.start);
            rStart.setMinutes(rStart.getMinutes() + rStart.getTimezoneOffset());
            rStart.setHours(0, 0, 0, 0);

            const rEnd = r.end ? new Date(r.end) : new Date(rStart.getTime() + 90 * 24 * 60 * 60 * 1000); 
            rEnd.setMinutes(rEnd.getMinutes() + rEnd.getTimezoneOffset());
            rEnd.setHours(23, 59, 59, 999);

            if (wStart <= rEnd && wEnd >= rStart) {
                // If the rotation starts or ends in this specific week, it's a Crew Change week
                if ((rStart >= wStart && rStart <= wEnd) || (rEnd >= wStart && rEnd <= wEnd)) {
                    return 'OFF-C';
                }
                return 'ON';
            }
        }
        return '';
    };

    // ─── Vessel display name ───
    const vesselDisplayName = filterVessel && filterCompany
        ? `${filterCompany.toUpperCase()} - ${filterVessel.toUpperCase()}`
        : filterVessel 
            ? filterVessel.toUpperCase()
            : filterCompany
                ? filterCompany.toUpperCase()
                : t('manSchedule.allVessels', 'Todas as Embarcações');

    // ─── Export ───
    const exportToExcel = () => {
        const table = ***REMOVED***'man-schedule-table');
        if (!table) return;
        const wb = XLSX.utils.table_to_book(table, { sheet: 'Schedule' });
        const ws = wb.Sheets['Schedule'];
        
        // Define column widths so dates don't collapse to '#####'
        // Col 0: Nome (w: 35), Col 1: Qtd (w: 8), Col 2: Cargo (w: 25), Cols 3+: Dates (w: 12)
        const colWidths = [
            { wch: 35 }, 
            { wch: 8 },  
            { wch: 25 }, 
            ...weeks.map(() => ({ wch: 12 }))
        ];
        ws['!cols'] = colWidths;

        // Apply precise styles to 'ON', 'OFF-C', and headers
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1:Z100");
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = ws[cell_ref];
                
                if (!cell) continue;

                const defaultBorder = { 
                    top: { style: "thin", color: { rgb: "000000" } }, 
                    bottom: { style: "thin", color: { rgb: "000000" } }, 
                    left: { style: "thin", color: { rgb: "000000" } }, 
                    right: { style: "thin", color: { rgb: "000000" } } 
                };

                let cellStyle: any = {
                    alignment: { vertical: "center", horizontal: "center", wrapText: true }
                };

                if (typeof cell.v === 'string') {
                    cell.v = cell.v.replace(/\n|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                }

                if (R === 0) { // Top Titles
                    cellStyle.font = { bold: true, color: { rgb: C < 3 ? "FFFFFF" : "002060" }, sz: 12 };
                    cellStyle.fill = { fgColor: { rgb: C < 3 ? "002060" : "E2EFDA" } };
                    cellStyle.border = defaultBorder;
                } else if (R === 1 || R === 2) { // Date Headers
                    cellStyle.font = { bold: true, color: { rgb: "000000" }, sz: 10 };
                    cellStyle.border = defaultBorder;
                } else { // Data Rows
                    if (cell.v === 'ON') {
                        cellStyle.fill = { fgColor: { rgb: "E2EFDA" } };
                        cellStyle.font = { color: { rgb: "00B050" }, bold: true, sz: 10 };
                        cellStyle.border = defaultBorder;
                    } else if (cell.v === 'OFF-C') {
                        cellStyle.fill = { fgColor: { rgb: "F4CCCC" } };
                        cellStyle.font = { color: { rgb: "CC0000" }, bold: true, sz: 10 };
                        cellStyle.border = defaultBorder;
                    } else if (cell.v) { // Crew Info
                        cellStyle.font = { color: { rgb: C === 0 ? "002060" : "000000" }, bold: C < 3, sz: 10 };
                        if (C === 1 || C === 2) cellStyle.fill = { fgColor: { rgb: "E7E6E6" } };
                        cellStyle.alignment.horizontal = C === 0 ? "left" : "center";
                        cellStyle.border = defaultBorder;
                    }
                }
                
                cell.s = cellStyle;
            }
        }

        const safeName = (filterVessel || 'All_Vessels').replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `Man_Schedule_${safeName}.xlsx`);
        toast.success(t('manSchedule.exportedSuccess', 'Planilha exportada com sucesso!'));
    };

    // ─── Alternating group background colors ───
    const groupColors = ['bg-[#d9e1f2]', 'bg-[#b4c6e7]'];

    return (
        <div className="flex flex-col -mx-8 -my-8 h-[calc(100vh-5rem)] overflow-hidden bg-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 py-3 shrink-0 border-b border-gray-200 gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{t('manSchedule.title', 'Visualização de Matriz - Man Schedule')}</h1>
                    <p className="text-gray-500 text-sm">{t('manSchedule.subtitle', 'Representação exata da planilha matricial de escalas.')}</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium text-sm flex-shrink-0"
                >
                    <FiDownload />
                    {t('manSchedule.exportXLSX', 'Exportar Planilha (XLSX)')}
                </button>
            </div>

            {/* Filters - Always visible */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 shrink-0">
                <div className="flex items-end gap-3 w-full flex-nowrap">
                    <div className="min-w-[200px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.searchLabel', 'Buscar')}</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('manSchedule.search', 'Buscar tripulante...')}
                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-end gap-3 flex-nowrap flex-1 min-w-0">
                        <div className="min-w-[130px] flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.companyLabel', 'Empresa')}</label>
                            <select
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white truncate"
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                            >
                                <option value="">{t('manSchedule.allCompanies', 'Todas')}</option>
                                {availableCompanies.map((comp, idx) => (
                                    <option key={idx} value={comp}>{comp}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[130px] flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.vesselLabel', 'Embarcação')}</label>
                            <select
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white truncate"
                                value={filterVessel}
                                onChange={(e) => setFilterVessel(e.target.value)}
                            >
                                <option value="">{t('manSchedule.allVessels', 'Todas')}</option>
                                {availableVessels.map((v, idx) => (
                                    <option key={idx} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[130px] flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.positionLabel', 'Cargo')}</label>
                            <select
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white truncate"
                                value={filterPosition}
                                onChange={(e) => setFilterPosition(e.target.value)}
                            >
                                <option value="">{t('manSchedule.allPositions', 'Todos')}</option>
                                {availablePositions.map((p, idx) => (
                                    <option key={idx} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Navigation Bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 shrink-0">
                <FiNavigation className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 mr-2">
                    {t('manSchedule.quickNav', 'Navegação Rápida:')}
                </span>
                <button
                    onClick={() => scrollToCurrentWeek()}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded shadow-sm transition border border-yellow-600 flex items-center gap-1"
                >
                    📍 {t('manSchedule.today', 'Hoje')}
                </button>
                <button
                    onClick={() => scrollToMonth(0)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded shadow-sm transition"
                >
                    {t('manSchedule.currentMonth', 'Mês Atual')}
                </button>
                <button
                    onClick={() => scrollToMonth(1)}
                    className="px-3 py-1 bg-blue-400 hover:bg-blue-500 text-white text-xs font-medium rounded shadow-sm transition"
                >
                    {t('manSchedule.nextMonth', 'Próximo Mês')}
                </button>
                <span className="text-xs text-blue-600 ml-auto font-medium">
                    📍 Semana de {weeks[currentWeekIndex] ? formatHeaderDate(weeks[currentWeekIndex].date) : '--'}
                </span>
            </div>

            {/* Matrix Table - Scrollable area */}
            <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 relative">
                <table id="man-schedule-table" className="w-max border-collapse font-sans text-xs bg-white">
                    <thead className="sticky top-0 z-40 bg-white">
                        {/* Row 1: Vessel name */}
                        <tr>
                            <th
                                colSpan={3}
                                className="bg-[#002060] text-white text-left px-2 py-4 font-bold border-r border-b border-black align-top sticky left-0 z-30"
                                style={{ fontSize: '14px', minWidth: '300px' }}
                            >
                                {vesselDisplayName}
                            </th>
                            <th
                                colSpan={weeks.length}
                                className="bg-[#e2efda] text-center border-b border-black p-2 font-bold uppercase text-[#002060]"
                                style={{ fontSize: '11px' }}
                            >
                                {t('manSchedule.timeline', 'CRONOGRAMA DE ESCALAS')}
                            </th>
                        </tr>

                        {/* Row 2: Column headers + dates (vertical) */}
                        <tr>
                            <th className="bg-white text-black font-bold text-center border-r border-b border-black sticky left-0 z-30 min-w-[300px] w-[300px] px-2 py-2">
                                {t('manSchedule.tableHeaders.name', 'NOME')}
                            </th>
                            <th className="bg-white text-black font-bold text-center border-r border-b border-black sticky left-[300px] z-30 px-2 py-2 w-[80px] min-w-[80px]">
                                {t('manSchedule.tableHeaders.reqOnboard', "QTD.\nEMBARC").split('\n').map((line, i, arr) => (
                                    <React.Fragment key={i}>
                                        {line}{i !== arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </th>
                            <th className="bg-white text-black font-bold text-center border-r border-b border-black sticky left-[380px] z-30 px-4 py-2 min-w-[150px] w-[150px]">
                                {t('manSchedule.tableHeaders.rank', 'CARGO')}
                            </th>
                            {weeks.map((week, idx) => {
                                const isCurrentWeek = idx === currentWeekIndex;
                                return (
                                <th
                                    key={`date-${idx}`}
                                    className={`text-center border-r border-b align-bottom pt-2 pb-1 ${
                                        isCurrentWeek 
                                            ? 'bg-yellow-100 text-yellow-800 font-bold border-yellow-500 border-2' 
                                            : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                    }`}
                                    style={{ height: '90px' }}
                                >
                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', letterSpacing: '0.5px', fontSize: '11px' }}>
                                        {formatHeaderDate(week.date)}
                                    </div>
                                </th>
                                );
                            })}
                        </tr>

                        {/* Row 3: Day of week */}
                        <tr>
                            <th className="bg-white border-r border-b border-black sticky left-0 z-30"></th>
                            <th className="bg-white border-r border-b border-black sticky left-[300px] z-30"></th>
                            <th className="bg-white border-r border-b border-black sticky left-[380px] z-30"></th>
                            {weeks.map((week, idx) => {
                                const isCurrentWeek = idx === currentWeekIndex;
                                return (
                                <th
                                    key={`day-${idx}`}
                                    className={`text-center border-r border-b py-0.5 ${
                                        isCurrentWeek 
                                            ? 'bg-yellow-100 text-yellow-800 font-bold border-yellow-500 border-2' 
                                            : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                    }`}
                                    style={{ fontSize: '11px' }}
                                >
                                    {getDayAbbr(week.date)}
                                </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3 + weeks.length} className="px-4 py-8 text-center text-gray-500 bg-white">
                                    {t('manSchedule.loading', 'Carregando dados do MIO...')}
                                </td>
                            </tr>
                        ) : positionGroups.length === 0 ? (
                            <tr>
                                <td colSpan={3 + weeks.length} className="px-4 py-8 text-center text-gray-400 bg-white">
                                    {t('manSchedule.empty', 'Nenhum tripulante encontrado para os filtros selecionados.')}
                                </td>
                            </tr>
                        ) : (
                            positionGroups.map((group, gIdx) => {
                                const bg = groupColors[gIdx % groupColors.length];
                                return (
                                    <React.Fragment key={`group-${gIdx}`}>
                                        {/* Position group rows */}
                                        {group.members.map((member, mIdx) => (
                                            <tr key={`row-${gIdx}-${mIdx}`}>
                                                {/* NAME */}
                                                <td className={`bg-white text-blue-900 font-bold px-2 py-1 border-r border-b border-black whitespace-nowrap overflow-hidden sticky left-0 z-20 uppercase`}>
                                                    {member.name || '\u00A0'}
                                                </td>
                                                {/* QTD (show only on first row of the group) */}
                                                <td className={`${bg} text-black font-bold text-center border-r border-b border-black sticky left-[300px] z-20`}>
                                                    {mIdx === 0 ? group.count : ''}
                                                </td>
                                                {/* POSITION */}
                                                <td className={`${bg} text-black font-bold px-2 py-1 border-r border-b border-black uppercase sticky left-[380px] z-20`}>
                                                    {group.position}
                                                </td>
                                                {/* Timeline cells */}
                                                 {weeks.map((week, wIdx) => {
                                                    const status = getWeekStatus(week.date, member.rotations);
                                                    const isCurrentWeek = wIdx === currentWeekIndex;
                                                    let cellClass = 'bg-white border-[#d1d5db]';
                                                    if (status === 'ON') cellClass = 'bg-[#e2efda] text-[#00b050] font-bold border-black';
                                                    else if (status === 'OFF-C') cellClass = 'bg-[#f4cccc] text-[#cc0000] font-bold border-black';
                                                    
                                                    if (isCurrentWeek) {
                                                        cellClass = `${cellClass} !bg-yellow-100 !border-yellow-500 !border-2`;
                                                    }

                                                    return (
                                                        <td
                                                            key={`cell-${gIdx}-${mIdx}-${wIdx}`}
                                                            className={`${cellClass} border-r border-b text-center`}
                                                            style={{ width: '24px', minWidth: '24px', fontSize: '9px' }}
                                                        >
                                                            {status}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}

                                        {/* Divider between groups */}
                                        {gIdx < positionGroups.length - 1 && (
                                            <tr key={`div-${gIdx}`}>
                                                <td colSpan={3 + weeks.length} className="bg-white h-2 border-b border-black"></td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend - Always visible at bottom */}
            <div className="flex flex-col gap-1 text-xs px-4 py-2 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex items-center gap-2">
                    <span className="w-16 bg-[#e2efda] text-[#00b050] border border-black text-center font-bold px-1 py-0.5">ON</span>
                    <span className="text-gray-700 font-semibold">On This Site (Embarcado)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-16 bg-[#f4cccc] text-[#cc0000] border border-black text-center font-bold px-1 py-0.5">OFF-C</span>
                    <span className="text-gray-700 font-semibold">Crew Change (Semana de troca de turma / Desembarque)</span>
                </div>
            </div>
        </div>
    );
}
