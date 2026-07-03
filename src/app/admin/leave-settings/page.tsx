'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiSave, FiSearch, FiAlertCircle, FiMail, FiClock, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { LeaveSectorConfig } from '@/services/leaveService';
import { getToken } from '@/lib/tokenStorage';

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

    // ===== Configurações globais =====
    const [hrEmail, setHrEmail] = useState('');
    const [savingHr, setSavingHr] = useState(false);

    // Lista de emails adicionais (DP e demais responsáveis) — separados por vírgula
    const [extraNotifyEmails, setExtraNotifyEmails] = useState('');
    const [savingExtra, setSavingExtra] = useState(false);

    // Prazo de antecedência (em dias)
    const [advanceNoticeDays, setAdvanceNoticeDays] = useState<number>(40);
    const [savingAdvanceDays, setSavingAdvanceDays] = useState(false);

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
            const token = getToken();
            const res = await fetch('/api/admin/leave-settings', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to load configs');
            const data = await res.json();

            setConfigs(data.configs || []);
            setSectors(data.sectors || []);
            setUsers(data.users || []);
            setHrEmail(data.hrEmail || '');
            setExtraNotifyEmails(data.extraNotifyEmails || '');
            setAdvanceNoticeDays(typeof data.advanceNoticeDays === 'number' ? data.advanceNoticeDays : 40);

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

            const token = getToken();
            const res = await fetch('/api/admin/leave-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
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
            const reloadToken = getToken();
            const reloadRes = await fetch('/api/admin/leave-settings', {
                headers: reloadToken ? { 'Authorization': `Bearer ${reloadToken}` } : {}
            });
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

    /**
     * Helper genérico para salvar uma configuração global via API.
     * Sempre envia TODOS os campos globais juntos para evitar
     * sobrescrever com valor antigo/undefined.
     */
    const saveGlobalSettings = async (overrides: Partial<{
        hrEmail: string;
        extraNotifyEmails: string;
        advanceNoticeDays: number;
    }>): Promise<boolean> => {
        const token = getToken();
        const res = await fetch('/api/admin/leave-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: ***REMOVED***
                hrEmail,
                extraNotifyEmails,
                advanceNoticeDays,
                ...overrides
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || 'Falha ao salvar');
        }
        return true;
    };

    const handleSaveHrEmail = async () => {
        if (!hrEmail || !hrEmail.includes('@')) {
            toast.error('Insira um e-mail válido.');
            return;
        }

        try {
            setSavingHr(true);
            await saveGlobalSettings({ hrEmail });
            toast.success('E-mail do RH salvo com sucesso!');
        } catch (error: any) {
            console.error('Error saving HR email:', error);
            toast.error(error.message || 'Erro ao salvar e-mail do RH');
        } finally {
            setSavingHr(false);
        }
    };

    const handleSaveExtraEmails = async () => {
        // Permite vazio (nesse caso removemos a configuração do banco)
        if (extraNotifyEmails && extraNotifyEmails.trim()) {
            const emails = extraNotifyEmails.split(',').map(e => e.trim()).filter(Boolean);
            const invalid = emails.find(e => !e.includes('@'));
            if (invalid) {
                toast.error(`E-mail adicional inválido: ${invalid}`);
                return;
            }
        }

        try {
            setSavingExtra(true);
            await saveGlobalSettings({ extraNotifyEmails });
            toast.success('Lista de e-mails salva com sucesso!');
        } catch (error: any) {
            console.error('Error saving extra emails:', error);
            toast.error(error.message || 'Erro ao salvar e-mails adicionais');
        } finally {
            setSavingExtra(false);
        }
    };

    const handleSaveAdvanceDays = async () => {
        if (!advanceNoticeDays || isNaN(Number(advanceNoticeDays))) {
            toast.error('Insira um número válido de dias.');
            return;
        }
        const days = Number(advanceNoticeDays);
        if (days < 1 || days > 365) {
            toast.error('O prazo deve ser entre 1 e 365 dias.');
            return;
        }

        try {
            setSavingAdvanceDays(true);
            await saveGlobalSettings({ advanceNoticeDays: days });
            toast.success(`Prazo de antecedência atualizado para ${days} dias!`);
        } catch (error: any) {
            console.error('Error saving advance days:', error);
            toast.error(error.message || 'Erro ao salvar prazo de antecedência');
        } finally {
            setSavingAdvanceDays(false);
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
                    <p className="text-gray-500">Configure os e-mails de notificação, o prazo de antecedência e a hierarquia de aprovação por setor.</p>
                </div>
            </div>

            {/* SEÇÃO 1: Configurações Globais - Notificações e Prazos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">1. Configurações Globais</h2>
                    <p className="text-sm text-gray-500">E-mails que recebem alertas automáticos em todas as etapas do processo de férias e prazo de antecedência para solicitações.</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Aviso informativo sobre o comportamento das notificações */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                        <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Notificações automáticas por e-mail</p>
                            <p className="mb-2">Todos os e-mails configurados abaixo (RH + lista adicional) recebem notificações em <strong>todas as etapas</strong> do processo de férias: nova solicitação, avanço do líder para o gerente, aprovação final e rejeição. O colaborador solicitante também é notificado em todas as etapas.</p>
                            <p className="text-xs opacity-80">Use a lista adicional para incluir o DP, diretores, fiscais ou quaisquer outros responsáveis que precisem acompanhar o processo.</p>
                        </div>
                    </div>

                    {/* E-mail do RH */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-2xl">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <FiMail className="w-4 h-4 text-gray-500" />
                                E-mail do RH
                            </label>
                            <input
                                type="email"
                                placeholder="rh@seudominio.com"
                                value={hrEmail}
                                onChange={(e) => setHrEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Notificado em todas as etapas do processo de férias (nova solicitação, avanço, aprovação e rejeição).</p>
                        </div>
                        <button
                            onClick={handleSaveHrEmail}
                            disabled={savingHr}
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${savingHr ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                        >
                            <FiSave className={`mr-2 ${savingHr ? 'animate-pulse' : ''}`} />
                            {savingHr ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Lista de e-mails adicionais (DP e demais responsáveis) */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-2xl">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <FiMail className="w-4 h-4 text-gray-500" />
                                E-mails Adicionais para Notificação (DP e responsáveis)
                            </label>
                            <input
                                type="text"
                                placeholder="dp@exemplo.com, diretor@exemplo.com, fiscal@exemplo.com"
                                value={extraNotifyEmails}
                                onChange={(e) => setExtraNotifyEmails(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Lista de e-mails separados por vírgula. Todos os e-mails desta lista recebem notificações em todas as etapas do processo de férias, assim como o RH. Deixe vazio para não enviar cópias adicionais.
                            </p>
                        </div>
                        <button
                            onClick={handleSaveExtraEmails}
                            disabled={savingExtra}
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${savingExtra ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                        >
                            <FiSave className={`mr-2 ${savingExtra ? 'animate-pulse' : ''}`} />
                            {savingExtra ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Prazo de antecedência */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-2xl">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <FiClock className="w-4 h-4 text-gray-500" />
                                Prazo de Antecedência (dias)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={365}
                                placeholder="40"
                                value={advanceNoticeDays}
                                onChange={(e) => setAdvanceNoticeDays(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Número mínimo de dias entre a data da solicitação e o início das férias.
                                Padrão DP: <strong>40 dias</strong> (contempla solicitação + processamento para cumprimento do prazo legal).
                            </p>
                        </div>
                        <button
                            onClick={handleSaveAdvanceDays}
                            disabled={savingAdvanceDays}
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${savingAdvanceDays ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                        >
                            <FiSave className={`mr-2 ${savingAdvanceDays ? 'animate-pulse' : ''}`} />
                            {savingAdvanceDays ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
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
                        <div className="overflow-x-auto">
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
        </div>
    );
}
