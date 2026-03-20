'use client';

import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiArrowLeft, FiEdit, FiTrash2, FiCheckCircle, FiXCircle, FiClock, FiFileText, FiDownload, FiMail, FiPrinter, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

export default function PurchaseRequestDetailsPage() {
    const { user, profile } = useSupabaseAuth();
    const { t } = useI18n();
    const router = useRouter();
    const params = useParams();
    const id = params?.id;
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [approvalFlow, setApprovalFlow] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchRequest();
        }
    }, [id]);

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autenticação');
                return;
            }

            const res = await fetch(`/api/purchase-requests/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao buscar requisição');
            }

            const data = await res.json();
            setRequest(data.data);
            setItems(data.data.items || []);
            setApprovalFlow(data.data.approval_flow || null);

        } catch (error: any) {
            console.error('Error fetching request:', error);
            toast.error(error.message || 'Erro ao buscar requisição');
        } finally {
            setLoading(false);
        }
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

    const handleEdit = () => {
        router.push(`/department/purchase-requests/${id}/edit`);
    };

    const handleDelete = async () => {
        if (!request || request.status !== 'draft') {
            toast.error('Apenas requisições em rascunho podem ser excluídas');
            return;
        }

        if (!confirm('Tem certeza que deseja excluir esta requisição?')) {
            return;
        }

        try {
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autenticação');
                return;
            }

            const res = await fetch(`/api/purchase-requests/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao excluir requisição');
            }

            toast.success('Requisição excluída com sucesso');
            router.push('/department/purchase-requests');

        } catch (error: any) {
            console.error('Error deleting request:', error);
            toast.error(error.message || 'Erro ao excluir requisição');
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autenticação');
                return;
            }

            const res = await fetch(`/api/purchase-requests/${id}/pdf`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao gerar PDF');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RQF-${request?.rqf_number || id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast.error(error.message || 'Erro ao gerar PDF');
        }
    };

    const handleSendEmail = async () => {
        try {
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autenticação');
                return;
            }

            const res = await fetch(`/api/purchase-requests/${id}/email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao enviar email');
            }

            toast.success('Email enviado com sucesso');

        } catch (error: any) {
            console.error('Error sending email:', error);
            toast.error(error.message || 'Erro ao enviar email');
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Requisição de Compra</h1>
                        <p className="text-gray-500">Visualizando detalhes da requisição</p>
                    </div>
                    <Link
                        href="/department/purchase-requests"
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <FiArrowLeft size={24} />
                    </Link>
                </div>
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando detalhes da requisição...</p>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Requisição de Compra</h1>
                        <p className="text-gray-500">Visualizando detalhes da requisição</p>
                    </div>
                    <Link
                        href="/department/purchase-requests"
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <FiArrowLeft size={24} />
                    </Link>
                </div>
                <div className="text-center py-12">
                    <p className="text-gray-500">Requisição não encontrada</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Requisição de Compra</h1>
                    <p className="text-gray-500">Visualizando detalhes da requisição</p>
                </div>
                <Link
                    href="/department/purchase-requests"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <FiArrowLeft size={24} />
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Dados da Requisição</h2>
                        <p className="text-gray-500">RQF #{request.rqf_number}</p>
                    </div>
                    <div className="flex gap-2">
                        {request.status === 'draft' && (
                            <>
                                <button
                                    onClick={handleEdit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <FiEdit /> Editar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <FiTrash2 /> Excluir
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleDownloadPDF}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <FiDownload /> PDF
                        </button>
                        <button
                            onClick={handleSendEmail}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <FiMail /> Email
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fornecedor
                        </label>
                        <p className="text-gray-900">{request.provider_name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            CNPJ
                        </label>
                        <p className="text-gray-900">{request.provider_cnpj || 'Não informado'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <p className="text-gray-900">{request.provider_email || 'Não informado'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Solicitante
                        </label>
                        <p className="text-gray-900">{request.buyer_name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Setor
                        </label>
                        <p className="text-gray-900">{request.sector_id}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condições de Pagamento
                        </label>
                        <p className="text-gray-900">{request.payment_terms || 'Não informado'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data de Entrega
                        </label>
                        <p className="text-gray-900">{request.delivery_date || 'Não informado'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Endereço de Entrega
                        </label>
                        <p className="text-gray-900">{request.delivery_address || 'Não informado'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiFileText /> Itens da Requisição
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantidade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valor Unitário
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valor Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_value)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiFileText /> Observações
                </h3>
                <p className="text-gray-900">{request.observation || 'Nenhuma observação adicionada'}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiClock /> Status e Aprovação
                </h3>
                <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status === 'draft' ? 'Rascunho' : 
                         request.status === 'submitted' ? 'Enviado' : 
                         request.status === 'approved' ? 'Aprovado' : 
                         request.status === 'rejected' ? 'Rejeitado' : 
                         request.status === 'cancelled' ? 'Cancelado' : 'Rascunho'}
                    </span>
                    {approvalFlow && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Atualizado em {new Date(approvalFlow.updated_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    )}
                </div>

                {approvalFlow && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Etapa Atual:</span>
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {approvalFlow.current_step}
                            </span>
                        </div>
                        {approvalFlow.approved_by && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Aprovado por:</span>
                                <span className="text-sm text-gray-600">{approvalFlow.approved_by}</span>
                            </div>
                        )}
                        {approvalFlow.rejected_by && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Rejeitado por:</span>
                                <span className="text-sm text-gray-600">{approvalFlow.rejected_by}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiDollarSign /> Totais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor Total dos Itens
                        </label>
                        <p className="text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                items.reduce((sum, item) => sum + item.total_value, 0)
                            )}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor Total da Requisição
                        </label>
                        <p className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(request.total_value)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}