import React from 'react';
import PurchaseRequestForm from '@/components/PurchaseRequest/PurchaseRequestForm';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';

export default function NewPurchaseRequestPage() {
    const { t } = useI18n();

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/department/purchase-requests"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <FiArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Nova Requisição de Compra</h1>
                    <p className="text-gray-500">Crie uma nova requisição de compra para seu setor</p>
                </div>
            </div>

            <PurchaseRequestForm />
        </div>
    );
}