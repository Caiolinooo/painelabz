'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FiDownload, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';

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
    rotation_type: 'normal' | 'fi' | 'dba' | 'stb' | 'offc';
}

interface ApiMeta {
    vessels: string[];
    positions: string[];
    companies: string[];
}

interface Props {
    onColabClick: (colaborador: any) => void;
}

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

export default function GTManScheduleTab({ onColabClick }: Props) {
    const { t, locale } = useI18n();
    const [allSchedules, setAllSchedules] = useState<CrewSchedule[]>([]);
    const [meta, setMeta] = useState<ApiMeta>({ vessels: [], positions: [], companies: [] });
    const [loading, setLoading] = useState(true);
    const [openingColab, setOpeningColab] = useState<string | null>(null);

    // Gestão de Eventos de Escala Manual
    const [selectedCell, setSelectedCell] = useState<{
        cpf: string;
        name: string;
        date: Date;
        status: string;
        rotationId?: string;
        vessel: string;
    } | null>(null);
    const [formTipo, setFormTipo] = useState('normal');
    const [formStart, setFormStart] = useState('');
    const [formEnd, setFormEnd] = useState('');
    const [formVessel, setFormVessel] = useState('');
    const [formLocalEmb, setFormLocalEmb] = useState('');
    const [formObs, setFormObs] = useState('');
    const [submittingEvent, setSubmittingEvent] = useState(false);

    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [filterVessel, setFilterVessel] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterPosition, setFilterPosition] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const fetchSchedules = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchWithToken('/api/man-schedule/realtime');
            if (!res.ok) {
                if (res.status === 503) {
                    throw new Error('Cache MIO indisponível. Por favor, atualize o cache no painel administrativo.');
                }
                throw new Error('Erro ao buscar dados da escala.');
            }
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Erro na API');
            setAllSchedules(result.data || []);
            if (result.meta) setMeta(result.meta);
        } catch (error: any) {
            console.error('Error fetching schedules:', error);
            toast.error(error.message || 'Erro ao carregar escala do MIO.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    const getWeekRotation = useCallback((weekDate: Date, rotations: any[]) => {
        const wStart = new Date(weekDate);
        wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        for (const r of rotations) {
            if (!r.start) continue;
            const rStart = new Date(r.start);
            rStart.setHours(0, 0, 0, 0);

            const rEnd = r.end ? new Date(r.end) : new Date(rStart.getTime() + 90 * 24 * 60 * 60 * 1000);
            rEnd.setHours(23, 59, 59, 999);

            const overlaps = wStart <= rEnd && wEnd >= rStart;
            if (overlaps) return r;
        }
        return null;
    }, []);

    const handleCellClick = (cpf: string, name: string, date: Date, status: string, rotations: any[]) => {
        const matchingRotation = getWeekRotation(date, rotations);
        const rotId = matchingRotation?.id || '';
        const currentVessel = matchingRotation?.vessel || '';
        const formattedDate = date.toISOString().split('T')[0];
        
        const defaultEnd = new Date(date);
        defaultEnd.setDate(defaultEnd.getDate() + 14);
        const formattedEnd = defaultEnd.toISOString().split('T')[0];

        setSelectedCell({ cpf, name, date, status, rotationId: rotId, vessel: currentVessel });
        
        let mappedTipo = 'normal';
        if (status === 'FI') mappedTipo = 'fi';
        else if (status === 'DBA') mappedTipo = 'dba';
        else if (status === 'STB') mappedTipo = 'stb';
        else if (status === 'OFF-C') mappedTipo = 'offc';
        
        setFormTipo(mappedTipo);
        setFormStart(formattedDate);
        setFormEnd(formattedEnd);
        setFormVessel(currentVessel || '');
        setFormLocalEmb('');
        setFormObs('');
    };

    const handleSaveEvent = async () => {
        if (!selectedCell) return;
        try {
            setSubmittingEvent(true);
            const res = await fetchWithToken('/api/gestao-tripulantes/embarques', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colaborador_cpf: selectedCell.cpf,
                    tipo: formTipo,
                    data_embarque: formStart,
                    data_desembarque: formEnd,
                    local_embarque: formLocalEmb,
                    local_desembarque: formVessel,
                    observacoes: formObs
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao salvar escala.');
            }

            toast.success('Evento de escala inserido com sucesso!');
            setSelectedCell(null);
            fetchSchedules();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao salvar evento.');
        } finally {
            setSubmittingEvent(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedCell?.rotationId) return;
        try {
            setSubmittingEvent(true);
            const res = await fetchWithToken(`/api/gestao-tripulantes/embarques/${selectedCell.rotationId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao excluir evento.');
            }

            toast.success('Evento de escala removido com sucesso!');
            setSelectedCell(null);
            fetchSchedules();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao remover evento.');
        } finally {
            setSubmittingEvent(false);
        }
    };

    // Handle clicking a name on the schedule matrix
    const handleNameClick = async (cpf: string, fullName: string) => {
        if (!cpf) return;
        try {
            const cleanCpf = cpf.replace(/\D/g, '');
            if (!cleanCpf) return;

            setOpeningColab(cpf);
            // Search for local collaborator by CPF
            const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores?search=${cleanCpf}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const colab = json.data?.[0];

            if (colab) {
                onColabClick(colab);
            } else {
                toast.error(`Colaborador "${fullName}" não está cadastrado na base local de tripulantes.`);
            }
        } catch {
            toast.error('Erro ao abrir ficha do colaborador.');
        } finally {
            setOpeningColab(null);
        }
    };

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
        const byPosition: Record<string, { name: string; cpf: string; rotations: { id: string; start: string | null; end: string | null; type: string; vessel: string }[] }[]> = {};

        for (const s of filteredSchedules) {
            const pos = normalizePosition(s.position) || 'SEM CARGO';
            if (!byPosition[pos]) byPosition[pos] = [];

            const existing = byPosition[pos].find(c => c.cpf === s.cpf);
            if (existing) {
                if (s.rotation_start || s.rotation_end) {
                    existing.rotations.push({ id: s.id, start: s.rotation_start, end: s.rotation_end, type: s.rotation_type || 'normal', vessel: s.vessel });
                }
            } else {
                byPosition[pos].push({
                    name: s.full_name,
                    cpf: s.cpf,
                    rotations: (s.rotation_start || s.rotation_end)
                        ? [{ id: s.id, start: s.rotation_start, end: s.rotation_end, type: s.rotation_type || 'normal', vessel: s.vessel }]
                        : []
                });
            }
        }

        return Object.entries(byPosition)
            .sort(([a], [b]) => getPositionSortKey(a) - getPositionSortKey(b) || a.localeCompare(b))
            .map(([position, members]) => ({ position, members, count: members.length }));
    }, [filteredSchedules]);

    // ─── Dynamic timeline calculation ───
    const { weeks, timelineStart } = useMemo(() => {
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

        if (!earliest) earliest = new Date(new Date().getFullYear(), 0, 1);
        if (!latest) latest = new Date(new Date().getFullYear(), 11, 31);

        const snapToSaturday = (d: Date) => {
            const day = d.getDay();
            const diff = (day >= 6) ? day - 6 : day + 1;
            d.setDate(d.getDate() - diff);
            return d;
        };

        const start = snapToSaturday(new Date(earliest));
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

    // ─── Filtered weeks based on date range selector ───
    const filteredWeeks = useMemo(() => {
        if (!filterDateStart && !filterDateEnd) return weeks;
        const startDate = filterDateStart ? new Date(filterDateStart) : null;
        const endDate = filterDateEnd ? new Date(filterDateEnd) : null;

        return weeks.filter(w => {
            const weekDate = new Date(w.date);
            const weekEnd = new Date(weekDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (startDate && endDate) {
                return weekEnd >= startDate && weekDate <= endDate;
            }
            if (startDate) {
                return weekEnd >= startDate;
            }
            if (endDate) {
                return weekDate <= endDate;
            }
            return true;
        });
    }, [weeks, filterDateStart, filterDateEnd]);

    // ─── Current week calculation ───
    const currentWeekIndex = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let idx = -1;
        for (let i = 0; i < filteredWeeks.length; i++) {
            const weekStart = new Date(filteredWeeks[i].date);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            if (today >= weekStart && today <= weekEnd) {
                idx = i;
                break;
            }
        }
        
        if (idx === -1 && filteredWeeks.length > 0) {
            let minDiff = Infinity;
            filteredWeeks.forEach((week, i) => {
                const diff = Math.abs(today.getTime() - new Date(week.date).getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    idx = i;
                }
            });
        }
        
        return idx >= 0 ? idx : 0;
    }, [filteredWeeks]);

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
    const getWeekStatus = (weekDate: Date, rotations: { id?: string; start: string | null; end: string | null; type?: string; vessel?: string }[]): '' | 'ON' | 'OFF-C' | 'FI' | 'DBA' | 'STB' => {
        const wStart = new Date(weekDate);
        wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        for (const r of rotations) {
            if (!r.start) continue;
            const rStart = new Date(r.start);
            rStart.setHours(0, 0, 0, 0);

            const rEnd = r.end ? new Date(r.end) : new Date(rStart.getTime() + 90 * 24 * 60 * 60 * 1000);
            rEnd.setHours(23, 59, 59, 999);

            const overlaps = wStart <= rEnd && wEnd >= rStart;
            if (!overlaps) continue;

            if (r.type === 'fi') return 'FI';
            if (r.type === 'dba') return 'DBA';
            if (r.type === 'stb') return 'STB';
            if (r.type === 'offc') return 'OFF-C';
            return 'ON';
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
        const table = document.getElementById('man-schedule-table');
        if (!table) return;
        const wb = XLSX.utils.table_to_book(table, { sheet: 'Schedule' });
        const ws = wb.Sheets['Schedule'];
        
        const colWidths = [
            { wch: 35 }, 
            { wch: 8 },  
            { wch: 25 }, 
            ...filteredWeeks.map(() => ({ wch: 12 }))
        ];
        ws['!cols'] = colWidths;

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

                if (R === 0) {
                    cellStyle.font = { bold: true, color: { rgb: C < 3 ? "FFFFFF" : "002060" }, sz: 12 };
                    cellStyle.fill = { fgColor: { rgb: C < 3 ? "002060" : "E2EFDA" } };
                    cellStyle.border = defaultBorder;
                } else if (R === 1 || R === 2) {
                    cellStyle.font = { bold: true, color: { rgb: "000000" }, sz: 10 };
                    cellStyle.border = defaultBorder;
                } else {
                    if (cell.v === 'ON' || cell.v === 'FI' || cell.v === 'DBA') {
                        cellStyle.fill = { fgColor: { rgb: "E2EFDA" } };
                        cellStyle.font = { color: { rgb: "00B050" }, bold: true, sz: 10 };
                        cellStyle.border = defaultBorder;
                    } else if (cell.v === 'OFF-C' || cell.v === 'STB') {
                        cellStyle.fill = { fgColor: { rgb: "F4CCCC" } };
                        cellStyle.font = { color: { rgb: "CC0000" }, bold: true, sz: 10 };
                        cellStyle.border = defaultBorder;
                    } else if (cell.v) {
                        cellStyle.font = { color: { rgb: C === 0 ? "002060" : "000000" }, bold: C < 3, sz: 10 };
                        if (C === 1 || C === 2) cellStyle.fill = { fgColor: { rgb: "E7E6E6" } };
                        cellStyle.alignment.horizontal = C === 0 ? "left" : "center";
                        cellStyle.border = defaultBorder;
                    }
                }
                
                cell.s = cellStyle;
            }
        }

        const lastRow = range.e.r + 3;
        const legendColors: Record<string, string> = {
            'ON': 'E2EFDA', 'OFF-C': 'F4CCCC', 'FI': 'E2EFDA', 'DBA': 'E2EFDA', 'STB': 'F4CCCC'
        };
        const legendTextColors: Record<string, string> = {
            'ON': '00B050', 'OFF-C': 'CC0000', 'FI': '00B050', 'DBA': '00B050', 'STB': 'CC0000'
        };

        let legendCol = 0;
        for (const item of legendItems) {
            const codeCellRef = XLSX.utils.encode_cell({ c: legendCol, r: lastRow });
            const labelCellRef = XLSX.utils.encode_cell({ c: legendCol + 1, r: lastRow });
            
            ws[codeCellRef] = {
                v: item.code,
                s: {
                    fill: { fgColor: { rgb: legendColors[item.code] } },
                    font: { bold: true, color: { rgb: legendTextColors[item.code] }, sz: 10 },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            };
            ws[labelCellRef] = {
                v: item.label,
                s: {
                    font: { bold: true, sz: 10 },
                    alignment: { horizontal: "left", vertical: "center" }
                }
            };
            legendCol += 3;
        }

        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: Math.max(range.e.c, legendCol) } });

        const safeName = (filterVessel || 'All_Vessels').replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `Man_Schedule_${safeName}.xlsx`);
        toast.success(t('manSchedule.exportedSuccess', 'Planilha exportada com sucesso!'));
    };

    const groupColors = ['bg-[#d9e1f2]', 'bg-[#b4c6e7]'];

    const presentStatuses = useMemo(() => {
        const statuses = new Set<string>();
        for (const group of positionGroups) {
            for (const member of group.members) {
                for (const week of filteredWeeks) {
                    const s = getWeekStatus(week.date, member.rotations);
                    if (s) statuses.add(s);
                }
            }
        }
        return statuses;
    }, [positionGroups, filteredWeeks]);

    const legendItems = useMemo(() => {
        const allItems = [
            { code: 'ON', color: '#e2efda', textColor: '#00b050', label: t('manSchedule.legendOn', 'Embarcado') },
            { code: 'OFF-C', color: '#f4cccc', textColor: '#cc0000', label: t('manSchedule.legendOffC', 'Troca de Turma') },
            { code: 'FI', color: '#e2efda', textColor: '#00b050', label: t('manSchedule.legendFi', 'Folga Indenizada') },
            { code: 'DBA', color: '#e2efda', textColor: '#00b050', label: t('manSchedule.legendDba', 'Dobra') },
            { code: 'STB', color: '#f4cccc', textColor: '#cc0000', label: t('manSchedule.legendStb', 'StandBy') },
        ];
        return allItems.filter(item => presentStatuses.has(item.code));
    }, [presentStatuses, t]);

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[400px] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Filters */}
            <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 shrink-0">
                <div className="flex items-end gap-3 w-full flex-wrap">
                    <div className="min-w-[180px] flex-shrink-0 flex-1 md:flex-initial">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.searchLabel', 'Buscar')}</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('manSchedule.search', 'Buscar tripulante...')}
                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="min-w-[120px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.companyLabel', 'Empresa')}</label>
                        <select
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white truncate transition-all"
                            value={filterCompany}
                            onChange={(e) => setFilterCompany(e.target.value)}
                        >
                            <option value="">{t('manSchedule.allCompanies', 'Todas')}</option>
                            {availableCompanies.map((comp, idx) => (
                                <option key={idx} value={comp}>{comp}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[120px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.vesselLabel', 'Embarcação')}</label>
                        <select
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white truncate transition-all"
                            value={filterVessel}
                            onChange={(e) => setFilterVessel(e.target.value)}
                        >
                            <option value="">{t('manSchedule.allVessels', 'Todas')}</option>
                            {availableVessels.map((v, idx) => (
                                <option key={idx} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[120px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.positionLabel', 'Cargo')}</label>
                        <select
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white truncate transition-all"
                            value={filterPosition}
                            onChange={(e) => setFilterPosition(e.target.value)}
                        >
                            <option value="">{t('manSchedule.allPositions', 'Todos')}</option>
                            {availablePositions.map((p, idx) => (
                                <option key={idx} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[130px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.dateStart', 'Data Inicio')}</label>
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        />
                    </div>

                    <div className="min-w-[130px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.dateEnd', 'Data Fim')}</label>
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        disabled={loading || allSchedules.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition font-semibold text-xs flex-shrink-0 self-end h-[34px]"
                    >
                        <FiDownload />
                        {t('manSchedule.exportXLSX', 'Exportar XLSX')}
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 relative">
                <table id="man-schedule-table" className="w-max border-collapse font-sans text-xs bg-white">
                    <thead className="sticky top-0延 z-40 bg-white">
                        <tr>
                            <th
                                colSpan={3}
                                className="bg-[#002060] text-white text-left px-3 py-3 font-bold border-r border-b border-black align-middle sticky left-0 z-30"
                                style={{ fontSize: '12px', minWidth: '300px' }}
                            >
                                {vesselDisplayName}
                            </th>
                            <th
                                colSpan={filteredWeeks.length}
                                className="bg-[#e2efda] text-center border-b border-black p-2 font-bold uppercase text-[#002060]"
                                style={{ fontSize: '10px' }}
                            >
                                {t('manSchedule.timeline', 'CRONOGRAMA DE ESCALAS')}
                            </th>
                        </tr>

                        <tr>
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-0 z-30 min-w-[300px] w-[300px] px-2 py-2">
                                {t('manSchedule.tableHeaders.name', 'NOME')}
                            </th>
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-[300px] z-30 px-2 py-2 w-[80px] min-w-[80px]">
                                {t('manSchedule.tableHeaders.reqOnboard', "QTD.\nEMBARC").split('\n').map((line, i, arr) => (
                                    <React.Fragment key={i}>
                                        {line}{i !== arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </th>
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-[380px] z-30 px-4 py-2 min-w-[150px] w-[150px]">
                                {t('manSchedule.tableHeaders.rank', 'CARGO')}
                            </th>
                            {filteredWeeks.map((week, idx) => {
                                const isCurrentWeek = idx === currentWeekIndex;
                                return (
                                <th
                                    key={`date-${idx}`}
                                    className={`text-center border-r border-b align-bottom pt-2 pb-1 ${
                                        isCurrentWeek 
                                            ? 'bg-yellow-100 text-yellow-850 font-bold border-yellow-500 border-2' 
                                            : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                    }`}
                                    style={{ height: '90px' }}
                                >
                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', letterSpacing: '0.5px', fontSize: '10px' }}>
                                        {formatHeaderDate(week.date)}
                                    </div>
                                </th>
                                );
                            })}
                        </tr>

                        <tr>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-0 z-30"></th>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-[300px] z-30"></th>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-[380px] z-30"></th>
                            {filteredWeeks.map((week, idx) => {
                                const isCurrentWeek = idx === currentWeekIndex;
                                return (
                                <th
                                    key={`day-${idx}`}
                                    className={`text-center border-r border-b py-0.5 ${
                                        isCurrentWeek 
                                            ? 'bg-yellow-100 text-yellow-800 font-bold border-yellow-500 border-2' 
                                            : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                    }`}
                                    style={{ fontSize: '10px' }}
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
                                <td colSpan={3 + filteredWeeks.length} className="px-4 py-8 text-center text-gray-500 bg-white">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>{t('manSchedule.loading', 'Carregando dados do MIO...')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : positionGroups.length === 0 ? (
                            <tr>
                                <td colSpan={3 + filteredWeeks.length} className="px-4 py-8 text-center text-gray-405 bg-white">
                                    {t('manSchedule.empty', 'Nenhum tripulante encontrado para os filtros selecionados.')}
                                </td>
                            </tr>
                        ) : (
                            positionGroups.map((group, gIdx) => {
                                const bg = groupColors[gIdx % groupColors.length];
                                return (
                                    <React.Fragment key={`group-${gIdx}`}>
                                        {group.members.map((member, mIdx) => (
                                            <tr key={`row-${gIdx}-${mIdx}`} className="hover:bg-slate-50/50">
                                                {/* NAME (Clicável para abrir modal do colaborador) */}
                                                <td 
                                                    onClick={() => handleNameClick(member.cpf, member.name)}
                                                    className={`bg-white text-blue-600 hover:text-blue-800 hover:underline font-bold px-3 py-1.5 border-r border-b border-black whitespace-nowrap overflow-hidden sticky left-0 z-20 uppercase cursor-pointer transition-colors ${
                                                        openingColab === member.cpf ? 'opacity-50 animate-pulse' : ''
                                                    }`}
                                                >
                                                    {member.name || '\u00A0'}
                                                </td>
                                                {/* QTD */}
                                                <td className={`${bg} text-black font-bold text-center border-r border-b border-black sticky left-[300px] z-20`}>
                                                    {mIdx === 0 ? group.count : ''}
                                                </td>
                                                {/* POSITION */}
                                                <td className={`${bg} text-black font-bold px-2 py-1.5 border-r border-b border-black uppercase sticky left-[380px] z-20`}>
                                                    {group.position}
                                                </td>
                                                {/* Timeline cells */}
                                                {filteredWeeks.map((week, wIdx) => {
                                                    const status = getWeekStatus(week.date, member.rotations);
                                                    const isCurrentWeek = wIdx === currentWeekIndex;
                                                    let cellClass = 'bg-white border-[#e5e7eb]';
                                                    if (status === 'ON' || status === 'FI' || status === 'DBA') cellClass = 'bg-[#e2efda] text-[#00b050] font-bold border-black';
                                                    else if (status === 'OFF-C' || status === 'STB') cellClass = 'bg-[#f4cccc] text-[#cc0000] font-bold border-black';
                                                    
                                                    if (isCurrentWeek) {
                                                        cellClass = `${cellClass} !bg-yellow-100 !border-yellow-500 !border-2`;
                                                    }

                                                    return (
                                                        <td
                                                            key={`cell-${gIdx}-${mIdx}-${wIdx}`}
                                                            onClick={() => handleCellClick(member.cpf, member.name, week.date, status, member.rotations)}
                                                            className={`${cellClass} border-r border-b text-center cursor-pointer hover:brightness-95 hover:ring-1 hover:ring-blue-400 transition-all`}
                                                            style={{ width: '26px', minWidth: '26px', fontSize: '9px' }}
                                                            title={`Clique para gerenciar escala de ${member.name} na semana de ${formatHeaderDate(week.date)}`}
                                                        >
                                                            {status === 'FI' ? 'FI' : status === 'DBA' ? 'DBA' : status === 'STB' ? 'STB' : status === 'OFF-C' ? 'OFF-C' : status || '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}

                                        {gIdx < positionGroups.length - 1 && (
                                            <tr key={`div-${gIdx}`}>
                                                <td colSpan={3 + filteredWeeks.length} className="bg-white h-2 border-b border-black"></td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs px-4 py-2 border-t border-gray-200 shrink-0 bg-slate-50 overflow-x-auto">
                {legendItems.map(item => (
                    <div key={item.code} className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                            className="inline-block text-center font-bold px-1.5 py-0.5 border border-black text-[10px]"
                            style={{ backgroundColor: item.color, color: item.textColor, minWidth: '40px' }}
                        >
                            {item.code}
                        </span>
                        <span className="text-slate-600 font-semibold text-xs whitespace-nowrap">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Modal de gerenciamento de escalas */}
            {selectedCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                            <h3 className="text-base font-bold text-gray-800">
                                {selectedCell.rotationId && isUuid(selectedCell.rotationId)
                                    ? 'Editar/Excluir Evento de Escala'
                                    : 'Adicionar Evento de Escala'}
                            </h3>
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors text-lg font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 font-medium">Nome do Tripulante</p>
                            <p className="text-sm font-semibold text-gray-900 uppercase">{selectedCell.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Evento</label>
                                <select
                                    value={formTipo}
                                    onChange={(e) => setFormTipo(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                >
                                    <option value="normal">Embarcado (ON)</option>
                                    <option value="fi">Folga Indenizada (FI)</option>
                                    <option value="dba">Dobra (DBA)</option>
                                    <option value="stb">StandBy (STB)</option>
                                    <option value="offc">Troca de Turma/Folga (OFF-C)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Embarcação/Destino</label>
                                <input
                                    type="text"
                                    value={formVessel}
                                    onChange={(e) => setFormVessel(e.target.value)}
                                    placeholder="Ex: NORMAND..."
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Data Início</label>
                                <input
                                    type="date"
                                    value={formStart}
                                    onChange={(e) => setFormStart(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Data Fim</label>
                                <input
                                    type="date"
                                    value={formEnd}
                                    onChange={(e) => setFormEnd(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Local de Embarque (Origem)</label>
                            <input
                                type="text"
                                value={formLocalEmb}
                                onChange={(e) => setFormLocalEmb(e.target.value)}
                                placeholder="Cidade, Aeroporto ou Base"
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Observações / Comentários</label>
                            <textarea
                                value={formObs}
                                onChange={(e) => setFormObs(e.target.value)}
                                placeholder="Informações adicionais..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-150">
                            {selectedCell.rotationId && isUuid(selectedCell.rotationId) ? (
                                <button
                                    onClick={handleDeleteEvent}
                                    disabled={submittingEvent}
                                    className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    Excluir Evento
                                </button>
                            ) : (
                                <div />
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedCell(null)}
                                    className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    disabled={submittingEvent}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {submittingEvent ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
