import React from 'react';
import { EPIStatus, EPI_STATUS_LABELS, EPI_STATUS_COLORS } from '@/types/epi';

interface EPIStatusBadgeProps {
    status: EPIStatus;
    size?: 'sm' | 'md' | 'lg';
}

export default function EPIStatusBadge({ status, size = 'md' }: EPIStatusBadgeProps) {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1 text-sm'
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${EPI_STATUS_COLORS[status]}`}>
            {EPI_STATUS_LABELS[status]}
        </span>
    );
}
