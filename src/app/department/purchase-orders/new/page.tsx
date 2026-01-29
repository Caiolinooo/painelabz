'use client';

import React from 'react';
import PurchaseOrderForm from '@/components/PurchaseOrder/PurchaseOrderForm';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';

export default function NewPurchaseOrderPage() {
    const { t } = useI18n();

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/department/purchase-orders"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <FiArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('purchaseOrders.form.title')}</h1>
                    <p className="text-gray-500">{t('purchaseOrders.form.description')}</p>
                </div>
            </div>

            <PurchaseOrderForm />
        </div>
    );
}
