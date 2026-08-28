'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FiDownload, FiSearch, FiMessageSquare, FiMove } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import {
    DEFAULT_TIPOS_EVENTO_ESCALA,
    hexToRgbNoHash,
    type GTTipoEventoEscala,
} from '@/lib/gestao-tripulantes/escala-tipos';

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
    rotation_type: string;
    observacoes?: string | null;
    tipo_codigo?: string;
    origem?: 'mio' | 'local';
    ativo?: boolean;
    exibir_dia_inicio?: boolean;
}

interface RotationCell {
    id: string;
    start: string | null;
    end: string | null;
    type: string;
    vessel: string;
    observacoes?: string | null;
    local_embarque?: string;
    exibir_dia_inicio?: boolean;
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
    const idx = POSITION_ORDER.findIndex((p) => norm.includes(p) || p.includes(norm));
    return idx >= 0 ? idx : 999;
}

function isUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const SCHEDULE_CACHE_TTL_MS = 60_000;
let scheduleCache: { fetchedAt: number; data: CrewSchedule[] } | null = null;
let scheduleInflight: Promise<CrewSchedule[]> | null = null;

async function loadScheduleRows(force = false): Promise<CrewSchedule[]> {
    if (force) {
        scheduleCache = null;
    }
    if (!force && scheduleCache && Date.now() - scheduleCache.fetchedAt < SCHEDULE_CACHE_TTL_MS) {
        return scheduleCache.data;
    }
    if (scheduleInflight) return scheduleInflight;
    scheduleInflight = (async () => {
        const res = await fetchWithToken('/api/man-schedule/realtime?janela=90d');
        if (!res.ok) {
            if (res.status === 503) {
                throw new Error('Cache MIO indisponível. Por favor, atualize o cache no painel administrativo.');
            }
            throw new Error('Erro ao buscar dados da escala.');
        }
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Erro na API');
        const data = (result.data || []) as CrewSchedule[];
        scheduleCache = { fetchedAt: Date.now(), data };
        return data;
    })().finally(() => {
        scheduleInflight = null;
    });
    return scheduleInflight;
}

// ---------------------------------------------------------------------------
// Module-level date formatters (shared by header cells and memoized rows)
// ---------------------------------------------------------------------------

const formatHeaderDate = (d: Date, locale: string) => {
    const dayStr = d.getDate().toString().padStart(2, '0');
    const monthStr = d.toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { month: 'short' });
    const yearStr = d.getFullYear().toString().substring(2);
    const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).replace('.', '');
    return `${dayStr}-${capitalizedMonth}-${yearStr}`;
};

const getDayAbbr = (d: Date, locale: string) => {
    return d.toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { weekday: 'short' }).replace('.', '');
};

// ---------------------------------------------------------------------------
// Memoized schedule row: pre-computes all cell metas once per (rotations x
// weeks) change instead of re-scanning every rotation on every parent render.
// ---------------------------------------------------------------------------

interface HoveredCommentData {
    x: number;
    y: number;
    name: string;
    status: string;
    style: { bg: string; text: string } | null;
    observacoes: string;
    startFormatted: string;
    vessel: string;
    weekDate: string;
}

interface ScheduleRowProps {
    member: { name: string; cpf: string; rotations: RotationCell[] };
    position: string;
    groupCount: number | string;
    groupBg: string;
    weeks: { date: Date }[];
    currentWeekKey: string | null;
    isOpening: boolean;
    locale: string;
    onNameClick: (cpf: string, name: string) => void;
    onCellClick: (cpf: string, name: string, date: Date, status: string, rotations: RotationCell[]) => void;
    onHoverComment: (data: HoveredCommentData) => void;
    onLeaveComment: () => void;
    getWeekRotationMeta: (
        weekDate: Date,
        rotations: RotationCell[]
    ) => {
        status: string;
        observacoes: string | null;
        type?: string;
        startDay: number | null;
        startFormatted: string;
        vessel: string;
        exibir_dia_inicio?: boolean;
    };
    getCellStyle: (rotationType: string) => { bg: string; text: string };
}

