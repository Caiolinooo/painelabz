'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';

interface DocumentStatusBadgeProps {
    status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'ACTIVE' | 'SENT' | 'COMPLETED' | string;
    size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-400',
    },
    SIGNED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-400',
    },
    REJECTED: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-400',
    },
    ACTIVE: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-400',
    },
    SENT: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        dot: 'bg-indigo-400',
    },
    COMPLETED: {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        dot: 'bg-teal-400',
    }
};

export default function DocumentStatusBadge({ status, size = 'sm' }: DocumentStatusBadgeProps) {
    const { t } = useI18n();

    const styles = STATUS_STYLES[status] || {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        dot: 'bg-gray-400',
    };

    const sizeClasses = size === 'sm'
        ? 'text-xs px-2.5 py-0.5'
        : 'text-sm px-3 py-1';

    // Attempt to find the localized label or fall back to formatted status string
    const fallbackLabel = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const displayLabel = t(`contratos.statuses.${status.toLowerCase()}`, fallbackLabel);

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles.bg} ${styles.text} ${sizeClasses}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {displayLabel}
        </span>
    );
}
