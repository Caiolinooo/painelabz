
'use client';

import React, { useState, useEffect } from 'react';
import { FiShield, FiX, FiCheck, FiAlertTriangle, FiGrid, FiSearch } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { SYSTEM_MODULES } from '@/constants/modules';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter modules by search and category
    const filteredModules = SYSTEM_MODULES.filter(module => {
        const matchesSearch = !searchTerm || 
            module.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            module.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            module.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || module.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
                        <div className="space-y-4">
                            {/* Search and filter */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar módulos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-3 py-2 border rounded-md text-sm ${!selectedCategory ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    Todos
                                </button>
                                {['core', 'hr', 'content', 'department'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-2 border rounded-md text-sm ${selectedCategory === cat ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Modules grid */}
                            {filteredModules.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredModules.map((module) => (
                                        <div
                                            key={module.id}
                                            className={`border rounded-lg p-3 cursor-pointer transition-all ${permissions[module.id]
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                                                }`}
                                            onClick={() => handleToggleModule(module.id)}
                                        >
                                            <div className="flex items-start">
                                                <div className={`mt-1 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${permissions[module.id] ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                                                    }`}>
                                                    {permissions[module.id] && <FiCheck className="text-white h-3 w-3" />}
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <h3 className={`text-sm font-medium ${permissions[module.id] ? 'text-green-800' : 'text-gray-700'}`}>
                                                        {module.label}
                                                    </h3>
                                                    {module.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{module.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum módulo encontrado.
                                </div>
                            )}
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