const ScheduleRow = React.memo(function ScheduleRow({
    member,
    position,
    groupCount,
    groupBg,
    weeks,
    currentWeekKey,
    isOpening,
    locale,
    onNameClick,
    onCellClick,
    onHoverComment,
    onLeaveComment,
    getWeekRotationMeta,
    getCellStyle,
}: ScheduleRowProps) {
    const cellMetas = useMemo(
        () =>
            weeks.map((week) => {
                const meta = getWeekRotationMeta(week.date, member.rotations);
                const status = meta.status;
                const hasComment = !!(meta.observacoes && String(meta.observacoes).trim());
                const isCurrentWeek =
                    currentWeekKey !== null && new Date(week.date).toDateString() === currentWeekKey;
                const style = status ? getCellStyle(meta.type || status) : null;

                const tooltipParts = [
                    `Clique para gerenciar escala de ${member.name} na semana de ${formatHeaderDate(week.date, locale)}`,
                ];
                if (meta.startFormatted) {
                    tooltipParts.push(`Início do evento: ${meta.startFormatted}`);
                }
                if (hasComment) {
                    tooltipParts.push(`Observações: ${meta.observacoes}`);
                }

                return {
                    status,
                    startDay: meta.startDay,
                    startFormatted: meta.startFormatted,
                    vessel: meta.vessel,
                    observacoes: meta.observacoes,
                    exibir_dia_inicio: meta.exibir_dia_inicio,
                    hasComment,
                    isCurrentWeek,
                    style,
                    tooltip: tooltipParts.join('\n\n'),
                };
            }),
        [weeks, member.rotations, member.name, getWeekRotationMeta, getCellStyle, currentWeekKey, locale]
    );

    return (
        <tr className="hover:bg-slate-50/50">
            <td
                onClick={() => onNameClick(member.cpf, member.name)}
                className={`bg-white text-blue-600 hover:text-blue-800 hover:underline font-bold px-3 py-1.5 border-r border-b border-black whitespace-nowrap overflow-hidden text-ellipsis sticky left-0 z-20 uppercase cursor-pointer transition-colors min-w-[260px] w-[260px] max-w-[260px] ${
                    isOpening ? 'opacity-50 animate-pulse' : ''
                }`}
                title={member.name}
            >
                {member.name || '\u00A0'}
            </td>
            <td className={`${groupBg} text-black font-bold text-center border-r border-b border-black sticky left-[260px] z-20 min-w-[70px] w-[70px] max-w-[70px]`}>
                {groupCount}
            </td>
            <td className={`${groupBg} text-black font-bold px-2 py-1.5 border-r border-b border-black uppercase sticky left-[330px] z-20 min-w-[170px] w-[170px] max-w-[170px] text-ellipsis overflow-hidden whitespace-nowrap`} title={position}>
                {position}
            </td>
            {cellMetas.map((cell, wIdx) => (
                <td
                    key={`cell-${wIdx}`}
                    onClick={() => onCellClick(member.cpf, member.name, weeks[wIdx].date, cell.status, member.rotations)}
                    onMouseEnter={(e) => {
                        if (cell.hasComment) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onHoverComment({
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                name: member.name,
                                status: cell.status || 'EVENTO',
                                style: cell.style,
                                observacoes: cell.observacoes || '',
                                startFormatted: cell.startFormatted,
                                vessel: cell.vessel,
                                weekDate: formatHeaderDate(weeks[wIdx].date, locale),
                            });
                        }
                    }}
                    onMouseLeave={() => {
                        if (cell.hasComment) {
                            onLeaveComment();
                        }
                    }}
                    className={`border-r border-b text-center cursor-pointer hover:brightness-95 hover:ring-2 hover:ring-blue-400 transition-all relative select-none ${
                        cell.isCurrentWeek ? '!border-yellow-500 !border-2' : 'border-black'
                    }`}
                    style={{
                        width: '36px',
                        minWidth: '36px',
                        maxWidth: '36px',
                        height: '38px',
                        backgroundColor: cell.isCurrentWeek ? '#fef9c3' : cell.style?.bg || '#ffffff',
                        color: cell.style?.text || '#9ca3af',
                    }}
                    title={cell.hasComment ? undefined : cell.tooltip}
                >
                    {cell.status ? (
                        <div className="flex flex-col items-center justify-center h-full w-full py-0.5 leading-tight">
                            <span className="font-bold text-[9px] tracking-tight truncate max-w-full px-0.5">
                                {cell.status}
                            </span>
                            {cell.exibir_dia_inicio && cell.startDay !== null && (
                                <span
                                    className="text-[7.5px] font-bold px-1 rounded-xs bg-black/15 text-current leading-none tracking-tighter mt-0.5 shadow-2xs"
                                    title={`Início em: ${cell.startFormatted || cell.startDay}`}
                                >
                                    d.{cell.startDay}
                                </span>
                            )}
                            {cell.hasComment && (
                                <div className="absolute top-0.5 right-0.5 flex items-center justify-center pointer-events-none">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-300 text-[9px]">-</span>
                    )}
                </td>
            ))}
        </tr>
    );
});

export default function GTManScheduleTab({ onColabClick }: Props) {
    const { t, locale } = useI18n();
    const [allSchedules, setAllSchedules] = useState<CrewSchedule[]>([]);
    const [tipos, setTipos] = useState<GTTipoEventoEscala[]>(
        DEFAULT_TIPOS_EVENTO_ESCALA.map((tipo, i) => ({ ...tipo, id: `default-${i}` }))
    );
    const [loading, setLoading] = useState(true);
    const [openingColab, setOpeningColab] = useState<string | null>(null);

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
    const [formExibirDia, setFormExibirDia] = useState(false);
    const [submittingEvent, setSubmittingEvent] = useState(false);

    const [filterStatusAtivo, setFilterStatusAtivo] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

    const [hoveredComment, setHoveredComment] = useState<HoveredCommentData | null>(null);

    const handleHoverComment = useCallback((data: HoveredCommentData) => {
        setHoveredComment(data);
    }, []);

    const handleLeaveComment = useCallback(() => {
        setHoveredComment(null);
    }, []);

    const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
        startX: 0,
        startY: 0,
        posX: 0,
        posY: 0,
    });

    const [searchName, setSearchName] = useState('');
    const [filterVessel, setFilterVessel] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterPosition, setFilterPosition] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) {
            return;
        }
        e.preventDefault();
        setIsDragging(true);
        const currentX = modalPos?.x ?? (typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 440) : 40);
        const currentY = modalPos?.y ?? 110;
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            posX: currentX,
            posY: currentY,
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;
        const touch = e.touches[0];
        setIsDragging(true);
        const currentX = modalPos?.x ?? (typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 440) : 40);
        const currentY = modalPos?.y ?? 110;
        dragRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            posX: currentX,
            posY: currentY,
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            const maxX = Math.max(10, window.innerWidth - 420);
            const maxY = Math.max(10, window.innerHeight - 200);
            const newX = Math.max(10, Math.min(maxX, dragRef.current.posX + dx));
            const newY = Math.max(10, Math.min(maxY, dragRef.current.posY + dy));
            setModalPos({ x: newX, y: newY });
        };

        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            const dx = touch.clientX - dragRef.current.startX;
            const dy = touch.clientY - dragRef.current.startY;
            const maxX = Math.max(10, window.innerWidth - 420);
            const maxY = Math.max(10, window.innerHeight - 200);
            const newX = Math.max(10, Math.min(maxX, dragRef.current.posX + dx));
            const newY = Math.max(10, Math.min(maxY, dragRef.current.posY + dy));
            setModalPos({ x: newX, y: newY });
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging]);

    const tipoByCodigo = useMemo(() => {
        const map = new Map<string, GTTipoEventoEscala>();
        for (const tipo of tipos) {
            map.set(tipo.codigo.toLowerCase(), tipo);
            map.set(tipo.display_code.toUpperCase(), tipo);
        }
        return map;
    }, [tipos]);

    const resolveTipo = useCallback(
        (codigoOrDisplay: string | null | undefined): GTTipoEventoEscala | undefined => {
            if (!codigoOrDisplay) return undefined;
            return (
                tipoByCodigo.get(codigoOrDisplay.toLowerCase()) ||
                tipoByCodigo.get(codigoOrDisplay.toUpperCase())
            );
        },
        [tipoByCodigo]
    );

    const getDisplayCode = useCallback(
        (rotationType: string): string => {
            const tipo = resolveTipo(rotationType);
            if (tipo) return tipo.display_code;
            if (rotationType === 'normal') return 'ON';
            if (rotationType === 'offc') return 'OFF-C';
            return rotationType.toUpperCase();
        },
        [resolveTipo]
    );

    const getCellStyle = useCallback(
        (rotationType: string): { bg: string; text: string } => {
            const tipo = resolveTipo(rotationType);
            if (tipo) return { bg: tipo.bg_color, text: tipo.text_color };
            const display = getDisplayCode(rotationType);
            if (display === 'OFF-C' || display === 'STB') return { bg: '#f4cccc', text: '#cc0000' };
            return { bg: '#e2efda', text: '#00b050' };
        },
        [resolveTipo, getDisplayCode]
    );

    const fetchTipos = useCallback(async () => {
        try {
            const res = await fetchWithToken('/api/gestao-tripulantes/tipos-evento');
            if (!res.ok) return;
            const result = await res.json();
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                setTipos(result.data);
            }
        } catch (err) {
            console.warn('Falha ao carregar tipos de evento; usando defaults.', err);
        }
    }, []);

    const fetchSchedules = useCallback(async (force = false) => {
        try {
            if (!scheduleCache) setLoading(true);
            const data = await loadScheduleRows(force);
            setAllSchedules(data);
        } catch (error: unknown) {
            console.error('Error fetching schedules:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar escala do MIO.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTipos();
        fetchSchedules();
    }, [fetchTipos, fetchSchedules]);

function parseLocalDate(str: string | null | undefined): Date | null {
    if (!str || typeof str !== 'string' || str.trim() === '') return null;
    const clean = str.trim().slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const parsed = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
}

    const getWeekRotation = useCallback((weekDate: Date, rotations: RotationCell[]) => {
        const wStart = new Date(weekDate);
        wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        for (const r of rotations) {
            if (!r.start) continue;
            const rStart = parseLocalDate(r.start);
            if (!rStart) continue;

            const rEnd = r.end ? parseLocalDate(r.end) : new Date(rStart.getTime() + 90 * 24 * 60 * 60 * 1000);
            if (!rEnd) continue;
            rEnd.setHours(23, 59, 59, 999);

            const overlaps = wStart <= rEnd && wEnd >= rStart;
            if (overlaps) return r;
        }
        return null;
    }, []);

    const handleCellClick = (cpf: string, name: string, date: Date, status: string, rotations: RotationCell[]) => {
        const matchingRotation = getWeekRotation(date, rotations);
        const rotId = matchingRotation?.id || '';
        const currentVessel = matchingRotation?.vessel || '';
        const formattedDate = date.toISOString().split('T')[0];

        const defaultEnd = new Date(date);
        defaultEnd.setDate(defaultEnd.getDate() + 14);
        const formattedEnd = defaultEnd.toISOString().split('T')[0];

        setSelectedCell({ cpf, name, date, status, rotationId: rotId, vessel: currentVessel });

        if (!modalPos && typeof window !== 'undefined') {
            setModalPos({
                x: Math.max(20, window.innerWidth - 440),
                y: 110,
            });
        }

        const mappedTipo = matchingRotation?.type || (status ? resolveTipo(status)?.codigo : null) || 'normal';
        setFormTipo(mappedTipo);
        setFormExibirDia(Boolean(matchingRotation?.exibir_dia_inicio));

        if (matchingRotation?.start && matchingRotation?.end && isUuid(rotId)) {
            setFormStart(matchingRotation.start.slice(0, 10));
            setFormEnd(matchingRotation.end.slice(0, 10));
            setFormLocalEmb(matchingRotation.local_embarque || '');
            setFormObs(matchingRotation.observacoes || '');
        } else {
            setFormStart(formattedDate);
            setFormEnd(formattedEnd);
            setFormLocalEmb(matchingRotation?.local_embarque || '');
            setFormObs(matchingRotation?.observacoes || '');
        }
        setFormVessel(currentVessel || '');
    };

    const handleSaveEvent = async () => {
        if (!selectedCell) return;
        try {
            setSubmittingEvent(true);
            const payload = {
                colaborador_cpf: selectedCell.cpf,
                tipo: formTipo,
                data_embarque: formStart,
                data_desembarque: formEnd,
                local_embarque: formLocalEmb,
                local_desembarque: formVessel,
                observacoes: formObs,
                exibir_dia_inicio: formExibirDia,
            };

            const editingId = selectedCell.rotationId && isUuid(selectedCell.rotationId)
                ? selectedCell.rotationId
                : null;

            const res = editingId
                ? await fetchWithToken(`/api/gestao-tripulantes/embarques/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetchWithToken('/api/gestao-tripulantes/embarques', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao salvar escala.');
            }

            toast.success(editingId ? 'Evento de escala atualizado!' : 'Evento de escala inserido com sucesso!');
            setSelectedCell(null);
            fetchSchedules(true);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Falha ao salvar evento.');
        } finally {
            setSubmittingEvent(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedCell?.rotationId) return;
        try {
            setSubmittingEvent(true);
            const res = await fetchWithToken(`/api/gestao-tripulantes/embarques/${selectedCell.rotationId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao excluir evento.');
            }

            toast.success('Evento de escala removido com sucesso!');
            setSelectedCell(null);
            fetchSchedules(true);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Falha ao remover evento.');
        } finally {
            setSubmittingEvent(false);
        }
    };

    const handleNameClick = async (cpf: string, fullName: string) => {
        if (!cpf) return;
        try {
            const cleanCpf = cpf.replace(/\D/g, '');
            if (!cleanCpf) return;

            setOpeningColab(cpf);
            const res = await fetchWithToken(
                `/api/gestao-tripulantes/colaboradores?cpf=${encodeURIComponent(cleanCpf)}&limit=1&lite=1`
            );
            if (!res.ok) throw new Error();
            const json = await res.json();
            const colab = json.data?.[0];

            if (colab?.id) {
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

    const filteredSchedules = useMemo(() => {
        const sName = searchName.trim().toLowerCase();
        const fVes = filterVessel.trim().toLowerCase();
        const fComp = filterCompany.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();

        return allSchedules.filter((s) => {
            const matchName = !sName || s.full_name?.toLowerCase().includes(sName);
            const matchVessel = !fVes || (s.vessel || '').trim().toLowerCase() === fVes;
            const matchCompany = !fComp || (s.company || '').trim().toLowerCase() === fComp;
            const matchPosition = !fPos || (s.position || '').trim().toLowerCase() === fPos;
            const matchAtivo =
                filterStatusAtivo === 'todos'
                    ? true
                    : filterStatusAtivo === 'inativos'
                    ? s.ativo === false
                    : s.ativo !== false;
            return matchName && matchVessel && matchCompany && matchPosition && matchAtivo;
        });
    }, [allSchedules, searchName, filterVessel, filterCompany, filterPosition, filterStatusAtivo]);

    const availableCompanies = useMemo(() => {
        const fVes = filterVessel.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();
        const valid = allSchedules
            .filter(
                (s) =>
                    (!fVes || (s.vessel || '').trim().toLowerCase() === fVes) &&
                    (!fPos || (s.position || '').trim().toLowerCase() === fPos) &&
                    (filterStatusAtivo === 'todos'
                        ? true
                        : filterStatusAtivo === 'inativos'
                        ? s.ativo === false
                        : s.ativo !== false)
            )
            .map((s) => (s.company || '').trim())
            .filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterVessel, filterPosition, filterStatusAtivo]);

    const availableVessels = useMemo(() => {
        const fComp = filterCompany.trim().toLowerCase();
        const fPos = filterPosition.trim().toLowerCase();
        const valid = allSchedules
            .filter(
                (s) =>
                    (!fComp || (s.company || '').trim().toLowerCase() === fComp) &&
                    (!fPos || (s.position || '').trim().toLowerCase() === fPos) &&
                    (filterStatusAtivo === 'todos'
                        ? true
                        : filterStatusAtivo === 'inativos'
                        ? s.ativo === false
                        : s.ativo !== false)
            )
            .map((s) => (s.vessel || '').trim())
            .filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterCompany, filterPosition, filterStatusAtivo]);

    const availablePositions = useMemo(() => {
        const fComp = filterCompany.trim().toLowerCase();
        const fVes = filterVessel.trim().toLowerCase();
        const valid = allSchedules
            .filter(
                (s) =>
                    (!fComp || (s.company || '').trim().toLowerCase() === fComp) &&
                    (!fVes || (s.vessel || '').trim().toLowerCase() === fVes) &&
                    (filterStatusAtivo === 'todos'
                        ? true
                        : filterStatusAtivo === 'inativos'
                        ? s.ativo === false
                        : s.ativo !== false)
            )
            .map((s) => (s.position || '').trim())
            .filter(Boolean);
        return Array.from(new Set(valid)).sort();
    }, [allSchedules, filterCompany, filterVessel, filterStatusAtivo]);

    const positionGroups = useMemo(() => {
        const byPosition: Record<string, { name: string; cpf: string; rotations: RotationCell[] }[]> = {};

        for (const s of filteredSchedules) {
            const pos = normalizePosition(s.position) || 'SEM CARGO';
            if (!byPosition[pos]) byPosition[pos] = [];

            const rotType = s.tipo_codigo || s.rotation_type || 'normal';
            const rotation: RotationCell = {
                id: s.id,
                start: s.rotation_start,
                end: s.rotation_end,
                type: rotType,
                vessel: s.vessel,
                observacoes: s.observacoes || null,
                local_embarque: s.local_embarque || '',
                exibir_dia_inicio: Boolean(s.exibir_dia_inicio),
            };

            const existing = byPosition[pos].find((c) => c.cpf === s.cpf);
            if (existing) {
                if (s.rotation_start || s.rotation_end) {
                    existing.rotations.push(rotation);
                }
            } else {
                byPosition[pos].push({
                    name: s.full_name,
                    cpf: s.cpf,
                    rotations: s.rotation_start || s.rotation_end ? [rotation] : [],
                });
            }
        }

        return Object.entries(byPosition)
            .sort(([a], [b]) => getPositionSortKey(a) - getPositionSortKey(b) || a.localeCompare(b))
            .map(([position, members]) => ({ position, members, count: members.length }));
    }, [filteredSchedules]);

    const { weeks } = useMemo(() => {
        let earliest: Date | null = null;
        let latest: Date | null = null;

        for (const group of positionGroups) {
            for (const m of group.members) {
                for (const r of m.rotations) {
                    if (r.start) {
                        const d = parseLocalDate(r.start);
                        if (d && (!earliest || d < earliest)) earliest = d;
                    }
                    if (r.end) {
                        const d = parseLocalDate(r.end);
                        if (d && (!latest || d > latest)) latest = d;
                    }
                }
            }
        }

        if (!earliest) earliest = new Date(new Date().getFullYear(), 0, 1);
        if (!latest) latest = new Date(new Date().getFullYear(), 11, 31);

        const snapToSaturday = (d: Date) => {
            const day = d.getDay();
            const diff = day >= 6 ? day - 6 : day + 1;
            d.setDate(d.getDate() - diff);
            return d;
        };

        const start = snapToSaturday(new Date(earliest));
        start.setDate(start.getDate() - 14);

        const endDate = new Date(latest);
        endDate.setDate(endDate.getDate() + 14);

        const totalWeeks = Math.max(
            Math.ceil((endDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
            12
        );

        const generatedWeeks = [];
        for (let i = 0; i < totalWeeks; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i * 7);
            generatedWeeks.push({ date: new Date(d) });
        }

        return { weeks: generatedWeeks, timelineStart: start };
    }, [positionGroups]);

    const filteredWeeks = useMemo(() => {
        if (!filterDateStart && !filterDateEnd) return weeks;
        const startDate = filterDateStart ? parseLocalDate(filterDateStart) : null;
        const endDate = filterDateEnd ? parseLocalDate(filterDateEnd) : null;

        return weeks.filter((w) => {
            const weekDate = new Date(w.date);
            weekDate.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
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

    const currentWeekKey = useMemo(
        () =>
            filteredWeeks[currentWeekIndex]?.date
                ? new Date(filteredWeeks[currentWeekIndex].date).toDateString()
                : null,
        [filteredWeeks, currentWeekIndex]
    );

    const scrollByAmount = useCallback((amount: number) => {
        if (!tableContainerRef.current) return;
        tableContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }, []);

    const scrollToCurrentWeek = useCallback(() => {
        if (!tableContainerRef.current || currentWeekIndex < 0) return;
        // Fixed columns take ~500px, 36px per week column
        const targetScrollLeft = Math.max(0, currentWeekIndex * 36 - 120);
        tableContainerRef.current.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });
    }, [currentWeekIndex]);

    useEffect(() => {
        if (!loading && filteredWeeks.length > 0) {
            const timer = setTimeout(scrollToCurrentWeek, 120);
            return () => clearTimeout(timer);
        }
    }, [loading, filteredWeeks.length, scrollToCurrentWeek]);

    const getWeekStatus = useCallback(
        (weekDate: Date, rotations: RotationCell[]): string => {
            const rot = getWeekRotation(weekDate, rotations);
            return rot ? getDisplayCode(rot.type || 'normal') : '';
        },
        [getWeekRotation, getDisplayCode]
    );

    const getWeekRotationMeta = useCallback(
        (weekDate: Date, rotations: RotationCell[]) => {
            const rot = getWeekRotation(weekDate, rotations);
            if (!rot) {
                return {
                    status: '',
                    observacoes: null as string | null,
                    type: undefined,
                    startDay: null,
                    startFormatted: '',
                    vessel: '',
                    exibir_dia_inicio: false,
                };
            }

            let startDay: number | null = null;
            let startFormatted = '';
            if (rot.start) {
                const parsed = parseLocalDate(rot.start);
                if (parsed) {
                    startDay = parsed.getDate();
                    const dStr = String(parsed.getDate()).padStart(2, '0');
                    const mStr = String(parsed.getMonth() + 1).padStart(2, '0');
                    const yStr = parsed.getFullYear();
                    startFormatted = `${dStr}/${mStr}/${yStr}`;
                }
            }

            return {
                status: getDisplayCode(rot.type || 'normal'),
                observacoes: rot.observacoes || null,
                type: rot.type,
                startDay,
                startFormatted,
                vessel: rot.vessel || '',
                exibir_dia_inicio: Boolean(rot.exibir_dia_inicio),
            };
        },
        [getWeekRotation, getDisplayCode]
    );

    const vesselDisplayName =
        filterVessel && filterCompany
            ? `${filterCompany.toUpperCase()} - ${filterVessel.toUpperCase()}`
            : filterVessel
                ? filterVessel.toUpperCase()
                : filterCompany
                    ? filterCompany.toUpperCase()
                    : t('manSchedule.allVessels', 'Todas as Embarcações');

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
    }, [positionGroups, filteredWeeks, getWeekStatus]);

    const legendItems = useMemo(() => {
        const active = tipos.filter((tipo) => tipo.ativo);
        const fromDb = active
            .filter((tipo) => presentStatuses.has(tipo.display_code))
            .map((tipo) => ({
                code: tipo.display_code,
                color: tipo.bg_color,
                textColor: tipo.text_color,
                label: tipo.label,
            }));

        // Include any status present in grid but missing from tipos config
        const known = new Set(fromDb.map((i) => i.code));
        for (const code of presentStatuses) {
            if (!known.has(code)) {
                const style = getCellStyle(code);
                fromDb.push({
                    code,
                    color: style.bg,
                    textColor: style.text,
                    label: code,
                });
            }
        }
        return fromDb;
    }, [tipos, presentStatuses, getCellStyle]);

    const exportToExcel = async () => {
        const table = document.getElementById('man-schedule-table');
        if (!table) return;
        const xlsxMod = await import('xlsx-js-style') as { utils?: unknown; default?: { utils?: unknown } };
        const XLSX = (xlsxMod.utils ? xlsxMod : xlsxMod.default) as typeof import('xlsx-js-style');
        const wb = XLSX.utils.table_to_book(table, { sheet: 'Schedule' });
        const ws = wb.Sheets['Schedule'];

        const colWidths = [
            { wch: 35 },
            { wch: 8 },
            { wch: 25 },
            ...filteredWeeks.map(() => ({ wch: 12 })),
        ];
        ws['!cols'] = colWidths;

        const colorByCode: Record<string, { bg: string; text: string }> = {};
        for (const item of legendItems) {
            colorByCode[item.code] = {
                bg: hexToRgbNoHash(item.color),
                text: hexToRgbNoHash(item.textColor, '00B050'),
            };
        }

        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = ws[cell_ref];

                if (!cell) continue;

                const defaultBorder = {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } },
                };

                const cellStyle: any = {
                    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
                };

                if (typeof cell.v === 'string') {
                    cell.v = cell.v.replace(/\n|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                }

                if (R === 0) {
                    cellStyle.font = { bold: true, color: { rgb: C < 3 ? 'FFFFFF' : '002060' }, sz: 12 };
                    cellStyle.fill = { fgColor: { rgb: C < 3 ? '002060' : 'E2EFDA' } };
                    cellStyle.border = defaultBorder;
                } else if (R === 1 || R === 2) {
                    cellStyle.font = { bold: true, color: { rgb: '000000' }, sz: 10 };
                    cellStyle.border = defaultBorder;
                } else {
                    const code = typeof cell.v === 'string' ? cell.v.replace(/\s*💬\s*$/, '').trim() : '';
                    if (code && colorByCode[code]) {
                        cellStyle.fill = { fgColor: { rgb: colorByCode[code].bg } };
                        cellStyle.font = { color: { rgb: colorByCode[code].text }, bold: true, sz: 10 };
                        cellStyle.border = defaultBorder;
                        cell.v = code;
                    } else if (cell.v) {
                        cellStyle.font = { color: { rgb: C === 0 ? '002060' : '000000' }, bold: C < 3, sz: 10 };
                        if (C === 1 || C === 2) cellStyle.fill = { fgColor: { rgb: 'E7E6E6' } };
                        cellStyle.alignment.horizontal = C === 0 ? 'left' : 'center';
                        cellStyle.border = defaultBorder;
                    }
                }

                cell.s = cellStyle;
            }
        }

        const lastRow = range.e.r + 3;
        let legendCol = 0;
        for (const item of legendItems) {
            const codeCellRef = XLSX.utils.encode_cell({ c: legendCol, r: lastRow });
            const labelCellRef = XLSX.utils.encode_cell({ c: legendCol + 1, r: lastRow });

            ws[codeCellRef] = {
                v: item.code,
                s: {
                    fill: { fgColor: { rgb: hexToRgbNoHash(item.color) } },
                    font: { bold: true, color: { rgb: hexToRgbNoHash(item.textColor, '00B050') }, sz: 10 },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } },
                    },
                },
            };
            ws[labelCellRef] = {
                v: item.label,
                s: {
                    font: { bold: true, sz: 10 },
                    alignment: { horizontal: 'left', vertical: 'center' },
                },
            };
            legendCol += 3;
        }

        ws['!ref'] = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: lastRow, c: Math.max(range.e.c, legendCol) },
        });

        const safeName = (filterVessel || 'All_Vessels').replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `Man_Schedule_${safeName}.xlsx`);
        toast.success(t('manSchedule.exportedSuccess', 'Planilha exportada com sucesso!'));
    };

    const groupColors = ['bg-[#d9e1f2]', 'bg-[#b4c6e7]'];
    const activeTiposForSelect = tipos.filter((tipo) => tipo.ativo);
    const editingLocal = !!(selectedCell?.rotationId && isUuid(selectedCell.rotationId));

    return (
        <div className="flex flex-col h-full w-full border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-50/90 px-3 py-2 border-b border-gray-200 shrink-0">
                <div className="flex items-end gap-2.5 w-full flex-wrap">
                    <div className="min-w-[160px] flex-shrink-0 flex-1 md:flex-initial">
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

                    <div className="min-w-[110px] flex-shrink-0">
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

                    <div className="min-w-[110px] flex-shrink-0">
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

                    <div className="min-w-[110px] flex-shrink-0">
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
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                        <select
                            className="w-full px-2 py-1.5 border border-blue-200 bg-blue-50/50 text-blue-900 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate transition-all"
                            value={filterStatusAtivo}
                            onChange={(e) => setFilterStatusAtivo(e.target.value as 'ativos' | 'inativos' | 'todos')}
                        >
                            <option value="ativos">Apenas Ativos</option>
                            <option value="inativos">Apenas Inativos</option>
                            <option value="todos">Todos (Ativos + Inativos)</option>
                        </select>
                    </div>

                    <div className="min-w-[120px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.dateStart', 'Data Inicio')}</label>
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        />
                    </div>

                    <div className="min-w-[120px] flex-shrink-0">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('manSchedule.dateEnd', 'Data Fim')}</label>
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 self-end h-[34px]">
                        <button
                            onClick={() => scrollByAmount(-320)}
                            disabled={loading}
                            title={t('manSchedule.prevWeeks', 'Semanas anteriores')}
                            className="px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition text-sm font-bold"
                        >
                            ‹
                        </button>
                        <button
                            onClick={scrollToCurrentWeek}
                            disabled={loading}
                            title={t('manSchedule.currentWeek', 'Ir para semana atual')}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition font-semibold text-xs whitespace-nowrap"
                        >
                            {t('manSchedule.today', 'Hoje')}
                        </button>
                        <button
                            onClick={() => scrollByAmount(320)}
                            disabled={loading}
                            title={t('manSchedule.nextWeeks', 'Próximas semanas')}
                            className="px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition text-sm font-bold"
                        >
                            ›
                        </button>
                    </div>

                    <button
                        onClick={exportToExcel}
                        disabled={loading || allSchedules.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition font-semibold text-xs flex-shrink-0 self-end h-[34px] ml-auto"
                    >
                        <FiDownload />
                        {t('manSchedule.exportXLSX', 'Exportar XLSX')}
                    </button>
                </div>
            </div>

            <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 relative w-full">
                <table id="man-schedule-table" className="w-max min-w-full border-collapse font-sans text-xs bg-white">
                    <thead className="sticky top-0 z-40 bg-white">
                        <tr>
                            <th
                                colSpan={3}
                                className="bg-[#002060] text-white text-left px-3 py-2.5 font-bold border-r border-b border-black align-middle sticky left-0 z-30 min-w-[500px] w-[500px]"
                                style={{ fontSize: '12px' }}
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
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-0 z-30 min-w-[260px] w-[260px] max-w-[260px] px-2 py-2">
                                {t('manSchedule.tableHeaders.name', 'NOME')}
                            </th>
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-[260px] z-30 px-2 py-2 min-w-[70px] w-[70px] max-w-[70px]">
                                {t('manSchedule.tableHeaders.reqOnboard', "QTD.\nEMBARC").split('\n').map((line, i, arr) => (
                                    <React.Fragment key={i}>
                                        {line}{i !== arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </th>
                            <th className="bg-slate-50 text-slate-700 font-bold text-center border-r border-b border-black sticky left-[330px] z-30 px-3 py-2 min-w-[170px] w-[170px] max-w-[170px]">
                                {t('manSchedule.tableHeaders.rank', 'CARGO')}
                            </th>
                            {filteredWeeks.map((week, idx) => {
                                const isCurrentWeek =
                                    currentWeekKey !== null &&
                                    new Date(week.date).toDateString() === currentWeekKey;
                                return (
                                    <th
                                        key={`date-${idx}`}
                                        className={`text-center border-r border-b align-bottom pt-2 pb-1 ${
                                            isCurrentWeek
                                                ? 'bg-yellow-100 text-yellow-850 font-bold border-yellow-500 border-2'
                                                : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                        }`}
                                        style={{ height: '90px', width: '36px', minWidth: '36px', maxWidth: '36px' }}
                                    >
                                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', letterSpacing: '0.5px', fontSize: '10px' }}>
                                            {formatHeaderDate(week.date, locale)}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>

                        <tr>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-0 z-30"></th>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-[260px] z-30"></th>
                            <th className="bg-slate-50 border-r border-b border-black sticky left-[330px] z-30"></th>
                            {filteredWeeks.map((week, idx) => {
                                const isCurrentWeek =
                                    currentWeekKey !== null &&
                                    new Date(week.date).toDateString() === currentWeekKey;
                                return (
                                    <th
                                        key={`day-${idx}`}
                                        className={`text-center border-r border-b py-0.5 ${
                                            isCurrentWeek
                                                ? 'bg-yellow-100 text-yellow-800 font-bold border-yellow-500 border-2'
                                                : 'bg-[#e2efda] text-[#00b050] font-bold border-black'
                                        }`}
                                        style={{ fontSize: '10px', width: '36px', minWidth: '36px', maxWidth: '36px' }}
                                    >
                                        {getDayAbbr(week.date, locale)}
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
                                <td colSpan={3 + filteredWeeks.length} className="px-4 py-8 text-center text-gray-400 bg-white">
                                    {t('manSchedule.empty', 'Nenhum tripulante encontrado para os filtros selecionados.')}
                                </td>
                            </tr>
                        ) : (
                            positionGroups.map((group, gIdx) => {
                                const bg = groupColors[gIdx % groupColors.length];
                                return (
                                    <React.Fragment key={`group-${gIdx}`}>
                                        {group.members.map((member, mIdx) => (
                                            <ScheduleRow
                                                key={`row-${gIdx}-${mIdx}-${member.cpf}`}
                                                member={member}
                                                position={group.position}
                                                groupCount={mIdx === 0 ? group.count : ''}
                                                groupBg={bg}
                                                weeks={filteredWeeks}
                                                currentWeekKey={currentWeekKey}
                                                isOpening={openingColab === member.cpf}
                                                locale={locale}
                                                onNameClick={handleNameClick}
                                                onCellClick={handleCellClick}
                                                onHoverComment={handleHoverComment}
                                                onLeaveComment={handleLeaveComment}
                                                getWeekRotationMeta={getWeekRotationMeta}
                                                getCellStyle={getCellStyle}
                                            />
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

            <div className="flex items-center gap-3 text-xs px-3 py-1.5 border-t border-gray-200 shrink-0 bg-slate-50 overflow-x-auto">
                {legendItems.map((item) => (
                    <div key={item.code} className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                            className="inline-block text-center font-bold px-1.5 py-0.5 border border-black text-[10px]"
                            style={{ backgroundColor: item.color, color: item.textColor, minWidth: '38px' }}
                        >
                            {item.code}
                        </span>
                        <span className="text-slate-600 font-semibold text-xs whitespace-nowrap">{item.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-200/80 text-slate-700 font-semibold text-[10px] px-2 py-0.5 rounded-md ml-1">
                    <span className="font-mono font-bold">d.X</span>
                    <span className="font-normal text-slate-600">= Dia inicial do evento</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-600 ml-auto">
                    <span className="relative flex h-2 w-2 mr-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                    </span>
                    <FiMessageSquare className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-medium text-slate-700">= observação (passe o mouse)</span>
                </div>
            </div>

            {/* Animated Floating Speech Bubble for Observações / Comments */}
            {hoveredComment && (
                <div
                    className="fixed z-50 pointer-events-none transition-all duration-200 ease-out transform -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                        left: `${hoveredComment.x}px`,
                        top: `${Math.max(65, hoveredComment.y - 6)}px`,
                        width: '280px',
                    }}
                >
                    <div className="bg-slate-900/95 text-white rounded-2xl p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 relative drop-shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border border-black/40 shadow-xs"
                                    style={{
                                        backgroundColor: hoveredComment.style?.bg || '#3b82f6',
                                        color: hoveredComment.style?.text || '#ffffff',
                                    }}
                                >
                                    {hoveredComment.status}
                                </span>
                                <span className="text-[11px] font-bold text-slate-100 uppercase truncate">
                                    {hoveredComment.name}
                                </span>
                            </div>
                        </div>

                        {/* Event info tags */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2 flex-wrap">
                            {hoveredComment.startFormatted && (
                                <span className="bg-slate-800 px-2 py-0.5 rounded-md font-mono text-emerald-300 font-semibold border border-slate-700/60">
                                    📅 Início: {hoveredComment.startFormatted}
                                </span>
                            )}
                            {hoveredComment.vessel && (
                                <span className="bg-slate-800 px-2 py-0.5 rounded-md text-sky-300 font-medium border border-slate-700/60 truncate max-w-[130px]">
                                    🚢 {hoveredComment.vessel}
                                </span>
                            )}
                        </div>

                        {/* Comment Body */}
                        <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-start gap-2">
                            <FiMessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-100 font-normal leading-relaxed break-words whitespace-pre-wrap">
                                {hoveredComment.observacoes}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                            <span className="text-blue-300 font-semibold">Semana {hoveredComment.weekDate}</span>
                            <span className="text-slate-400">Clique na célula para editar</span>
                        </div>

                        {/* Speech Bubble Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 border-b border-r border-slate-700/80 transform rotate-45" />
                    </div>
                </div>
            )}

            {selectedCell && (
                <div
                    className="fixed z-50 pointer-events-auto"
                    style={{
                        left: `${modalPos?.x ?? (typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 440) : 40)}px`,
                        top: `${modalPos?.y ?? 110}px`,
                        width: '420px',
                        maxWidth: 'calc(100vw - 32px)',
                    }}
                >
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col transition-shadow duration-200 ring-1 ring-black/10">
                        {/* Draggable Header */}
                        <div
                            onMouseDown={handleDragStart}
                            onTouchStart={handleTouchStart}
                            className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-move select-none group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded bg-slate-200 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    <FiMove className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                                        {editingLocal ? 'Editar Evento de Escala' : 'Novo Evento de Escala'}
                                        {editingLocal && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-bold uppercase">
                                                Local
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-normal">Arraste para mover o painel</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors font-bold text-base"
                                title="Fechar"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 flex flex-col gap-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {/* Tripulante Details Card */}
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                                <div className="truncate mr-2">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tripulante</span>
                                    <p className="text-xs font-bold text-slate-900 uppercase truncate">{selectedCell.name}</p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono font-medium shrink-0">
                                    {selectedCell.cpf}
                                </span>
                            </div>

                            {/* Event Type & Vessel */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Evento</label>
                                    <select
                                        value={formTipo}
                                        onChange={(e) => setFormTipo(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        {activeTiposForSelect.map((tipo) => (
                                            <option key={tipo.id} value={tipo.codigo}>
                                                {tipo.label} ({tipo.display_code})
                                            </option>
                                        ))}
                                    </select>
                                    {resolveTipo(formTipo) && (
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            <span
                                                className="inline-block min-w-[36px] text-center font-bold px-1.5 py-0.5 border border-black/80 rounded-sm text-[10px]"
                                                style={{
                                                    backgroundColor: resolveTipo(formTipo)!.bg_color,
                                                    color: resolveTipo(formTipo)!.text_color,
                                                }}
                                            >
                                                {resolveTipo(formTipo)!.display_code}
                                            </span>
                                            <span className="text-[10px] text-slate-500 truncate">{resolveTipo(formTipo)!.label}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Embarcação / Destino</label>
                                    <input
                                        type="text"
                                        value={formVessel}
                                        onChange={(e) => setFormVessel(e.target.value)}
                                        placeholder="Ex: NORMAND..."
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Início</label>
                                    <input
                                        type="date"
                                        value={formStart}
                                        onChange={(e) => setFormStart(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        value={formEnd}
                                        onChange={(e) => setFormEnd(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    />
                                </div>
                            </div>

                            {/* Toggle Indicação do Dia de Início */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                                <div className="pr-3">
                                    <label htmlFor="exibir-dia-toggle" className="text-xs font-semibold text-slate-800 cursor-pointer block">
                                        Indicar dia de início na célula (d.X)
                                    </label>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Exibe o dia de início ({formStart ? `d.${parseInt(formStart.split('-')[2] || '0', 10)}` : 'd.X'}) na célula da escala
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        id="exibir-dia-toggle"
                                        type="checkbox"
                                        checked={formExibirDia}
                                        onChange={(e) => setFormExibirDia(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Origin / Local Embarque */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Local de Embarque (Origem)</label>
                                <input
                                    type="text"
                                    value={formLocalEmb}
                                    onChange={(e) => setFormLocalEmb(e.target.value)}
                                    placeholder="Cidade, Aeroporto ou Base"
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                />
                            </div>

                            {/* Observations */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações / Comentários</label>
                                <textarea
                                    value={formObs}
                                    onChange={(e) => setFormObs(e.target.value)}
                                    placeholder="Informações adicionais..."
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                                />
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 mt-1">
                                {editingLocal ? (
                                    <button
                                        onClick={handleDeleteEvent}
                                        disabled={submittingEvent}
                                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        Excluir Evento
                                    </button>
                                ) : (
                                    <div />
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedCell(null)}
                                        className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveEvent}
                                        disabled={submittingEvent}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                                    >
                                        {submittingEvent ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Salvar'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
