'use client';

import React from 'react';

interface DocumentStatusBadgeProps {
    status: 'PENDING' | 'SIGNED' | 'REJECTED' | string;
    size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    PENDING: {
        label: 'Pendente',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-400',
    },
    SIGNED: {
        label: 'Assinado',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-400',
    },
    REJECTED: {
        label: 'Rejeitado',
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-400',
    },
    ACTIVE: {
        label: 'Ativo',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-400',
    },
};

export default function DocumentStatusBadge({ status, size = 'sm' }: DocumentStatusBadgeProps) {
    const config = STATUS_CONFIG[status] || {
        label: status,
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        dot: 'bg-gray-400',
    };

    const sizeClasses = size === 'sm'
        ? 'text-xs px-2.5 py-0.5'
        : 'text-sm px-3 py-1';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}
