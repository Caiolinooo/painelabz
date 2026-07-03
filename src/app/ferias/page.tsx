'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiPlus, FiClock, FiCheckCircle, FiXCircle, FiX, FiAlertCircle, FiUser, FiInfo, FiList, FiInbox, FiSearch, FiEye, FiTrash2, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { LeaveRequest } from '@/services/leaveService';
import MainLayout from '@/components/Layout/MainLayout';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS,
    validateLeaveAdvanceNotice,
    formatDatePTBR,
    LEAVE_ADVANCE_NOTICE_DAYS as FALLBACK_ADVANCE_DAYS
} from '@/lib/leaveConfig';

interface UnifiedUser {
    id: string;
    name: string;
    email: string;
    sector_id: string;
    sector?: { name: string };
}

interface RequestWithUser extends LeaveRequest {
    user: UnifiedUser;
    sector?: { name: string };
}

export default function FeriasPage() {
    const { user, getToken } = useSupabaseAuth();
    const [activeTab, setActiveTab] = useState<'my_leaves' | 'approvals' | 'all_requests'>('my_leaves');
    const [isApprover, setIsApprover] = useState(false);
    const [hasFeriasAdmin, setHasFeriasAdmin] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ==========================================
    // EMPLOYEE STATES (My Leaves)
    // ==========================================
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<{
        periods: { startDate: string; endDate: string }[];
        justification: string;
        pecuniaryAllowance: boolean;
        advance13thSalary: boolean;
    }>({
        periods: [{ startDate: '', endDate: '' }],
        justification: '',
        pecuniaryAllowance: false,
        advance13thSalary: false
    });

    // ==========================================
    // APPROVER STATES (Approvals)
    // ==========================================
    const [approvals, setApprovals] = useState<LeaveRequest[]>([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // ==========================================
    // ALL REQUESTS (Admin) STATES
    // ==========================================
    const [allRequests, setAllRequests] = useState<RequestWithUser[]>([]);
    const [loadingAllRequests, setLoadingAllRequests] = useState(false);
    const [allRequestsFilter, setAllRequestsFilter] = useState<string>('ALL');
    const [allRequestsSearch, setAllRequestsSearch] = useState('');
    const [selectedAllReq, setSelectedAllReq] = useState<RequestWithUser | null>(null);
    const [isAllReqModalOpen, setIsAllReqModalOpen] = useState(false);
    const [allReqActionReason, setAllReqActionReason] = useState('');
    const [allReqModalProcessing, setAllReqModalProcessing] = useState(false);

    // ==========================================
    // LEAVE CONFIG (carregado do banco via API)
    // ==========================================
    // Prazo de antecedência e data mínima são configuráveis via painel admin
    // em /admin/leave-settings. Carregamos aqui para usar nas validações
    // client-side. Antes do load, usamos o fallback default.
    const [advanceNoticeDays, setAdvanceNoticeDays] = useState<number>(DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS);
    const [minStartDate, setMinStartDate] = useState<string>('');
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        loadLeaveConfig();
    }, []);

    const loadLeaveConfig = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/leave/config', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                if (typeof data.advanceNoticeDays === 'number' && data.advanceNoticeDays > 0) {
                    setAdvanceNoticeDays(data.advanceNoticeDays);
                }
                if (data.minStartDate) {
                    setMinStartDate(data.minStartDate);
                }
            }
        } catch (error) {
            console.error('Error loading leave config (using fallback):', error);
        } finally {
            setConfigLoaded(true);
        }
    };

    /**
     * Valida a data de início contra o prazo de antecedência configurado.
     * Usa o valor carregado do banco (state) com fallback para o default.
     */
    const validateAdvanceNoticeForCurrentConfig = (startDate: string) => {
        // O validateLeaveAdvanceNotice síncrono usa LEAVE_ADVANCE_NOTICE_DAYS
        // (fallback). Se o estado carregou um valor diferente do banco,
        // usamos uma versão customizada para validar com o valor correto.
        if (advanceNoticeDays === FALLBACK_ADVANCE_DAYS) {
            return validateLeaveAdvanceNotice(startDate);
        }
        // Implementação local usando o advanceNoticeDays do state
        if (!startDate) {
            return { valid: false, errorMessage: 'Data de início é obrigatória' };
        }
        const [year, month, day] = startDate.split('-').map(Number);
        if (!year || !month || !day) {
            return { valid: false, errorMessage: 'Data de início inválida' };
        }
        const start = new Date(year, month - 1, day, 12, 0, 0);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const diffDays = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < advanceNoticeDays) {
            const minDate = minStartDate || (() => {
                const d = new Date();
                d.setDate(d.getDate() + advanceNoticeDays);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })();
            return {
                valid: false,
                errorMessage: `A data de início das férias deve ser solicitada com no mínimo ${advanceNoticeDays} dias de antecedência (solicitação do DP para cumprimento do prazo legal de processamento). A data mais próxima permitida é ${formatDatePTBR(minDate)}.`,
                minDate,
                daysAhead: diffDays
            };
        }
        return { valid: true, daysAhead: diffDays };
    };

    useEffect(() => {
        if (user?.id) {
            loadRequests();
            loadApprovals();
            loadPermissions();
        }
    }, [user]);

    useEffect(() => {
        if (hasFeriasAdmin && user?.id) {
            loadAllRequests();
        }
    }, [hasFeriasAdmin, allRequestsFilter]);

    const loadPermissions = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/user/effective-permissions', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setHasFeriasAdmin(!!data.effective_modules?.ferias_admin);
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    };

    // ==========================================
    // DATA FETCHING
    // ==========================================
    const loadRequests = async () => {
        try {
            setLoading(true);
            const token = getToken();
            const res = await fetch(`/api/leave/requests?userId=${user?.id}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to load my requests');
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error('Error loading my requests:', error);
            toast.error('Erro ao carregar suas solicitações de férias');
        } finally {
            setLoading(false);
        }
    };

    const loadApprovals = async () => {
        try {
            setLoadingApprovals(true);
            const token = getToken();
            const res = await fetch(`/api/admin/leave-approvals?approverId=${user?.id}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to load pending approvals');
            const data = await res.json();
            setIsApprover(data.isApprover);
            setApprovals(data.requests || []);
        } catch (error) {
            console.error('Error loading approvals:', error);
        } finally {
            setLoadingApprovals(false);
        }
    };

    const loadAllRequests = async () => {
        try {
            setLoadingAllRequests(true);
            const queryParams = new URLSearchParams();
            if (allRequestsFilter !== 'ALL') queryParams.append('status', allRequestsFilter);
            const token = getToken();
            const res = await fetch(`/api/admin/leave-requests?${queryParams.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to fetch requests');
            const data = await res.json();
            setAllRequests(data.requests || []);
        } catch (error) {
            console.error('Error fetching all requests:', error);
            toast.error('Erro ao carregar solicitações.');
        } finally {
            setLoadingAllRequests(false);
        }
    };

    // ==========================================
    // EMPLOYEE HANDLERS
    // ==========================================
    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        let totalDuration = 0;
        let has14DaysPeriod = false;

        const preparedPeriods = [];
        let globalStart: Date | null = null;
        let globalEnd: Date | null = null;

        for (let i = 0; i < formData.periods.length; i++) {
            const p = formData.periods[i];
            if (!p.startDate || !p.endDate) {
                toast.error(`As datas do período ${i + 1} são obrigatórias.`);
                return;
            }

            const start = new Date(`${p.startDate}T12:00:00Z`);
            const end = new Date(`${p.endDate}T12:00:00Z`);

            if (start > end) {
                toast.error(`No período ${i + 1}, a data final não pode ser anterior à data inicial.`);
                return;
            }

            const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            totalDuration += duration;

            if (duration < 5) {
                toast.error(`Pela CLT, o período mínimo de férias é de 5 dias. (Período ${i + 1} tem ${duration} dias).`);
                return;
            }

            if (duration >= 14) {
                has14DaysPeriod = true;
            }

            const startDay = start.getUTCDay();
            if ([0, 4, 5, 6].includes(startDay)) {
                toast.error(`Pela CLT, as férias não podem iniciar em DSR ou nos dois dias que o antecedem (Quinta, Sexta, Sábado ou Domingo). Verifique o período ${i + 1}.`);
                return;
            }

            preparedPeriods.push({
                start_date: p.startDate,
                end_date: p.endDate,
                duration
            });

            if (!globalStart || start < globalStart) globalStart = start;
            if (!globalEnd || end > globalEnd) globalEnd = end;
        }

        if (formData.periods.length > 1 && !has14DaysPeriod) {
            toast.error('Ao dividir as férias em mais de um período, um deles deve ter no mínimo 14 dias (CLT).');
            return;
        }

        // Validação do prazo de antecedência (solicitação do DP - configurável via admin)
        // Aplica sobre a data de início do primeiro período
        const firstStartDate = formData.periods[0]?.startDate || '';
        const advanceValidation = validateAdvanceNoticeForCurrentConfig(firstStartDate);
        if (!advanceValidation.valid) {
            toast.error(advanceValidation.errorMessage || `A data de início deve ter no mínimo ${advanceNoticeDays} dias de antecedência.`);
            return;
        }

        try {
            setSubmitting(true);
            const token = getToken();
            const res = await fetch('/api/leave/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    user_id: user.id,
                    start_date: formData.periods[0].startDate, // Keep for backward comp / boundary tracking
                    end_date: formData.periods[formData.periods.length - 1].endDate,
                    periods: preparedPeriods,
                    justification: formData.justification,
                    pecuniary_allowance: formData.pecuniaryAllowance,
                    advance_13th_salary: formData.advance13thSalary
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData?.error || 'Erro ao enviar solicitação';
                toast.error(errMsg);
                setSubmitting(false);
                return;
            }

            toast.success('Solicitação de férias enviada com sucesso!');
            setShowModal(false);
            setFormData({ periods: [{ startDate: '', endDate: '' }], justification: '', pecuniaryAllowance: false, advance13thSalary: false });
            loadRequests();
        } catch (error) {
            console.error('Error submitting leave request:', error);
            toast.error('Erro ao enviar solicitação');
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // APPROVER HANDLERS
    // ==========================================
    const handleApprove = async (req: LeaveRequest) => {
        if (!user?.id) return;
        try {
            setProcessingId(req.id);
            const token = getToken();
            const res = await fetch('/api/admin/leave-approvals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    request_id: req.id,
                    approver_id: user.id,
                    action: 'APPROVE'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve');

            toast.success(data.newStatus === 'APPROVED' ? 'Férias Aprovadas!' : 'Aprovação registrada! Encaminhado ao gerente.');
            loadApprovals();
        } catch (error: any) {
            console.error('Approve error:', error);
            toast.error(error.message || 'Falha ao aprovar');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (req: LeaveRequest) => {
        setRejectingRequest(req);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const submitReject = async () => {
        if (!user?.id || !rejectingRequest) return;
        if (!rejectReason.trim()) {
            toast.error('A justificativa é obrigatória para rejeições.');
            return;
        }

        try {
            setProcessingId(rejectingRequest.id);
            const token = getToken();
            const res = await fetch('/api/admin/leave-approvals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    request_id: rejectingRequest.id,
                    approver_id: user.id,
                    action: 'REJECT',
                    reason: rejectReason
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reject');

            toast.success('Solicitação rejeitada com sucesso.');
            setShowRejectModal(false);
            loadApprovals();
            // In case the requester themselves is viewing this, reload their requests too
            loadRequests();
        } catch (error: any) {
            console.error('Reject error:', error);
            toast.error(error.message || 'Falha ao rejeitar');
        } finally {
            setProcessingId(null);
        }
    };

    // ==========================================
    // ALL REQUESTS HANDLERS
    // ==========================================
    const handleAllReqAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !allReqActionReason.trim()) {
            toast.error('Por favor, informe um motivo para a rejeição.');
            return;
        }
        try {
            setAllReqModalProcessing(true);
            const token = getToken();
            const response = await fetch('/api/admin/leave-approvals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    request_id: requestId,
                    action,
                    reason: allReqActionReason,
                    force_admin: true
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha ao processar');
            toast.success(action === 'APPROVE' ? 'Férias aprovadas!' : 'Férias rejeitadas.');
            setIsAllReqModalOpen(false);
            setAllReqActionReason('');
            loadAllRequests();
            loadRequests();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao processar.');
        } finally {
            setAllReqModalProcessing(false);
        }
    };

    const handleAllReqDelete = async (requestId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
        try {
            setAllReqModalProcessing(true);
            const token = getToken();
            const response = await fetch(`/api/admin/leave-requests?id=${requestId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Falha ao excluir');
            }
            toast.success('Solicitação excluída!');
            setIsAllReqModalOpen(false);
            loadAllRequests();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir.');
        } finally {
            setAllReqModalProcessing(false);
        }
    };

    const getAllReqStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><FiCheckCircle className="mr-1" /> Aprovado</span>;
            case 'REJECTED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><FiXCircle className="mr-1" /> Rejeitado</span>;
            case 'PENDING_LEADER':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><FiClock className="mr-1" /> Análise do Líder</span>;
            case 'PENDING_MANAGER':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><FiClock className="mr-1" /> Análise do Gerente</span>;
            case 'CANCELLED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><FiXCircle className="mr-1" /> Cancelado</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const formatAllReqDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), "dd 'de' MMMM, yyyy", { locale: ptBR });
        } catch {
            return dateString;
        }
    };

    const filteredAllRequests = allRequests.filter(req => {
        if (!allRequestsSearch) return true;
        const lowSearch = allRequestsSearch.toLowerCase();
        return (
            req.user?.name?.toLowerCase().includes(lowSearch) ||
            req.user?.sector?.name?.toLowerCase().includes(lowSearch) ||
            req.status.toLowerCase().includes(lowSearch)
        );
    });

    const allRequestsTableRef = useRef<HTMLTableElement>(null);

    const exportAllRequestsToExcel = () => {
        if (!allRequestsTableRef.current) return;
        const wb = XLSX.utils.table_to_book(allRequestsTableRef.current, { sheet: 'Férias' });
        const ws = wb.Sheets['Férias'];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) continue;
                ws[addr].s = {
                    font: { name: 'Calibri', sz: 11 },
                    alignment: { vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                    }
                };
                if (R === 0) {
                    ws[addr].s.font = { name: 'Calibri', sz: 11, bold: true };
                    ws[addr].s.fill = { fgColor: { rgb: 'E8EDF5' } };
                }
            }
        }
        ws['!cols'] = [
            { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 22 }
        ];
        XLSX.writeFile(wb, `Ferias_Solicitacoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Planilha exportada com sucesso!');
    };

    // ==========================================
    // HELPERS
    // ==========================================
    const getStatusBadgeOptions = (status: string) => {
        switch (status) {
            case 'PENDING_LEADER':
                return { label: 'Aguardando Líder', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: <FiClock className="mr-1" /> };
            case 'PENDING_MANAGER':
                return { label: 'Aguardando Gerente', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: <FiClock className="mr-1" /> };
            case 'APPROVED':
                return { label: 'Aprovado', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: <FiCheckCircle className="mr-1" /> };
            case 'REJECTED':
                return { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: <FiXCircle className="mr-1" /> };
            case 'CANCELLED':
                return { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: <FiX className="mr-1" /> };
            default:
                return { label: status, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: null };
        }
    };

    const getActionContext = (status: string) => {
        if (status === 'PENDING_LEADER') return 'Aprovação de Líder Requerida';
        if (status === 'PENDING_MANAGER') return 'Aprovação de Gerente Requerida';
        return '';
    };

    const formatDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day) return dateString;
        return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
    };

    if (loading && loadingApprovals) {
        return (
            <MainLayout>
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-6">

                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                            <div className="bg-blue-100 p-3 rounded-xl border border-blue-200">
                                <FiCalendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Módulo de Férias</h1>
                                <p className="text-gray-500">Gerencie seus períodos de descanso.</p>
                            </div>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('my_leaves')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'my_leaves' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <FiList />
                                Minhas Solicitações
                            </button>

                            {isApprover && (
                                <button
                                    onClick={() => setActiveTab('approvals')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <FiInbox />
                                    Aprovações da Equipe
                                    {approvals.length > 0 && (
                                        <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                            {approvals.length}
                                        </span>
                                    )}
                                </button>
                            )}

                            {hasFeriasAdmin && (
                                <button
                                    onClick={() => setActiveTab('all_requests')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'all_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <FiEye />
                                    Todas as Solicitações
                                </button>
                            )}
                        </div>
                    </div>

                    {activeTab === 'my_leaves' && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        >
                            <FiPlus className="w-5 h-5" />
                            Nova Solicitação
                        </button>
                    )}
                </div>

                {/* TAB CONTENT: MY LEAVES */}
                {activeTab === 'my_leaves' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loading ? (
                            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <FiCalendar className="w-8 h-8 text-blue-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma solicitação de férias</h3>
                                <p className="text-gray-500 max-w-sm mb-6">
                                    Você ainda não possui nenhuma solicitação registrada. Clique no botão "Nova Solicitação" para criar sua primeira.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {requests.map((request) => {
                                    const statusStyle = getStatusBadgeOptions(request.status);
                                    return (
                                        <div key={request.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusStyle.bg}`}></div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        {request.periods && request.periods.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {request.periods.map((p, i) => (
                                                                    <span key={i} className="font-semibold text-gray-800 text-base md:text-lg">
                                                                        {i + 1}º Período: {formatDate(p.start_date)} até {formatDate(p.end_date)} <span className="text-gray-500 font-normal text-sm">({p.duration} dias)</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <h3 className="font-semibold text-gray-800 text-lg">
                                                                {formatDate(request.start_date)} até {formatDate(request.end_date)}
                                                            </h3>
                                                        )}
                                                        <div className="flex flex-wrap gap-2 mt-1 md:mt-0 md:ml-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                                                {statusStyle.icon}
                                                                {statusStyle.label}
                                                            </span>
                                                            {request.pecuniary_allowance && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-100 text-purple-700 border-purple-200">
                                                                    <span>Abono Pecuniário: SIM</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        Registrado em: {new Date(request.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {request.justification && (
                                                <div className="mt-4 pl-2">
                                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 border-dashed">
                                                        <span className="font-medium text-gray-700 block mb-1">Observações:</span>
                                                        {request.justification}
                                                    </p>
                                                </div>
                                            )}

                                            {request.rejection_reason && (request.status === 'REJECTED') && (
                                                <div className="mt-4 pl-2">
                                                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                                                        <span className="font-medium text-red-800 block mb-1 flex items-center gap-1"><FiAlertCircle /> Motivo da Rejeição:</span>
                                                        {request.rejection_reason}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB CONTENT: APPROVALS */}
                {activeTab === 'approvals' && isApprover && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingApprovals ? (
                            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                        ) : approvals.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                    <FiCheckCircle className="w-8 h-8 text-green-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tudo em dia!</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Nenhuma solicitação de férias aguardando a sua análise no momento.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {approvals.map((request) => (
                                    <div key={request.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">

                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 tracking-wide uppercase">
                                                        {getActionContext(request.status)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Enviada em {new Date(request.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    {request.pecuniary_allowance && (
                                                        <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 tracking-wide uppercase border border-purple-200">
                                                            Pecúnia
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                                        <FiUser className="text-gray-400 w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-800 text-base">
                                                            {request.user?.name || 'Desconhecido'}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">{request.user?.email}</p>
                                                    </div>
                                                </div>

                                                {request.periods && request.periods.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {request.periods.map((p, i) => (
                                                            <div key={i} className="flex flex-col py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                <span className="text-xs font-bold text-gray-500 mb-1">{i + 1}º Período ({p.duration} dias)</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <FiCalendar className="text-gray-400 w-3 h-3" />
                                                                        <span className="text-sm font-medium text-gray-700">{formatDate(p.start_date)}</span>
                                                                    </div>
                                                                    <span className="text-gray-300">|</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <FiClock className="text-gray-400 w-3 h-3" />
                                                                        <span className="text-sm font-medium text-gray-700">{formatDate(p.end_date)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-4 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100 w-fit mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <FiCalendar className="text-gray-400" />
                                                            <span className="text-sm font-medium text-gray-700">De: {formatDate(request.start_date)}</span>
                                                        </div>
                                                        <span className="text-gray-300">|</span>
                                                        <div className="flex items-center gap-2">
                                                            <FiClock className="text-gray-400" />
                                                            <span className="text-sm font-medium text-gray-700">Até: {formatDate(request.end_date)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-row md:flex-col gap-2 shrink-0 md:min-w-[140px]">
                                                <button
                                                    onClick={() => handleApprove(request)}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    <FiCheckCircle />
                                                    {processingId === request.id ? 'Aguarde...' : 'Aprovar'}
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(request)}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    <FiXCircle />
                                                    Rejeitar
                                                </button>
                                            </div>
                                        </div>

                                        {request.justification && (
                                            <div className="mt-4 pl-2">
                                                <p className="text-sm text-gray-600 bg-yellow-50/50 p-3 rounded-lg border border-yellow-100/50">
                                                    <span className="font-medium text-gray-700 block mb-1 flex items-center gap-1"><FiInfo className="text-yellow-600" /> Observações do Funcionário:</span>
                                                    {request.justification}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB CONTENT: ALL REQUESTS (Admin) */}
                {activeTab === 'all_requests' && hasFeriasAdmin && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto w-full md:w-auto">
                                {[
                                    { id: 'ALL', label: 'Todas' },
                                    { id: 'PENDING_LEADER', label: 'Pendentes Líder' },
                                    { id: 'PENDING_MANAGER', label: 'Pendentes Gerente' },
                                    { id: 'APPROVED', label: 'Aprovadas' },
                                    { id: 'REJECTED', label: 'Rejeitadas' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setAllRequestsFilter(tab.id)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${allRequestsFilter === tab.id
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 items-center w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome..."
                                        value={allRequestsSearch}
                                        onChange={(e) => setAllRequestsSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={exportAllRequestsToExcel}
                                    disabled={filteredAllRequests.length === 0}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition font-medium text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiDownload />
                                    Exportar XLSX
                                </button>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table ref={allRequestsTableRef} className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Colaborador / Setor</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Período Principal</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Atual</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data da Solicitação</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingAllRequests ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center">
                                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                                </td>
                                            </tr>
                                        ) : filteredAllRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                    <FiAlertCircle className="mx-auto h-8 w-8 mb-3 text-gray-400" />
                                                    Nenhuma solicitação encontrada.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAllRequests.map(req => (
                                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{req.user?.name || 'Não identificado'}</div>
                                                        <div className="text-sm text-gray-500">{req.user?.sector?.name || 'Sem setor'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 border border-gray-200 rounded-md px-2 py-1 bg-gray-50 inline-block font-mono">
                                                            {req.start_date} até {req.end_date}
                                                        </div>
                                                        {req.periods && req.periods.length > 1 && (
                                                            <div className="text-xs text-blue-600 mt-1 font-medium italic">
                                                                (+ Férias Fracionadas)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getAllReqStatusBadge(req.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatAllReqDate(req.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAllReq(req);
                                                                setAllReqActionReason('');
                                                                setIsAllReqModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors border border-blue-100"
                                                        >
                                                            <FiEye className="mr-1.5" /> Detalhes
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS RENDERED VIA PORTAL TO PREVENT Z-INDEX ISOLATION AND 'WHITE LINE' GLITCHES */}

                {/* 1. Modal Nova Solicitação */}
                {showModal && mounted && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] my-auto animate-in zoom-in-95 duration-300">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 sticky top-0 z-10">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <FiCalendar className="text-blue-600" />
                                    Nova Solicitação de Férias
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Informações da CLT */}
                            <div className="bg-blue-50/80 px-6 py-4 border-b border-blue-100 text-sm text-blue-800">
                                <div className="flex gap-2 items-start">
                                    <FiInfo className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1 text-blue-900">Orientações Importantes da CLT:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-xs">
                                            <li>As férias não podem iniciar em DSR ou nos dois dias que antecedem feriados e repousos (não podem cair na Quinta, Sexta, Sábado ou Domingo).</li>
                                            <li>O período mínimo para cada bloco de férias é de <strong>5 dias</strong>.</li>
                                            <li>Se dividir as férias, um dos períodos deve obrigatoriamente ter <strong>no mínimo 14 dias</strong>.</li>
                                            <li>Cancelamentos só podem ser feitos antes da aprovação final pelo RH.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Aviso de antecedência - Solicitação do DP */}
                            <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 text-xs text-amber-900 flex gap-2 items-start">
                                <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Prazo de antecedência ({advanceNoticeDays} dias):</strong> conforme solicitação do DP, as férias devem ser pedidas com no mínimo <strong>{advanceNoticeDays} dias de antecedência</strong> à data de início, contemplando o período de solicitação e o de processamento, para garantir o cumprimento do prazo legal de envio. A data mais próxima permitida hoje é <strong>{minStartDate ? formatDatePTBR(minStartDate) : '—'}</strong>{!configLoaded && ' (carregando...)'}.
                                </div>
                            </div>

                            <form onSubmit={handleSubmitRequest} className="p-0 flex flex-col min-h-[200px] max-h-[calc(90vh-180px)]">
                                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 mb-2">
                                    <div className="space-y-4">
                                        {formData.periods.map((period, index) => (
                                            <div key={index} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm relative">
                                                {formData.periods.length > 1 && (
                                                    <div className="absolute top-2 right-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                periods: prev.periods.filter((_, i) => i !== index)
                                                            }))}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <FiX />
                                                        </button>
                                                    </div>
                                                )}
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">{index + 1}º Período</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-gray-700">Data de Início</label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={period.startDate}
                                                            min={index === 0 ? (minStartDate || undefined) : undefined}
                                                            onChange={(e) => {
                                                                const newPeriods = [...formData.periods];
                                                                newPeriods[index].startDate = e.target.value;
                                                                setFormData(prev => ({ ...prev, periods: newPeriods }));
                                                            }}
                                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                        />
                                                        {index === 0 && period.startDate && (() => {
                                                            const validation = validateAdvanceNoticeForCurrentConfig(period.startDate);
                                                            if (!validation.valid) {
                                                                return (
                                                                    <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                                                                        <FiAlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                                        <span>Data muito próxima. Mínimo de {advanceNoticeDays} dias de antecedência.</span>
                                                                    </p>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-gray-700">Data de Retorno</label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={period.endDate}
                                                            min={period.startDate || undefined}
                                                            onChange={(e) => {
                                                                const newPeriods = [...formData.periods];
                                                                newPeriods[index].endDate = e.target.value;
                                                                setFormData(prev => ({ ...prev, periods: newPeriods }));
                                                            }}
                                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {formData.periods.length < 3 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    periods: [...prev.periods, { startDate: '', endDate: '' }]
                                                }))}
                                                className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <FiPlus />
                                                Adicionar Período (Dividir Férias)
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 shrink-0">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-800">Abono Pecuniário</h4>
                                            <p className="text-xs text-gray-500 mt-1">Desejo "vender" 10 dias de férias (conversão em dinheiro).</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={formData.pecuniaryAllowance}
                                            onClick={() => setFormData(prev => ({ ...prev, pecuniaryAllowance: !prev.pecuniaryAllowance }))}
                                            className={`${formData.pecuniaryAllowance ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                        >
                                            <span className="sr-only">Abono Pecuniário</span>
                                            <span
                                                aria-hidden="true"
                                                className={`${formData.pecuniaryAllowance ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                            />
                                        </button>
                                    </div>

                                    <div className="p-4 border border-gray-200 rounded-xl bg-white shrink-0">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-800">1ª parcela do 13º salário</h4>
                                            <p className="text-xs text-gray-500 mt-1">Deseja receber a 1ª parcela do 13º salário junto com as férias?</p>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-6">
                                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="advance13thSalary"
                                                    checked={formData.advance13thSalary}
                                                    onChange={() => setFormData(prev => ({ ...prev, advance13thSalary: true }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Sim
                                            </label>

                                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="advance13thSalary"
                                                    checked={!formData.advance13thSalary}
                                                    onChange={() => setFormData(prev => ({ ...prev, advance13thSalary: false }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Não
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 shrink-0 mb-4">
                                        <label className="text-sm font-medium text-gray-700">Observações <span className="text-gray-400 font-normal">(Opcional)</span></label>
                                        <textarea
                                            rows={3}
                                            value={formData.justification}
                                            onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                                            placeholder="Alguma observação para seu líder/gerente..."
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-end gap-2 sm:gap-3 bg-white sticky bottom-0">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || formData.periods.some(p => !p.startDate || !p.endDate)}
                                        className="px-4 sm:px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
                }

                {/* 2. Modal Rejeitar Solicitação */}
                {
                    showRejectModal && mounted && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto p-4 sm:p-6 animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeitar Solicitação</h3>
                                <p className="text-sm text-gray-500 mb-4 sm:mb-6">
                                    Você está rejeitando o pedido de {rejectingRequest?.user?.name}. Por favor, informe o motivo.
                                </p>

                                <textarea
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none min-h-[80px] sm:min-h-[100px] mb-4 sm:mb-6"
                                    placeholder="Justificativa da rejeição..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />

                                <div className="flex gap-2 sm:gap-3 justify-end">
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        className="px-3 sm:px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={submitReject}
                                        disabled={processingId === rejectingRequest?.id || !rejectReason.trim()}
                                        className="px-3 sm:px-4 py-2 font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === rejectingRequest?.id ? 'Rejeitando...' : 'Confirmar Rejeição'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* 3. Modal Detalhes / Ações - Todas as Solicitações */}
                {isAllReqModalOpen && selectedAllReq && mounted && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <FiCalendar className="text-blue-600" />
                                    Detalhes da Solicitação
                                </h3>
                                <button onClick={() => !allReqModalProcessing && setIsAllReqModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                            <FiUser className="text-gray-400 w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{selectedAllReq.user?.name || 'Não identificado'}</h4>
                                            <p className="text-sm text-gray-500">{selectedAllReq.user?.sector?.name || 'Sem setor'}</p>
                                        </div>
                                    </div>
                                    {getAllReqStatusBadge(selectedAllReq.status)}
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                                    <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Períodos de Gozo</h5>
                                    {selectedAllReq.periods && selectedAllReq.periods.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedAllReq.periods.map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-md shadow-sm">
                                                    <span className="font-medium text-gray-700 text-sm">Período {idx + 1}</span>
                                                    <span className="text-gray-600 font-mono text-sm">{p.start_date} até {p.end_date} • <span className="text-blue-600 font-bold">{p.duration} dias</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-md shadow-sm">
                                            <span className="font-medium text-gray-700 text-sm">Período Único</span>
                                            <span className="text-gray-600 font-mono text-sm">{selectedAllReq.start_date} até {selectedAllReq.end_date}</span>
                                        </div>
                                    )}
                                </div>

                                {selectedAllReq.justification && (
                                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                                        <h5 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2">Observações</h5>
                                        <p className="text-sm text-gray-700 italic border-l-2 border-blue-300 pl-3">"{selectedAllReq.justification}"</p>
                                    </div>
                                )}

                                {(selectedAllReq.status === 'PENDING_LEADER' || selectedAllReq.status === 'PENDING_MANAGER') && (
                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                        <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <FiAlertCircle className="text-orange-500" />
                                            Ações Administrativas
                                        </h5>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Motivo da Rejeição <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                                                placeholder="Insira o motivo se for reprovar..."
                                                value={allReqActionReason}
                                                onChange={(e) => setAllReqActionReason(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-wrap gap-2 sm:gap-3 justify-end border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => !allReqModalProcessing && setIsAllReqModalOpen(false)}
                                    disabled={allReqModalProcessing}
                                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Fechar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAllReqDelete(selectedAllReq.id)}
                                    disabled={allReqModalProcessing}
                                    className="px-3 sm:px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <FiTrash2 className="inline mr-1" /> Excluir
                                </button>

                                {(selectedAllReq.status === 'PENDING_LEADER' || selectedAllReq.status === 'PENDING_MANAGER') && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleAllReqAction(selectedAllReq.id, 'REJECT')}
                                            disabled={allReqModalProcessing}
                                            className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FiXCircle className="inline mr-1" /> Rejeitar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAllReqAction(selectedAllReq.id, 'APPROVE')}
                                            disabled={allReqModalProcessing}
                                            className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FiCheckCircle className="inline mr-1" /> Aprovar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            </div >
        </MainLayout >
    );
}
