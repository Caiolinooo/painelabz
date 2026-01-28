'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiShoppingBag, FiArrowRight, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export default function PurchaseOrderWidget() {
    const { user } = useSupabaseAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchRecentOrders();
        }
    }, [user]);

    const fetchRecentOrders = async () => {
        try {
            const res = await fetch('/api/purchase-orders?limit=5');
            if (res.ok) {
                const json = await res.json();
                setOrders(json.data?.slice(0, 5) || []);
            }
        } catch (error) {
            console.error('Widget error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <FiCheckCircle className="text-green-500" />;
            case 'rejected': return <FiXCircle className="text-red-500" />;
            default: return <FiClock className="text-yellow-500" />;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FiShoppingBag className="text-blue-500" />
                    Minhas Compras
                </h3>
                <Link href="/department/purchase-orders" className="text-xs text-blue-500 hover:underline flex items-center">
                    Ver todas <FiArrowRight className="ml-1" />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg"></div>)}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                        <p>Nenhuma solicitação recente.</p>
                        <Link href="/department/purchase-orders/new" className="mt-2 text-blue-500 hover:underline">
                            Criar nova
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => (
                            <Link
                                key={order.id}
                                href={`/department/purchase-orders/${order.id}`}
                                className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {order.provider_trade_name || order.provider_name || 'Fornecedor Desconhecido'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}
                                        </p>
                                    </div>
                                    <div className="ml-2 flex flex-col items-end">
                                        {getStatusIcon(order.status)}
                                        <span className="text-[10px] text-gray-400 mt-1">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t">
                <Link
                    href="/department/purchase-orders/new"
                    className="block w-full text-center py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                    Nova Solicitação
                </Link>
            </div>
        </div>
    );
}
