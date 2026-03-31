'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiBriefcase, FiToggleLeft, FiToggleRight, FiShield, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SectorAccess {
    id: string;
    name: string;
    has_access: boolean;
}

interface UserAccess {
    id: string;
    name: string;
    email: string;
    role: string;
    sector_id: string | null;
    sector_name: string | null;
    sector_has_access: boolean;
    user_override: boolean | null;
    has_access: boolean;
    source: 'sector' | 'user_override';
}

export default function FeriasAccessPage() {
    const [sectors, setSectors] = useState<SectorAccess[]>([]);
    const [users, setUsers] = useState<UserAccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'sectors' | 'users'>('sectors');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAccess();
    }, []);

    const loadAccess = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/ferias/admin-access');
            if (!res.ok) throw new Error('Failed to load access config');
            const data = await res.json();
            setSectors(data.sectors || []);
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error loading access config:', error);
            toast.error('Erro ao carregar configurações de acesso.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSectorAccess = async (sectorId: string, enabled: boolean) => {
        try {
            setSaving(`sector-${sectorId}`);
            const res = await fetch('/api/ferias/admin-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** type: 'sector', targetId: sectorId, enabled })
            });
            if (!res.ok) throw new Error('Failed to update');
            toast.success(`Setor ${enabled ? 'liberado' : 'restrito'}`);
            loadAccess();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar');
        } finally {
            setSaving(null);
        }
    };

    const toggleUserAccess = async (userId: string, enabled: boolean) => {
        try {
            setSaving(`user-${userId}`);
            const res = await fetch('/api/ferias/admin-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** type: 'user', targetId: userId, enabled })
            });
            if (!res.ok) throw new Error('Failed to update');
            toast.success(`Usuário ${enabled ? 'liberado' : 'restrito'}`);
            loadAccess();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar');
        } finally {
            setSaving(null);
        }
    };

    const removeUserOverride = async (userId: string) => {
        try {
            setSaving(`user-${userId}`);
            const res = await fetch('/api/ferias/admin-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** type: 'user', targetId: userId, enabled: null })
            });
            if (!res.ok) throw new Error('Failed to remove override');
            toast.success('Override removido, herdando do setor');
            loadAccess();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao remover override');
        } finally {
            setSaving(null);
        }
    };

    const filteredUsers = users.filter(u => {
        if (!searchTerm) return true;
        const low = searchTerm.toLowerCase();
        return u.name?.toLowerCase().includes(low) || u.email?.toLowerCase().includes(low) || u.sector_name?.toLowerCase().includes(low);
    });

    const filteredSectors = sectors.filter(s => {
        if (!searchTerm) return true;
        return s.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

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
                <div className="bg-blue-100 p-3 rounded-xl border border-blue-200">
                    <FiShield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gerenciar Acesso - Todas as Solicitações</h1>
                    <p className="text-gray-500">Configure quem pode visualizar e gerenciar todas as solicitações de férias.</p>
                </div>
            </div>

            {/* Hierarchy Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FiAlertCircle /> Hierarquia de Permissões
                </h3>
                <div className="flex flex-wrap gap-4 text-xs text-blue-800">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">1. Setor</span>
                        <span className="text-blue-600">(base, menor peso)</span>
                    </div>
                    <span className="text-blue-400">→</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">2. Role</span>
                        <span className="text-blue-600">(ADMIN/MANAGER sobrescrevem)</span>
                    </div>
                    <span className="text-blue-400">→</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">3. Usuário Individual</span>
                        <span className="text-blue-600">(maior peso, prevalece)</span>
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveSection('sectors')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeSection === 'sectors' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <FiBriefcase />
                    Por Setor
                </button>
                <button
                    onClick={() => setActiveSection('users')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeSection === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <FiUsers />
                    Por Usuário
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* SECTORS SECTION */}
            {activeSection === 'sectors' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FiBriefcase className="text-blue-600" />
                            Acesso por Setor
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Habilite ou restrinja o acesso para todos os usuários de um setor.</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {filteredSectors.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500">
                                <FiAlertCircle className="mx-auto h-8 w-8 mb-3 text-gray-400" />
                                Nenhum setor encontrado.
                            </div>
                        ) : (
                            filteredSectors.map(sector => (
                                <div key={sector.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{sector.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {sector.has_access ? (
                                                <span className="text-green-600">Acesso habilitado</span>
                                            ) : (
                                                <span className="text-red-600">Acesso restrito</span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleSectorAccess(sector.id, !sector.has_access)}
                                        disabled={saving === `sector-${sector.id}`}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        {saving === `sector-${sector.id}` ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                                        ) : sector.has_access ? (
                                            <>
                                                <FiToggleRight className="w-5 h-5 text-green-600" />
                                                <span className="text-green-600">Ativado</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiToggleLeft className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-500">Desativado</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* USERS SECTION */}
            {activeSection === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FiUsers className="text-blue-600" />
                            Acesso por Usuário
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Override individual que prevalece sobre a configuração do setor.</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500">
                                <FiAlertCircle className="mx-auto h-8 w-8 mb-3 text-gray-400" />
                                Nenhum usuário encontrado.
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-900">{user.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : user.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs">
                                            <span className="text-gray-500">Setor: {user.sector_name || 'Nenhum'}</span>
                                            <span className="text-gray-400">|</span>
                                            <span className={user.sector_has_access ? 'text-green-600' : 'text-red-600'}>
                                                Setor: {user.sector_has_access ? 'Permite' : 'Restrito'}
                                            </span>
                                            {user.user_override !== null && (
                                                <>
                                                    <span className="text-gray-400">|</span>
                                                    <span className="text-blue-600 font-medium">Override: {user.user_override ? 'Sim' : 'Não'}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-1 rounded-md text-xs font-medium ${user.has_access ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.has_access ? 'Acesso' : 'Sem Acesso'}
                                        </div>
                                        {user.user_override !== null && (
                                            <button
                                                onClick={() => removeUserOverride(user.id)}
                                                disabled={saving === `user-${user.id}`}
                                                className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
                                            >
                                                Remover override
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleUserAccess(user.id, !user.has_access)}
                                            disabled={saving === `user-${user.id}`}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                        >
                                            {saving === `user-${user.id}` ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                                            ) : user.has_access ? (
                                                <>
                                                    <FiToggleRight className="w-5 h-5 text-green-600" />
                                                    <span className="text-green-600">Ativado</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiToggleLeft className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-500">Desativado</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
