'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiPlus, FiClock, FiCheckCircle, FiXCircle, FiX, FiAlertCircle, FiUser, FiInfo, FiList, FiInbox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { LeaveRequest } from '@/services/leaveService';
import MainLayout from '@/components/Layout/MainLayout';

export default function FeriasPage() {
    const { user } = useSupabaseAuth();
    const [activeTab, setActiveTab] = useState<'my_leaves' | 'approvals'>('my_leaves');
    const [isApprover, setIsApprover] = useState(false);
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
    }>({
        periods: [{ startDate: '', endDate: '' }],
        justification: ''
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

    useEffect(() => {
        if (user?.id) {
            loadRequests();
            loadApprovals();
        }
    }, [user]);

    // ==========================================
    // DATA FETCHING
    // ==========================================
    const loadRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/leave/requests?userId=${user?.id}`);
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
            const res = await fetch(`/api/admin/leave-approvals?approverId=${user?.id}`);
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

        try {
            setSubmitting(true);
            const res = await fetch('/api/leave/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    user_id: user.id,
                    start_date: formData.periods[0].startDate, // Keep for backward comp / boundary tracking
                    end_date: formData.periods[formData.periods.length - 1].endDate,
                    periods: preparedPeriods,
                    justification: formData.justification
                })
            });

            if (!res.ok) throw new Error('Failed to submit');

            toast.success('Solicitação de férias enviada com sucesso!');
            setShowModal(false);
            setFormData({ periods: [{ startDate: '', endDate: '' }], justification: '' });
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
            const res = await fetch('/api/admin/leave-approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
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
            const res = await fetch('/api/admin/leave-approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
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

                {/* MODALS RENDERED VIA PORTAL TO PREVENT Z-INDEX ISOLATION AND 'WHITE LINE' GLITCHES */}

                {/* 1. Modal Nova Solicitação */}
                {showModal && mounted && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <FiCalendar className="text-blue-600" />
                                    Nova Solicitação de Férias
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                                                        onChange={(e) => {
                                                            const newPeriods = [...formData.periods];
                                                            newPeriods[index].startDate = e.target.value;
                                                            setFormData(prev => ({ ...prev, periods: newPeriods }));
                                                        }}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-medium text-gray-700">Data de Retorno</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={period.endDate}
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

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Observações <span className="text-gray-400 font-normal">(Opcional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={formData.justification}
                                        onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                                        placeholder="Alguma observação para seu líder/gerente..."
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                                    <FiAlertCircle className="text-blue-600 mt-0.5" />
                                    <p className="text-xs text-blue-800">
                                        Esta solicitação será encaminhada para aprovação conforme a hierarquia do seu setor. <br />
                                        <strong>As férias não podem iniciar em Quintas, Sextas, Sábados ou Domingos e devem ter no mínimo 5 dias.</strong>
                                    </p>
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || formData.periods.some(p => !p.startDate || !p.endDate)}
                                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* 2. Modal Rejeitar Solicitação */}
                {showRejectModal && mounted && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeitar Solicitação</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Você está rejeitando o pedido de {rejectingRequest?.user?.name}. Por favor, informe o motivo.
                            </p>

                            <textarea
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none min-h-[100px] mb-6"
                                placeholder="Justificativa da rejeição..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={processingId === rejectingRequest?.id || !rejectReason.trim()}
                                    className="px-4 py-2 font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processingId === rejectingRequest?.id ? 'Rejeitando...' : 'Confirmar Rejeição'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            </div>
        </MainLayout>
    );
}
