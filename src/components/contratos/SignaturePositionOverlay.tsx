'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SignaturePositionOverlayProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    status?: 'PENDING' | 'SIGNED' | 'REJECTED';
    onClick?: () => void;
    interactive?: boolean;
    draggable?: boolean;
    onDragEnd?: (newX: number, newY: number) => void;
    colorClasses?: {
        border: string;
        bg: string;
        text: string;
        ring: string;
    };
    pulse?: boolean;
}

export default function SignaturePositionOverlay({
    x,
    y,
    width,
    height,
    label = 'Assine Aqui',
    status = 'PENDING',
    onClick,
    interactive = false,
    draggable = false,
    onDragEnd,
    colorClasses,
    pulse = false,
}: SignaturePositionOverlayProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x, y });
    const elementRef = useRef<HTMLDivElement>(null);

    // Sync position if external x,y changes
    useEffect(() => {
        if (!isDragging) {
            setCurrentPos({ x, y });
        }
    }, [x, y, isDragging]);

    const statusStyles = {
        PENDING: {
            border: 'border-red-400',
            bg: 'bg-red-50/70',
            text: 'text-red-600',
            ring: 'ring-red-200',
        },
        SIGNED: {
            border: 'border-emerald-400',
            bg: 'bg-emerald-50/70',
            text: 'text-emerald-600',
            ring: 'ring-emerald-200',
        },
        REJECTED: {
            border: 'border-gray-400',
            bg: 'bg-gray-50/70',
            text: 'text-gray-500',
            ring: 'ring-gray-200',
        },
    };

    // Use custom color tokens if available, fallback to status defaults
    const styles = colorClasses || statusStyles[status] || statusStyles.PENDING;
    const statusLabel = status === 'SIGNED' ? '✓ Assinado' : status === 'REJECTED' ? '✕ Rejeitado' : label;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggable) {
            if (interactive && onClick) onClick();
            return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // Prevent triggering the PDF click handler
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - currentPos.x,
            y: e.clientY - currentPos.y
        });
        
        // Add listeners to document
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
        // Use functional state update to ensure we use the latest dragOffset without needing it in a closure
        setDragOffset(prevOffset => {
            const newX = Math.max(0, e.clientX - prevOffset.x);
            const newY = Math.max(0, e.clientY - prevOffset.y);
            setCurrentPos({ x: newX, y: newY });
            return prevOffset;
        });
    };

    const handlePointerUp = (e: PointerEvent) => {
        setIsDragging(false);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        
        // Trigger onDragEnd with the final position
        setCurrentPos(prev => {
            if (onDragEnd) onDragEnd(prev.x, prev.y);
            return prev;
        });
    };

    // Cleanup listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    return (
        <div
            ref={elementRef}
            onPointerDown={handlePointerDown}
            className={`absolute border-2 ${styles.border} ${styles.bg} rounded-md flex flex-col items-center justify-center transition-all duration-200
                ${pulse && status === 'PENDING' ? 'animate-pulse ring-4' : ''}
                ${interactive || draggable ? (isDragging ? 'cursor-grabbing shadow-lg ring-2' : 'cursor-grab hover:ring-2 hover:shadow-md') : 'pointer-events-none'}
                ${interactive && !draggable ? 'cursor-pointer hover:scale-105' : ''}
                ${interactive ? styles.ring : ''}`}
            style={{
                left: currentPos.x,
                top: currentPos.y,
                width: width,
                height: height,
                zIndex: isDragging ? 50 : 10,
                touchAction: 'none' // Prevent scrolling when dragging on touch devices
            }}
        >
            <span className={`text-xs font-semibold ${styles.text} select-none pointer-events-none`}>
                {statusLabel}
            </span>
            {draggable && (
                <div className={`mt-1 text-[10px] ${styles.text} opacity-70 select-none pointer-events-none`}>
                    Arrastar
                </div>
            )}
        </div>
    );
}

export const PRESET_SIGNER_COLORS = [
    { border: 'border-indigo-500', bg: 'bg-indigo-50/90', text: 'text-indigo-700', ring: 'ring-indigo-300' },
    { border: 'border-teal-500', bg: 'bg-teal-50/90', text: 'text-teal-700', ring: 'ring-teal-300' },
    { border: 'border-orange-500', bg: 'bg-orange-50/90', text: 'text-orange-700', ring: 'ring-orange-300' },
    { border: 'border-purple-500', bg: 'bg-purple-50/90', text: 'text-purple-700', ring: 'ring-purple-300' },
    { border: 'border-rose-500', bg: 'bg-rose-50/90', text: 'text-rose-700', ring: 'ring-rose-300' },
    { border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-700', ring: 'ring-cyan-300' },
    { border: 'border-amber-500', bg: 'bg-amber-50/90', text: 'text-amber-700', ring: 'ring-amber-300' },
    { border: 'border-emerald-500', bg: 'bg-emerald-50/90', text: 'text-emerald-700', ring: 'ring-emerald-300' },
];

export function getSignerColor(identifier?: string) {
    if (!identifier) return PRESET_SIGNER_COLORS[0];
    
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % PRESET_SIGNER_COLORS.length;
    return PRESET_SIGNER_COLORS[index];
}
