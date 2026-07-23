'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiArrowLeft, FiCheck, FiX, FiDownload, FiTruck, FiCreditCard, FiUser, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/I18nContext';

export default function PurchaseOrderDetailsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { user, profile } = useSupabaseAuth();
    const { t, locale } = useI18n();
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
            const res = await fetch(`/api/purchase-orders/${id}`, { cache: 'no-store' });

            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setOrder(json.data);
                } else {
                    toast.error(t('purchaseOrders.details.notFoundOrDenied'));
                    router.push('/department/purchase-orders');
                }
            } else {
                toast.error(t('purchaseOrders.details.notFound'));
                router.push('/department/purchase-orders');
            }
        } catch (error) {
            console.error(error);
            toast.error(t('purchaseOrders.details.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            const res = await fetch(`/api/purchase-orders/${id}/pdf`, {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            });

            if (!res.ok) throw new Error('Erro ao gerar PDF');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RQF-${order?.po_number || id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(t('purchaseOrders.details.processError', 'Erro ao baixar o PDF'));
        }
    };

    const handleAction = async (action: 'approved' | 'rejected') => {
        const confirmMsg = action === 'approved'
            ? t('purchaseOrders.details.confirmApprove')
            : t('purchaseOrders.details.confirmReject');

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/purchase-orders/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Locale': locale
                },
                body: JSON.stringify({ status: action })
            });

            if (!res.ok) throw new Error('Falha na ação');

            toast.success(action === 'approved' ? t('purchaseOrders.details.approved') : t('purchaseOrders.details.rejected'));
            fetchOrderDetails(); // Refresh background
        } catch (error) {
            toast.error(t('purchaseOrders.details.processError'));
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('purchaseOrders.details.loading')}</div>;
    }

    if (!order) return null;

    // Find the last status change to approved or rejected
    const approvalInfo = order.history?.slice().reverse().find((h: any) => h.action === 'status_change' && (h.to === 'approved' || h.to === 'rejected'));

    // Helper for currency
    const formatCurrency = (value: number) => {
        // We can default to BRL or try to detect locale, but typically currency is fixed per transaction. 
        // Assuming BRL for now as user environment seems BRL-based, but could use user locale if needed.
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // Helper for date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString();
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/department/purchase-orders" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{t('purchaseOrders.details.order')} {order.po_number || `#${order.id.slice(0, 8)}`}</h1>
                        <p className="text-gray-500 text-sm">
                            {t('purchaseOrders.details.createdOn', {
                                date: formatDate(order.created_at),
                                time: formatTime(order.created_at)
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors flex items-center gap-2"
                        title="Download PDF"
                    >
                        <FiDownload /> PDF
                    </button>
                    <StatusBadge status={order.status} t={t} />
                </div>
            </div>

            {/* Approval Info Banner */}
            {approvalInfo && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${approvalInfo.to === 'approved' ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-red-50 border border-red-100 text-red-800'}`}>
                    <div className="mt-1">
                        {approvalInfo.to === 'approved' ? <FiCheck /> : <FiX />}
                    </div>
                    <div>
                        <p className="font-semibold">
                            {approvalInfo.to === 'approved' ? t('purchaseOrders.details.bannerApproved') : t('purchaseOrders.details.bannerRejected')}
                        </p>
                        <p className="text-sm opacity-90">
                            {t('purchaseOrders.details.byUserOn', {
                                user: approvalInfo.user_name || 'User',
                                date: formatDate(approvalInfo.date),
                                time: formatTime(approvalInfo.date)
                            })}
                        </p>
                        {approvalInfo.note && (
                            <p className="mt-2 text-sm italic border-l-2 border-current pl-2">
                                "{approvalInfo.note}"
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiFileText /> {t('purchaseOrders.details.itemsTitle')}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">{t('purchaseOrders.details.table.description', 'Descrição')}</th>
                                        <th className="px-4 py-2 text-right">{t('purchaseOrders.details.table.quantity', 'Qtd')}</th>
                                        <th className="px-4 py-2 text-right">{t('purchaseOrders.details.table.unitValue', 'Valor Unit.')}</th>
                                        <th className="px-4 py-2 text-right">{t('purchaseOrders.details.table.total', 'Total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">
                                                {formatCurrency(item.unit_value)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(item.quantity * item.unit_value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t font-semibold bg-gray-50">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right">{t('purchaseOrders.details.freight')}</td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(order.freight_cost || 0)}
                                        </td>
                                    </tr>
                                    <tr className="text-lg text-blue-700">
                                        <td colSpan={3} className="px-4 py-3 text-right">{t('purchaseOrders.details.total')}</td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(order.total_value)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Observation */}
                    {order.observation && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h2 className="font-semibold text-gray-800 mb-2">{t('purchaseOrders.details.observations')}</h2>
                            <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm">{order.observation}</p>
                        </div>
                    )}

                    {/* Attachments */}
                    {order.invoice_url && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
                            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <FiDownload /> {t('purchaseOrders.details.attachments')}
                            </h2>
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                <span className="text-sm text-blue-900 font-medium">{t('purchaseOrders.details.invoiceAttached')}</span>
                                <a
                                    href={order.invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm font-semibold transition-colors shadow-sm"
                                >
                                    {t('purchaseOrders.details.downloadView')}
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
                            <h3 className="font-semibold text-gray-800 mb-4">{t('purchaseOrders.details.approval')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleAction('approved')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <FiCheck /> {t('purchaseOrders.details.approveBtn')}
                                </button>
                                <button
                                    onClick={() => handleAction('rejected')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <FiX /> {t('purchaseOrders.details.rejectBtn')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Provider Info */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-sm space-y-3">
                        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FiTruck /> {t('purchaseOrders.details.providerData')}
                        </h3>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.providerName')}</span>
                            <span className="font-medium text-gray-900">{order.provider_name}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.providerCnpj')}</span>
                            <span className="font-medium text-gray-900">{order.provider_cnpj}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.providerEmail')}</span>
                            <a href={`mailto:${order.provider_email}`} className="text-blue-600 hover:underline">{order.provider_email}</a>
                        </div>
                    </div>

                    {/* Delivery & Payment */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-sm space-y-3">
                        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FiCreditCard /> {t('purchaseOrders.details.deliveryPayment')}
                        </h3>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.paymentTerms')}</span>
                            <span className="font-medium text-gray-900">{order.payment_terms}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.deliveryDate')}</span>
                            <span className="font-medium text-gray-900">{order.delivery_date ? formatDate(order.delivery_date) : '-'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.address')}</span>
                            <span className="font-medium text-gray-900">{order.delivery_address || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">{t('purchaseOrders.details.buyer')}</span>
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

const StatusBadge = ({ status, t }: { status: string, t: any }) => {
    const styles: any = {
        approved: 'bg-green-100 text-green-700 border-green-200',
        rejected: 'bg-red-100 text-red-700 border-red-200',
        submitted: 'bg-blue-100 text-blue-700 border-blue-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        draft: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${styles[status] || styles.draft}`}>
            {t(`purchaseOrders.table.status_${status}`, status)}
        </span>
    );
};
