import React from 'react';
import { FiDollarSign, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface StatsProps {
    orders: any[];
}

export default function PurchaseOrderStats({ orders }: StatsProps) {
    const totalValue = orders.reduce((acc, curr) => acc + (Number(curr.total_value) || 0), 0);
    const pendingCount = orders.filter(o => o.status === 'submitted' || o.status === 'pending').length;
    const approvedCount = orders.filter(o => o.status === 'approved').length;
    const rejectedCount = orders.filter(o => o.status === 'rejected').length;

    const cards = [
        {
            label: 'Valor Total',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue),
            icon: FiDollarSign,
            color: 'bg-blue-500',
            textColor: 'text-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Pendentes',
            value: pendingCount,
            icon: FiClock,
            color: 'bg-yellow-500',
            textColor: 'text-yellow-500',
            bgColor: 'bg-yellow-50'
        },
        {
            label: 'Aprovados',
            value: approvedCount,
            icon: FiCheckCircle,
            color: 'bg-green-500',
            textColor: 'text-green-500',
            bgColor: 'bg-green-50'
        },
        {
            label: 'Rejeitados',
            value: rejectedCount,
            icon: FiXCircle,
            color: 'bg-red-500',
            textColor: 'text-red-500',
            bgColor: 'bg-red-50'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.bgColor} ${card.textColor}`}>
                        <card.icon className="w-6 h-6" />
                    </div>
                </div>
            ))}
        </div>
    );
}
