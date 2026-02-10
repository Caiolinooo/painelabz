'use client';

import React from 'react';
import { FiTrash2, FiEye } from 'react-icons/fi';
import { EPIRegistration, EPI_STATUS_LABELS, EPI_STATUS_COLORS } from '@/types/epi';
import EPIStatusBadge from './EPIStatusBadge';

interface EPIListProps {
    registrations: EPIRegistration[];
    onCancel?: (id: string) => Promise<void>;
    showActions?: boolean;
    showHistory?: boolean;
}

export default function EPIList({ registrations, onCancel, showActions = true, showHistory = false }: EPIListProps) {
    if (registrations.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nenhum registro encontrado</h3>
                <p className="mt-2 text-sm text-gray-500">
                    {showHistory
                        ? 'Não há histórico de solicitações de EPI.'
                        : 'Você ainda não possui equipamentos de proteção individual registrados.'}
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Equipamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantidade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CA
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Solicitado em
                        </th>
                        {showActions && (
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration: any) => (
                        <tr key={registration.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                    {registration.equipment_type}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">{registration.reason}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{registration.quantity}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{registration.equipment_ca || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                    {registration.validity_date
                                        ? new Date(registration.validity_date).toLocaleDateString('pt-BR')
                                        : '-'}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <EPIStatusBadge status={registration.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                    {new Date(registration.created_at).toLocaleDateString('pt-BR')}
                                </div>
                            </td>
                            {showActions && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {registration.status === 'pending' && onCancel && (
                                        <button
                                            onClick={() => onCancel(registration.id)}
                                            className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                            Cancelar
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
