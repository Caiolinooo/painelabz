import React, { useState, useRef, useEffect } from 'react';
import { FiCircle, FiMoon, FiMinusCircle, FiEyeOff, FiChevronDown } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

type StatusType = 'online' | 'away' | 'dnd' | 'invisible';

interface StatusOption {
    value: StatusType;
    label: string;
    color: string;
    icon: React.ReactNode;
}

const STATUS_OPTIONS: StatusOption[] = [
    { value: 'online', label: 'Online', color: 'bg-green-500', icon: <FiCircle className="w-3 h-3 fill-current" /> },
    { value: 'away', label: 'Ausente', color: 'bg-yellow-500', icon: <FiMoon className="w-3 h-3" /> },
    { value: 'dnd', label: 'Não Perturbe', color: 'bg-red-500', icon: <FiMinusCircle className="w-3 h-3" /> },
    { value: 'invisible', label: 'Invisível', color: 'bg-gray-500', icon: <FiEyeOff className="w-3 h-3" /> },
];

interface StatusSelectorProps {
    userId: string;
    currentStatus: StatusType;
    onStatusChange: (status: StatusType) => void;
}

export default function StatusSelector({ userId, currentStatus, onStatusChange }: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<StatusType>(currentStatus);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStatusChange = async (newStatus: StatusType) => {
        setStatus(newStatus);
        setIsOpen(false);
        onStatusChange(newStatus);

        // Persist to database via API
        try {
            const response = await fetch('/api/chat/presence', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ action: 'status', status: newStatus })
            });

            if (!response.ok) {
                console.error('Error updating status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const currentOption = STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors text-left w-full group"
            >
                <div className={`w-2.5 h-2.5 rounded-full ${currentOption.color}`}></div>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">{currentOption.label}</span>
                <FiChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Alterar Status</p>
                    </div>
                    {STATUS_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => handleStatusChange(option.value)}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors ${status === option.value ? 'bg-white/5' : ''}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${option.color} flex items-center justify-center text-white`}>
                                {option.icon}
                            </div>
                            <span className="text-sm text-zinc-200">{option.label}</span>
                            {status === option.value && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export { STATUS_OPTIONS };
export type { StatusType };
