'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiArrowLeft, FiCheck, FiX, FiDownload, FiTruck, FiCreditCard, FiUser, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function PurchaseOrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile } = useSupabaseAuth();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = profile?.role === 'ADMIN';
    const isManager = profile?.role === 'MANAGER';

    useEffect(() => {
        if (user && id) {
            fetchOrderDetails();
        }
    }, [user, id]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/purchase-orders'); // Optimally we should have a specific GET /:id endpoint, but filtering client side for now or using the list endpoint if it returns all
            // Wait, we DO have a GET /:id endpoint?
            // Let's check api/purchase-orders/[id]/route.ts
            // Actually, let's try the direct list fetch first since we might not have a GET Detail ID endpoint yet. 
            // Update: We checked previously and saw `api/purchase-orders/[id]/route.ts` has PUT and DELETE. Does it have GET?
            // If not, we might need to fetch all and find, OR add GET to that route.
            // Let's assume we can fetch all and filter for now to be safe, or check status.

            // Actually, let's try to add GET to [id]/route.ts if needed, but for now let's query the main list. 
            // Efficient: No. Functional: Yes. 

            // Better strategy: Use the main list endpoint which returns everything for admins, or specific for users.
            const listRes = await fetch('/api/purchase-orders');
            if (listRes.ok) {
                const json = await listRes.json();
                const found = json.data?.find((o: any) => o.id === id);
                if (found) {
                    setOrder(found);
                } else {
                    toast.error('Pedido não encontrado ou acesso negado.');
                    router.push('/department/purchase-orders');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar detalhes');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'approved' | 'rejected') => {
        if (!confirm(`Deseja ${action === 'approved' ? 'aprovar' : 'rejeitar'} este pedido?`)) return;
        try {
            const res = await fetch(`/api/purchase-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** status: action })
            });

            if (!res.ok) throw new Error('Falha na ação');

            toast.success(`Pedido ${action === 'approved' ? 'aprovado' : 'rejeitado'}`);
            fetchOrderDetails(); // Refresh
        } catch (error) {
            toast.error('Erro ao processar ação');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando detalhes do pedido...</div>;
    }

    if (!order) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/department/purchase-orders" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Pedido {order.po_number || `#${order.id.slice(0, 8)}`}</h1>
                        <p className="text-gray-500 text-sm">Criado em {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <StatusBadge status={order.status} />
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiFileText /> Itens do Pedido
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Descrição</th>
                                        <th className="px-4 py-2 text-right">Qtd</th>
                                        <th className="px-4 py-2 text-right">Valor Unit.</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_value)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unit_value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t font-semibold bg-gray-50">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right">Frete:</td>
                                        <td className="px-4 py-3 text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.freight_cost || 0)}
                                        </td>
                                    </tr>
                                    <tr className="text-lg text-blue-700">
                                        <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                                        <td className="px-4 py-3 text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Observation */}
                    {order.observation && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h2 className="font-semibold text-gray-800 mb-2">Observações</h2>
                            <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm">{order.observation}</p>
                        </div>
                    )}

                    {/* Attachments */}
                    {order.invoice_url && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
                            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <FiDownload /> Anexos
                            </h2>
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                <span className="text-sm text-blue-900 font-medium">Orçamento/Fatura Anexado</span>
                                <a
                                    href={order.invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm font-semibold transition-colors shadow-sm"
                                >
                                    Baixar / Visualizar
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Status Actions */}
                    {(isAdmin || isManager) && order.status === 'submitted' && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="font-semibold text-gray-800 mb-4">Aprovação</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleAction('approved')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <FiCheck /> Aprovar
                                </button>
                                <button
                                    onClick={() => handleAction('rejected')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <FiX /> Rejeitar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Provider Info */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-sm space-y-3">
                        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FiTruck /> Dados do Fornecedor
                        </h3>
                        <div>
                            <span className="block text-gray-500 text-xs">Razão Social</span>
                            <span className="font-medium text-gray-900">{order.provider_name}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">CNPJ</span>
                            <span className="font-medium text-gray-900">{order.provider_cnpj}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Email</span>
                            <a href={`mailto:${order.provider_email}`} className="text-blue-600 hover:underline">{order.provider_email}</a>
                        </div>
                    </div>

                    {/* Delivery & Payment */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-sm space-y-3">
                        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FiCreditCard /> Entrega e Pagamento
                        </h3>
                        <div>
                            <span className="block text-gray-500 text-xs">Condição de Pagamento</span>
                            <span className="font-medium text-gray-900">{order.payment_terms}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Data de Entrega</span>
                            <span className="font-medium text-gray-900">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Endereço</span>
                            <span className="font-medium text-gray-900">{order.delivery_address || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Comprador</span>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                                <FiUser size={12} /> {order.buyer_name || '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        approved: 'bg-green-100 text-green-700 border-green-200',
        rejected: 'bg-red-100 text-red-700 border-red-200',
        submitted: 'bg-blue-100 text-blue-700 border-blue-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        draft: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    const labels: any = {
        approved: 'Aprovado',
        rejected: 'Rejeitado',
        submitted: 'Aguardando',
        pending: 'Pendente',
        draft: 'Rascunho'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${styles[status] || styles.draft}`}>
            {labels[status] || status}
        </span>
    );
};
