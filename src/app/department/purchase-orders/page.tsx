'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiPlus, FiFilter, FiSearch, FiRefreshCw, FiMoreVertical, FiTrash2, FiCheck, FiX, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import PurchaseOrderStats from './components/PurchaseOrderStats';
import { getToken } from '@/lib/tokenStorage';

export default function PurchaseOrdersPage() {
    const { user, profile } = useSupabaseAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const isAdmin = profile?.role === 'ADMIN';
    const isManager = profile?.role === 'MANAGER';

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/purchase-orders');
            if (!res.ok) throw new Error('Failed to fetch orders');
            const data = await res.json();
            setOrders(data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar ordens de compra');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta ordem?')) return;
        try {
            const token = getToken();
            const res = await fetch(`/api/purchase-orders/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Ordem excluída com sucesso');
            fetchOrders();
        } catch (error) {
            toast.error('Erro ao excluir');
        }
    };

    const handleQuickAction = async (id: string, action: 'approved' | 'rejected') => {
        if (!confirm(`Deseja ${action === 'approved' ? 'aprovar' : 'rejeitar'} esta ordem?`)) return;
        try {
            const res = await fetch(`/api/purchase-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** status: action })
            });
            if (!res.ok) throw new Error(`Failed to ${action}`);
            toast.success(`Ordem ${action === 'approved' ? 'aprovada' : 'rejeitada'}`);
            fetchOrders();
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            (order.po_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.provider_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter ? order.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        const styles: any = {
            approved: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700',
            submitted: 'bg-blue-100 text-blue-700',
            pending: 'bg-yellow-100 text-yellow-700',
            draft: 'bg-gray-100 text-gray-700'
        };
        const labels: any = {
            approved: 'Aprovado',
            rejected: 'Rejeitado',
            submitted: 'Aguardando',
            pending: 'Pendente',
            draft: 'Rascunho'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Ordens de Compra</h1>
                    <p className="text-gray-500">
                        {isAdmin ? 'Visão Administrativa' : isManager ? 'Visão Gerencial' : 'Minhas Solicitações'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Link
                            href="/department/purchase-orders/settings"
                            className="flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-sm bg-white"
                        >
                            <FiMoreVertical className="mr-2" /> Configurações
                        </Link>
                    )}
                    <Link
                        href="/department/purchase-orders/new"
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <FiPlus className="mr-2" /> Nova Ordem
                    </Link>
                </div>
            </div>

            <PurchaseOrderStats orders={orders} />

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por número ou fornecedor..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">Todos os Status</option>
                        <option value="draft">Rascunho</option>
                        <option value="submitted">Aguardando</option>
                        <option value="approved">Aprovado</option>
                        <option value="rejected">Rejeitado</option>
                    </select>
                    <button onClick={fetchOrders} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg" title="Atualizar">
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">Número</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Fornecedor</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhuma ordem encontrada.</td></tr>
                            ) : (
                                filteredOrders.map((po) => (
                                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{po.po_number || '#-'}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(po.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-gray-600">{po.provider_trade_name || po.provider_name || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(po.total_value)}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(isAdmin || isManager) && po.status === 'submitted' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleQuickAction(po.id, 'approved')}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                                            title="Aprovar"
                                                        >
                                                            <FiCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleQuickAction(po.id, 'rejected')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Rejeitar"
                                                        >
                                                            <FiX className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <Link
                                                    href={`/department/purchase-orders/${po.id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="Ver Detalhes"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </Link>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(po.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Excluir"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
