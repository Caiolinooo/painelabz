
'use client';

import React, { useState, useEffect } from 'react';
import { FiShield, FiX, FiCheck, FiAlertTriangle, FiGrid } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { SYSTEM_MODULES } from '@/config/modules';

interface UserPermissionManagerProps {
    userId: string;
    userName: string;
    currentPermissions: {
        modules?: Record<string, boolean>;
        features?: Record<string, boolean>;
    };
    onClose: () => void;
    onPermissionsUpdated: () => void;
}

const UserPermissionManager: React.FC<UserPermissionManagerProps> = ({
    userId,
    userName,
    currentPermissions,
    onClose,
    onPermissionsUpdated
}) => {
    const { t } = useI18n();
    const [permissions, setPermissions] = useState<Record<string, boolean>>(
        currentPermissions?.modules || {}
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleToggleModule = (moduleKey: string) => {
        setPermissions(prev => ({
            ...prev,
            [moduleKey]: !prev[moduleKey]
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

            if (!token) {
                throw new Error(t('components.naoAutorizado'));
            }

            const response = await fetch(`/api/users/${userId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: ***REMOVED***
                    accessPermissions: {
                        modules: permissions,
                        features: currentPermissions?.features || {}
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao atualizar permissões');
            }

            setSuccess(true);
            setTimeout(() => {
                onPermissionsUpdated();
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Erro ao atualizar permissões:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-abz-blue flex items-center">
                        <FiShield className="mr-2" />
                        Gerenciar Permissões - {userName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100"
                        disabled={loading}
                    >
                        <FiX className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
                            <FiAlertTriangle className="mr-2 mt-0.5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success ? (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
                            <FiCheck className="mr-2 flex-shrink-0" />
                            <p>Permissões atualizadas com sucesso!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SYSTEM_MODULES.map((module) => (
                                <div
                                    key={module.key}
                                    className={`border rounded-lg p-3 cursor-pointer transition-all ${permissions[module.key]
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                                        }`}
                                    onClick={() => handleToggleModule(module.key)}
                                >
                                    <div className="flex items-start">
                                        <div className={`mt-1 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${permissions[module.key] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                                            }`}>
                                            {permissions[module.key] && <FiCheck className="text-white h-3 w-3" />}
                                        </div>
                                        <div className="ml-3">
                                            <h3 className={`text-sm font-medium ${permissions[module.key] ? 'text-green-800' : 'text-gray-700'}`}>
                                                {module.name}
                                            </h3>
                                            {module.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">{module.description}</p>
                                            )}
                                            <div className="mt-1 flex gap-1 flex-wrap">
                                                {module.defaultRoles.map(role => (
                                                    <span key={role} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-800">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark disabled:bg-blue-300 flex items-center"
                        disabled={loading || success}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionManager;
