'use client';

import React, { useState, useEffect } from 'react';
import PurchaseRequestForm from '@/components/PurchaseRequest/PurchaseRequestForm';
import { useRouter } from 'next/router';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function EditPurchaseRequestPage() {
    const router = useRouter();
    const { id } = router.query;
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchRequest();
        }
    }, [id]);

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`/api/purchase-requests/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Erro ao buscar requisição');
            }

            const data = await res.json();
            if (data.data.status !== 'draft') {
                toast.error('Apenas requisições em rascunho podem ser editadas');
                router.push(`/department/purchase-requests/${id}`);
                return;
            }

            setInitialData(data.data);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao carregar os dados');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Editar Requisição de Compra</h1>
                    <p className="text-gray-500">Altere as informações da sua requisição em rascunho</p>
                </div>
                <Link
                    href={`/department/purchase-requests/${id}`}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <FiArrowLeft size={24} />
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando formulário...</p>
                </div>
            ) : initialData ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <PurchaseRequestForm initialData={initialData} requestId={String(id)} />
                </div>
            ) : (
                 <div className="text-center py-12">
                    <p className="text-gray-500">Não foi possível carregar a requisição.</p>
                </div>
            )}
        </div>
    );
}
