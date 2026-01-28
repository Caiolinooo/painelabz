'use client';

import React, { useEffect, useState } from 'react';
import { FiSave, FiEdit2, FiPlus, FiTrash2, FiLoader, FiShoppingCart, FiUser, FiUsers, FiSearch, FiX } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';

interface ApprovalRule {
    email: string;
    limit: number;
}

interface POConfig {
    type: 'sector' | 'user';
    config_id: string | null;

    // Sector specific
    sector_id?: string;
    sector_name?: string;

    // User specific
    user_id?: string;
    user_name?: string;
    user_email?: string;

    max_value: number; // Legacy/Global Cap
    approver_emails: string[]; // Legacy
    cost_centers: string[];
    approval_rules: ApprovalRule[]; // New Tiered Rules
}

// ... (Page component logic stays mostly same, just fetching updated interface)

function ConfigRow({ config, isEditing, formData, updateFormData, handleSave, handleCancel, handleEdit, saving }: any) {
    const displayName = config.type === 'sector' ? config.sector_name : (
        <div className="flex flex-col">
            <span className="font-medium">{config.user_name}</span>
            <span className="text-xs text-gray-500">{config.user_email}</span>
        </div>
    );

    // Sort rules for display
    const rules = (isEditing ? formData?.approval_rules : config.approval_rules) || [];
    // If empty legacy check
    const hasLegacy = (config.approver_emails?.length > 0);

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 font-medium text-gray-900 align-top">
                {displayName}
                {config.type === 'sector' && <div className="text-xs text-gray-400 mt-1">ID: {config.sector_id?.slice(0, 8)}</div>}
            </td>

            {/* Approval Rules Column (Replaces Max Value & Approvers) */}
            <td className="px-6 py-4 align-top w-1/3">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Regras de Aprovação</p>

                    {isEditing ? (
                        <div className="space-y-2">
                            {rules.map((rule: ApprovalRule, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-400">Aprovador</label>
                                        <input
                                            className="w-full text-xs p-1 border rounded"
                                            value={rule.email}
                                            placeholder="email@empresa.com"
                                            onChange={(e) => {
                                                const newRules = [...rules];
                                                newRules[idx] = { ...rule, email: e.target.value };
                                                updateFormData('approval_rules', newRules);
                                            }}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] text-gray-400">Até (R$)</label>
                                        <input
                                            type="number"
                                            className="w-full text-xs p-1 border rounded"
                                            value={rule.limit}
                                            placeholder="10000"
                                            onChange={(e) => {
                                                const newRules = [...rules];
                                                newRules[idx] = { ...rule, limit: Number(e.target.value) };
                                                updateFormData('approval_rules', newRules);
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newRules = rules.filter((_: any, i: number) => i !== idx);
                                            updateFormData('approval_rules', newRules);
                                        }}
                                        className="text-red-500 hover:bg-red-50 p-1 rounded mt-3"
                                    >
                                        <FiX size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => updateFormData('approval_rules', [...rules, { email: '', limit: 0 }])}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                                <FiPlus size={12} /> Adicionar Regra
                            </button>

                            <div className="mt-4 pt-2 border-t">
                                <label className="text-xs font-medium text-gray-600 block mb-1">Limite Global (Auto Aprovação)</label>
                                <input
                                    type="number"
                                    value={formData.max_value}
                                    onChange={(e) => updateFormData('max_value', e.target.value)}
                                    className="border rounded p-1 text-xs w-24"
                                />
                                <span className="text-xs text-gray-400 ml-2">Abaixo disso não requer aprovação?</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {rules.length > 0 ? (
                                rules.sort((a: ApprovalRule, b: ApprovalRule) => a.limit - b.limit).map((rule: ApprovalRule, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 pb-1">
                                        <span className="text-gray-700">{rule.email}</span>
                                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                            {'< '} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.limit)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                hasLegacy ? (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                        Manual (Legado): {config.approver_emails.join(', ')}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic text-xs">Sem regras definidas</span>
                                )
                            )}
                        </div>
                    )}
                </div>
            </td>


            <td className="px-6 py-4 align-top w-1/4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Centros de Custo</p>
                {isEditing ? (
                    <div className="space-y-1">
                        {formData?.cost_centers.map((cc: string, idx: number) => (
                            <div key={idx} className="flex gap-1">
                                <input
                                    className="border rounded p-1 text-xs w-full"
                                    value={cc}
                                    onChange={(e) => {
                                        const newCC = [...(formData?.cost_centers || [])];
                                        newCC[idx] = e.target.value;
                                        updateFormData('cost_centers', newCC);
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const newCC = formData?.cost_centers.filter((_: any, i: number) => i !== idx);
                                        updateFormData('cost_centers', newCC);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <FiX size={14} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => updateFormData('cost_centers', [...(formData?.cost_centers || []), ''])}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <FiPlus size={12} /> Adicionar
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {config.cost_centers?.length > 0 ? (
                            config.cost_centers.map((cc: string, i: number) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {cc}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 italic text-xs">Nenhum</span>
                        )}
                    </div>
                )}
            </td>

            <td className="px-6 py-4 text-right align-top">
                {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Salvar"
                        >
                            {saving ? <FiLoader className="animate-spin" /> : <FiSave className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Cancelar"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => handleEdit(config)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                    >
                        <FiEdit2 className="w-4 h-4" />
                    </button>
                )}
            </td>
        </tr>
    );
}
export default function PurchaseOrdersConfigPage() {
    const { user } = useSupabaseAuth();
    const [configs, setConfigs] = useState<{ sectors: POConfig[], users: POConfig[] }>({ sectors: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sectors' | 'users'>('sectors');

    // Edit state
    const [editingConfig, setEditingConfig] = useState<POConfig | null>(null);
    const [saving, setSaving] = useState(false);

    // User Search State
    const [showUserModal, setShowUserModal] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/purchase-orders/config');
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            } else {
                toast.error('Erro ao carregar configurações');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (config: POConfig) => {
        setEditingConfig({ ...config });
    };

    const handleCancel = () => {
        setEditingConfig(null);
    };

    const handleSave = async () => {
        if (!editingConfig) return;
        setSaving(true);

        try {
            const payload: any = {
                max_value: Number(editingConfig.max_value),
                approver_emails: editingConfig.approver_emails,
                cost_centers: editingConfig.cost_centers,
                approval_rules: editingConfig.approval_rules,
            };

            if (editingConfig.type === 'sector') {
                payload.sector_id = editingConfig.sector_id;
            } else {
                payload.user_id = editingConfig.user_id;
                // We might need a sector_id for user configs if it's a required field in DB constraint?
                // The API handles looking it up if missing.
            }

            const res = await fetch('/api/purchase-orders/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('Configuração salva com sucesso!');
                await fetchConfigs();
                setEditingConfig(null);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Erro ao salvar configuração');
            }
        } catch (error) {
            toast.error('Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const updateFormData = (field: keyof POConfig, value: any) => {
        if (!editingConfig) return;
        setEditingConfig({ ...editingConfig, [field]: value });
    };

    // User Search Logic
    const searchUsers = async () => {
        if (!userSearchTerm.trim()) return;
        setSearchingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users_unified')
                .select('id, first_name, last_name, email, department')
                .or(`first_name.ilike.%${userSearchTerm}%,last_name.ilike.%${userSearchTerm}%,email.ilike.%${userSearchTerm}%`)
                .limit(10);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao buscar usuários');
        } finally {
            setSearchingUsers(false);
        }
    };

    const handleSelectUser = (user: any) => {
        // Create a new temporary config for this user
        setEditingConfig({
            type: 'user',
            config_id: null,
            user_id: user.id,
            user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            user_email: user.email,
            max_value: 0,
            approver_emails: [],
            cost_centers: [],
            approval_rules: []
        });
        setShowUserModal(false);
        setSearchResults([]);
        setUserSearchTerm('');
        setActiveTab('users');
    };

    if (loading) {
        return <div className="flex justify-center p-8"><FiLoader className="animate-spin text-2xl text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuração de Ordens de Compra"
                description="Defina limites, aprovadores e centros de custo."
                icon={<FiShoppingCart className="w-6 h-6" />}
            />

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('sectors')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'sectors' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FiUsers /> Departamentos
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FiUser /> Exceções de Usuários
                    </div>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {activeTab === 'users' && !editingConfig && (
                    <div className="p-4 border-b bg-gray-50 flex justify-end">
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
                        >
                            <FiPlus className="mr-1.5" /> Adicionar Exceção
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">
                                    {activeTab === 'sectors' ? 'Departamento' : 'Usuário / Email'}
                                </th>
                                <th className="px-6 py-3 font-medium w-1/3">Regras de Aprovação</th>
                                <th className="px-6 py-3 font-medium w-1/4">Centros de Custo</th>
                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* If we are editing a NEW user config that is not in the list yet, show it at top */}
                            {editingConfig &&
                                ((activeTab === 'sectors' && editingConfig.type === 'sector') || (activeTab === 'users' && editingConfig.type === 'user')) &&
                                !(configs[activeTab] || []).some((c: any) => c.config_id === editingConfig.config_id) && (
                                    <ConfigRow
                                        config={editingConfig}
                                        isEditing={true}
                                        formData={editingConfig}
                                        updateFormData={updateFormData}
                                        handleSave={handleSave}
                                        handleCancel={handleCancel}
                                        handleEdit={() => { }}
                                        saving={saving}
                                    />
                                )}

                            {(configs[activeTab] || []).map((config) => {
                                const isEditing = editingConfig?.config_id === config.config_id && editingConfig?.type === config.type;
                                return (
                                    <ConfigRow
                                        key={config.config_id || config.sector_id || config.user_id}
                                        config={config}
                                        isEditing={isEditing}
                                        formData={isEditing ? editingConfig : null}
                                        updateFormData={updateFormData}
                                        handleSave={handleSave}
                                        handleCancel={handleCancel}
                                        handleEdit={handleEdit}
                                        saving={saving}
                                    />
                                );
                            })}

                            {(configs[activeTab] || []).length === 0 && (!editingConfig ||
                                !((activeTab === 'sectors' && editingConfig.type === 'sector') || (activeTab === 'users' && editingConfig.type === 'user'))
                            ) && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Nenhuma configuração encontrada.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Search Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Buscar Usuário</h3>
                            <button onClick={() => setShowUserModal(false)} className="text-gray-500 hover:text-gray-700">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nome ou Email..."
                                    className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                                />
                                <button
                                    onClick={searchUsers}
                                    disabled={searchingUsers}
                                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
                                >
                                    {searchingUsers ? <FiLoader className="animate-spin" /> : <FiSearch />}
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {searchResults.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleSelectUser(u)}
                                        className="w-full text-left p-2 hover:bg-gray-50 rounded flex flex-col"
                                    >
                                        <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                                        <span className="text-xs text-gray-500">{u.email}</span>
                                    </button>
                                ))}
                                {searchResults.length === 0 && !searchingUsers && userSearchTerm && (
                                    <p className="text-center text-gray-400 text-sm py-2">Nenhum usuário encontrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... (end of file)
