'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiSave, FiSearch, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { LeaveSectorConfig } from '@/services/leaveService';

interface UnifiedUser {
    id: string;
    name: string;
    email: string;
    sector_id: string;
    role: string;
    active: boolean;
}

interface Sector {
    id: string;
    name: string;
}

export default function AdminLeaveSettingsPage() {
    const [configs, setConfigs] = useState<LeaveSectorConfig[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [users, setUsers] = useState<UnifiedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [hrEmail, setHrEmail] = useState('');
    const [savingHr, setSavingHr] = useState(false);

    // State for unsaved changes
    const [editedConfigs, setEditedConfigs] = useState<Record<string, { leader_id: string | null, manager_id: string | null }>>({});
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load settings and dropdown data from API (Bypasses RLS)
            const res = await fetch('/api/admin/leave-settings');
            if (!res.ok) throw new Error('Failed to load configs');
            const data = await res.json();

            setConfigs(data.configs || []);
            setSectors(data.sectors || []);
            setUsers(data.users || []);
            setHrEmail(data.hrEmail || '');

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (sectorId: string, field: 'leader_id' | 'manager_id', value: string) => {
        const existingConfig = configs.find(c => c.sector_id === sectorId);
        const currentValueForSector = editedConfigs[sectorId] || {
            leader_id: existingConfig?.leader_id || null,
            manager_id: existingConfig?.manager_id || null
        };

        setEditedConfigs(prev => ({
            ...prev,
            [sectorId]: {
                ...currentValueForSector,
                [field]: value === '' ? null : value
            }
        }));
    };

    const handleSaveSector = async (sectorId: string) => {
        if (!editedConfigs[sectorId]) return;

        try {
            setSaving(sectorId);
            const dataToSave = editedConfigs[sectorId];

            const res = await fetch('/api/admin/leave-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    sector_id: sectorId,
                    leader_id: dataToSave.leader_id,
                    manager_id: dataToSave.manager_id
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success('Hierarquia salva com sucesso');

            // Update local state to reflect saved config
            // Removing it from editedConfigs means it has no unsaved changes
            setEditedConfigs(prev => {
                const next = { ...prev };
                delete next[sectorId];
                return next;
            });

            // Reload configs to get full populated objects from server
            const reloadRes = await fetch('/api/admin/leave-settings');
            if (reloadRes.ok) {
                const refreshed = await reloadRes.json();
                setConfigs(refreshed.configs || []);
            }

        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Erro ao salvar hierarquia');
        } finally {
            setSaving(null);
        }
    };

    const handleSaveHrEmail = async () => {
        if (!hrEmail || !hrEmail.includes('@')) {
            toast.error('Insira um e-mail válido.');
            return;
        }

        try {
            setSavingHr(true);
            const res = await fetch('/api/admin/leave-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** hrEmail })
            });

            if (!res.ok) throw new Error('Failed to save HR Email');

            toast.success('E-mail do RH salvo com sucesso!');
        } catch (error) {
            console.error('Error saving HR email:', error);
            toast.error('Erro ao salvar e-mail do RH');
        } finally {
            setSavingHr(false);
        }
    };

    const hasUnsavedChanges = (sectorId: string) => {
        return !!editedConfigs[sectorId];
    };

    const filteredSectors = sectors.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <FiUsers className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Hierarquia de Férias</h1>
                    <p className="text-gray-500">Configure o e-mail do RH e a hierarquia de aprovação para cada setor.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">1. Configurações Globais (RH)</h2>
                        <p className="text-sm text-gray-500">Este é o e-mail que receberá alertas sobre férias solicitadas, aprovadas e rejeitadas.</p>
                    </div>
                </div>
                <div className="p-6 flex items-end gap-4 max-w-2xl">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Notificações RH</label>
                        <input
                            type="email"
                            placeholder="rh@seudominio.com"
                            value={hrEmail}
                            onChange={(e) => setHrEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleSaveHrEmail}
                        disabled={savingHr}
                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${savingHr ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            }`}
                    >
                        <FiSave className={`mr-2 ${savingHr ? 'animate-pulse' : ''}`} />
                        {savingHr ? 'Salvando...' : 'Salvar E-mail'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">2. Hierarquia por Setor</h2>
                    <p className="text-sm text-gray-500">Defina os líderes e gerentes que devem aprovar os pedidos por departamento.</p>
                </div>
                <div className="p-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <FiAlertCircle className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Fluxo de Aprovação</p>
                                <p className="mb-2">Quando um colaborador solicita férias, a aprovação segue esta ordem rígida:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li><strong>Líder do Setor:</strong> Recebe a notificação primeiro e deve pré-aprovar.</li>
                                    <li><strong>Gerente do Setor:</strong> Recebe a notificação após o Líder e realiza a aprovação final.</li>
                                </ol>
                                <p className="mt-2 text-xs opacity-80">(Se um deles não for definido, a solicitação pula aquela etapa. Se nenhum for definido, pedidos vão para aprovação gerencial ou do Admin)</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar setor..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Setor</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">1º Aprovador: Líder</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">2º Aprovador: Gerente</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSectors.map(sector => {
                                    const config = configs.find(c => c.sector_id === sector.id);
                                    const isEdited = hasUnsavedChanges(sector.id);

                                    const currentLeaderId = isEdited
                                        ? editedConfigs[sector.id].leader_id
                                        : (config?.leader_id || '');

                                    const currentManagerId = isEdited
                                        ? editedConfigs[sector.id].manager_id
                                        : (config?.manager_id || '');

                                    return (
                                        <tr key={sector.id} className={`transition-colors ${isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 font-medium text-gray-800">{sector.name}</td>

                                            <td className="px-6 py-4">
                                                <select
                                                    value={currentLeaderId || ''}
                                                    onChange={(e) => handleConfigChange(sector.id, 'leader_id', e.target.value)}
                                                    className="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">-- Sem Líder Definido --</option>
                                                    {users.map(u => (
                                                        <option key={`l-${u.id}`} value={u.id}>{u.name} ({u.email})</option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-6 py-4">
                                                <select
                                                    value={currentManagerId || ''}
                                                    onChange={(e) => handleConfigChange(sector.id, 'manager_id', e.target.value)}
                                                    className="w-full border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">-- Sem Gerente Definido --</option>
                                                    {users.map(u => (
                                                        <option key={`m-${u.id}`} value={u.id}>{u.name} ({u.email})</option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleSaveSector(sector.id)}
                                                    disabled={!isEdited || saving === sector.id}
                                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${isEdited
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <FiSave className={`mr-1.5 ${saving === sector.id ? 'animate-pulse' : ''}`} />
                                                    {saving === sector.id ? 'Salvando...' : 'Salvar'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredSectors.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum setor encontrado com essa busca.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
