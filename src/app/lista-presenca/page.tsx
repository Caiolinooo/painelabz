'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSignature } from '@/contexts/SignatureContext';
import { fetchWithAuth } from '@/lib/authUtils';
import { toast } from 'react-hot-toast';
import {
    FiPlus, FiSearch, FiCalendar, FiMapPin, FiUsers,
    FiLink, FiCopy, FiEye, FiEdit2, FiTrash2, FiCheck,
    FiX, FiClock, FiLock, FiUnlock, FiFileText,
    FiChevronDown, FiFilter
} from 'react-icons/fi';

interface Lista {
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    local: string | null;
    pauta: string | null;
    status: 'aberta' | 'fechada' | 'cancelada';
    acesso_publico: boolean;
    link_unico: string;
    max_participantes: number | null;
    total_participantes: number;
    criador_nome: string;
    setor_nome: string | null;
    template_nome: string | null;
    created_at: string;
}

const STATUS_CONFIG = {
    aberta: { label: 'Aberta', color: 'bg-green-100 text-green-700', icon: FiUnlock },
    fechada: { label: 'Fechada', color: 'bg-gray-100 text-gray-600', icon: FiLock },
    cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: FiX },
};

export default function ListaPresencaPage() {
    const { profile } = useSupabaseAuth();
    const [listas, setListas] = useState<Lista[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const isManager = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

    // Fetch lists
    const fetchListas = useCallback(async () => {
        try {
            setIsLoading(true);
            let url = '/api/lista-presenca?limit=50';
            if (statusFilter) url += `&status=${statusFilter}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

            const res = await fetchWithAuth(url);
            const data = await res.json();
            if (data.success) {
                setListas(data.listas || []);
            }
        } catch (error) {
            console.error('Erro ao buscar listas:', error);
            toast.error('Erro ao carregar listas de presença');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchTerm]);

    useEffect(() => {
        fetchListas();
    }, [fetchListas]);

    const handleCopyLink = (linkUnico: string) => {
        const url = `${window.location.origin}/lista-presenca/public/${linkUnico}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
    };

    const handleCloseList = async (id: string) => {
        if (!confirm('Deseja fechar esta lista? Não será possível adicionar mais assinaturas.')) return;
        try {
            const res = await fetchWithAuth('/api/lista-presenca', {
                method: 'PUT',
                body: ***REMOVED*** id, status: 'fechada' }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Lista fechada');
                fetchListas();
            }
        } catch {
            toast.error('Erro ao fechar lista');
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm('Deseja excluir esta lista permanentemente?')) return;
        try {
            const res = await fetchWithAuth(`/api/lista-presenca?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Lista excluída');
                fetchListas();
            }
        } catch {
            toast.error('Erro ao excluir lista');
        }
    };

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatTime = (t: string | null) => t ? t.slice(0, 5) : '';

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Lista de Presença</h1>
                        <p className="text-sm text-gray-500 mt-1">Controle de presença com assinatura digital</p>
                    </div>
                    {isManager && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-md shadow-blue-200"
                        >
                            <FiPlus className="w-4 h-4" />
                            Nova Lista
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar lista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                    >
                        <option value="">Todos os status</option>
                        <option value="aberta">Abertas</option>
                        <option value="fechada">Fechadas</option>
                        <option value="cancelada">Canceladas</option>
                    </select>
                </div>

                {/* Lists Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                    </div>
                ) : listas.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-500">Nenhuma lista encontrada</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            {isManager ? 'Clique em "Nova Lista" para criar sua primeira lista.' : 'Nenhuma lista de presença disponível.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {listas.map((lista) => {
                            const statusCfg = STATUS_CONFIG[lista.status];
                            const StatusIcon = statusCfg.icon;
                            return (
                                <div key={lista.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                    {/* Card Header */}
                                    <div className="p-5 pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">{lista.titulo}</h3>
                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusCfg.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusCfg.label}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{formatDate(lista.data_evento)}</span>
                                                {lista.hora_inicio && (
                                                    <span className="text-gray-400">
                                                        {formatTime(lista.hora_inicio)}{lista.hora_fim ? ` - ${formatTime(lista.hora_fim)}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {lista.local && (
                                                <div className="flex items-center gap-2">
                                                    <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="truncate">{lista.local}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <FiUsers className="w-3.5 h-3.5 text-gray-400" />
                                                <span>
                                                    {lista.total_participantes} participante{lista.total_participantes !== 1 ? 's' : ''}
                                                    {lista.max_participantes ? ` / ${lista.max_participantes}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => handleCopyLink(lista.link_unico)}
                                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            title="Copiar link público"
                                        >
                                            <FiCopy className="w-3.5 h-3.5" />
                                            Copiar Link
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <a
                                                href={`/lista-presenca/${lista.id}`}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <FiEye className="w-4 h-4" />
                                            </a>
                                            {isManager && lista.status === 'aberta' && (
                                                <button
                                                    onClick={() => handleCloseList(lista.id)}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Fechar lista"
                                                >
                                                    <FiLock className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isManager && (
                                                <button
                                                    onClick={() => handleDeleteList(lista.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateListaModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        fetchListas();
                    }}
                />
            )}
        </MainLayout>
    );
}

// ==================== CREATE MODAL ====================

function CreateListaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({
        titulo: '',
        data_evento: new Date().toISOString().slice(0, 10),
        hora_inicio: '08:00',
        hora_fim: '17:00',
        local: '',
        pauta: '',
        acesso_publico: true,
        max_participantes: '',
        token_acesso: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.titulo || !form.data_evento) {
            toast.error('Preencha título e data do evento');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetchWithAuth('/api/lista-presenca', {
                method: 'POST',
                body: ***REMOVED***
                    ...form,
                    max_participantes: form.max_participantes ? parseInt(form.max_participantes) : null,
                    token_acesso: form.token_acesso || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Lista criada com sucesso!');
                onCreated();
            } else {
                toast.error(data.error || 'Erro ao criar lista');
            }
        } catch {
            toast.error('Erro ao criar lista');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                    <h3 className="text-lg font-semibold text-gray-900">Nova Lista de Presença</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Título *</label>
                        <input
                            type="text"
                            required
                            value={form.titulo}
                            onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                            placeholder="Ex: Reunião de Segurança — Novembro 2025"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data *</label>
                            <input type="date" required value={form.data_evento} onChange={(e) => setForm(f => ({ ...f, data_evento: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Início</label>
                            <input type="time" value={form.hora_inicio} onChange={(e) => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Fim</label>
                            <input type="time" value={form.hora_fim} onChange={(e) => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Local</label>
                        <input type="text" value={form.local} onChange={(e) => setForm(f => ({ ...f, local: e.target.value }))}
                            placeholder="Ex: Sala de Reuniões 3 — Sede RJ"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Pauta / Conteúdo</label>
                        <textarea value={form.pauta} onChange={(e) => setForm(f => ({ ...f, pauta: e.target.value }))}
                            rows={3} placeholder="Descreva a pauta ou conteúdo do evento..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Máx. Participantes</label>
                            <input type="number" min="1" value={form.max_participantes} onChange={(e) => setForm(f => ({ ...f, max_participantes: e.target.value }))}
                                placeholder="Ilimitado"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Token de Acesso</label>
                            <input type="text" value={form.token_acesso} onChange={(e) => setForm(f => ({ ...f, token_acesso: e.target.value }))}
                                placeholder="Opcional"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm font-medium"
                        >
                            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiPlus className="w-4 h-4" />}
                            {isSubmitting ? 'Criando...' : 'Criar Lista'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
