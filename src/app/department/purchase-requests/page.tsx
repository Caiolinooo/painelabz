import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiSearch, FiFilter, FiPlus, FiDownload, FiEdit, FiTrash2, FiCheckCircle, FiXCircle, FiClock, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import Link from 'next/link';

export default function PurchaseRequestsPage() {
    const { user, profile } = useSupabaseAuth();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

    useEffect(() => {
        fetchRequests();
    }, [page, statusFilter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autenticação');
                return;
            }

            const url = new URL('/api/purchase-requests', window.location.origin);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', pageSize.toString());
            if (statusFilter !== 'all') {
                url.searchParams.append('status', statusFilter);
            }

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao buscar requisições');
            }

            const data = await res.json();
            setRequests(data.data);

        } catch (error: any) {
            console.error('Error fetching requests:', error);
            toast.error(error.message || 'Erro ao buscar requisições');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement search functionality
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-yellow-100 text-yellow-800';
            case 'submitted': return 'bg-blue-100 text-blue-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft': return <FiFileText className="mr-2" />;
            case 'submitted': return <FiClock className="mr-2" />;
            case 'approved': return <FiCheckCircle className="mr-2 text-green-600" />;
            case 'rejected': return <FiXCircle className="mr-2 text-red-600" />;
            case 'cancelled': return <FiXCircle className="mr-2 text-gray-500" />;
            default: return <FiFileText className="mr-2" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Requisições de Compra</h1>
                    <p className="text-gray-500">Gerencie todas as requisições de compra do seu setor</p>
                </div>
                <Link
                    href="/department/purchase-requests/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <FiPlus /> Nova Requisição
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Buscar
                        </label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Buscar por fornecedor, solicitante ou RQF..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="draft">Rascunho</option>
                            <option value="submitted">Enviado</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Rejeitado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <FiSearch /> Buscar
                        </button>
                    </div>
                </form>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando requisições...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        RQF
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fornecedor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Solicitante
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Valor Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {requests.map((request: any) => (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {request.rqf_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {request.provider_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {request.buyer_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(request.total_value)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                {request.status === 'draft' ? 'Rascunho' : 
                                                 request.status === 'submitted' ? 'Enviado' : 
                                                 request.status === 'approved' ? 'Aprovado' : 
                                                 request.status === 'rejected' ? 'Rejeitado' : 
                                                 request.status === 'cancelled' ? 'Cancelado' : 'Rascunho'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link
                                                href={`/department/purchase-requests/${request.id}`}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                Ver
                                            </Link>
                                            {request.status === 'draft' && (
                                                <>
                                                    <Link
                                                        href={`/department/purchase-requests/${request.id}/edit`}
                                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                                    >
                                                        Editar
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(request.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Excluir
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {requests.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">
                            Nenhuma requisição encontrada
                        </div>
                    )}
                </div>
            )}

            {!loading && requests.length > 0 && (
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span className="text-gray-600">
                        Página {page}
                    </span>
                    <button
                        onClick={() => setPage(prev => prev + 1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}