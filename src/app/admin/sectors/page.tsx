'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiShield, FiSave, FiCheck, FiX, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { SYSTEM_MODULES, MODULE_CATEGORIES, SystemModule } from '@/constants/modules';

interface Sector {
    id: string;
    name: string;
    allowed_modules: string[];
    allowed_cards: string[];
}

// Group modules helper
const groupedModules = SYSTEM_MODULES.reduce((acc, module) => {
    const cat = module.category || 'core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(module);
    return acc;
}, {} as Record<string, SystemModule[]>);

export default function AdminSectorsPage() {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSector, setEditingSector] = useState<Sector | null>(null);

    const fetchSectors = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/sectors');
            if (res.ok) {
                const data = await res.json();
                setSectors(data);
            } else {
                toast.error('Falha ao carregar setores');
            }
        } catch (error) {
            console.error('Error fetching sectors:', error);
            toast.error('Erro ao carregar setores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSectors();
    }, [fetchSectors]);

    const handleModuleToggle = (moduleId: string) => {
        if (!editingSector) return;

        const currentModules = editingSector.allowed_modules || [];
        const newModules = currentModules.includes(moduleId)
            ? currentModules.filter(m => m !== moduleId)
            : [...currentModules, moduleId];

        setEditingSector({ ...editingSector, allowed_modules: newModules });
    };

    const handleSave = async () => {
        if (!editingSector) return;

        try {
            setSaving(editingSector.id);

            const res = await fetch(`/api/sectors/${editingSector.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    allowed_modules: editingSector.allowed_modules,
                    allowed_cards: editingSector.allowed_cards
                })
            });

            if (res.ok) {
                toast.success('Permissões salvas com sucesso! Os usuários verão as mudanças instantaneamente.');
                setSectors(prev => prev.map(s => s.id === editingSector.id ? editingSector : s));
                setEditingSector(null);

                // Dispatch events to force cache invalidation across the app
                if (typeof window !== 'undefined') {
                    console.log('🔄 Dispatching permission update events...');
                    // Clear all permission caches in sessionStorage
                    Object.keys(sessionStorage).forEach(key => {
                        if (key.startsWith('permissions-')) {
                            sessionStorage.removeItem(key);
                            console.log('🗑️ Cleared cache:', key);
                        }
                    });
                    window.dispatchEvent(new Event('permissions-updated'));
                    window.dispatchEvent(new Event('cards-cache-invalidated'));
                }
            } else {
                toast.error('Falha ao salvar permissões');
            }
        } catch (error) {
            console.error('Error saving sector:', error);
            toast.error('Erro ao salvar');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <FiShield className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Permissões por Setor</h1>
                    <p className="text-gray-500">Configure quais módulos cada setor pode acessar por padrão.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Setor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulos Permitidos</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sectors.map(sector => (
                                <tr key={sector.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800 align-top">{sector.name}</td>
                                    <td className="px-4 py-3">
                                        {editingSector?.id === sector.id ? (
                                            <div className="space-y-4">
                                                {Object.entries(groupedModules).map(([catKey, modules]) => (
                                                    <div key={catKey}>
                                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                            {(MODULE_CATEGORIES as any)[catKey] || catKey}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {modules.map(mod => {
                                                                const isEnabled = editingSector.allowed_modules?.includes(mod.id);
                                                                return (
                                                                    <button
                                                                        key={mod.id}
                                                                        onClick={() => handleModuleToggle(mod.id)}
                                                                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${isEnabled
                                                                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                                            : 'bg-gray-100 border-gray-200 text-gray-500'
                                                                            }`}
                                                                        title={mod.description}
                                                                    >
                                                                        {isEnabled ? <FiCheck className="inline mr-1" /> : <FiX className="inline mr-1" />}
                                                                        {mod.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {(sector.allowed_modules || []).length > 0 ? (
                                                    sector.allowed_modules.map(modId => {
                                                        const mod = SYSTEM_MODULES.find(m => m.id === modId);
                                                        return (
                                                            <span key={modId} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full" title={mod?.description}>
                                                                {mod?.label || modId}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Nenhum (herda do Role)</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right align-top">
                                        {editingSector?.id === sector.id ? (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => setEditingSector(null)}
                                                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving === sector.id}
                                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <FiSave className="w-4 h-4" />
                                                    {saving === sector.id ? 'Salvando...' : 'Salvar'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingSector({ ...sector, allowed_modules: sector.allowed_modules || [], allowed_cards: sector.allowed_cards || [] })}
                                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <FiSettings className="w-4 h-4" />
                                                Configurar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Como funciona a hierarquia de permissões?</h3>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li><strong>Setor (Base)</strong>: Define os módulos padrão para todos os usuários do setor.</li>
                    <li><strong>Role (Override 1)</strong>: ADMIN e MANAGER têm permissões expandidas, sobrescrevendo o setor.</li>
                    <li><strong>Usuário (Override 2)</strong>: Permissões individuais do usuário sobrescrevem tudo.</li>
                </ol>
            </div>
        </div>
    );
}
