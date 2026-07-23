'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { FiMonitor, FiUsers, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiRefreshCw, FiKey, FiPlus, FiCheck } from 'react-icons/fi';
import { fetchWithToken } from '@/lib/tokenStorage';

interface User {
    id: string;
    _id?: string;
    first_name?: string;
    last_name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    position?: string;
}

interface WKRadarCredential {
    user_id: string;
    username: string;
    password: string;
    user?: User;
}

export default function WKRadarAdminPage() {
    const { isAdmin, isLoading: authLoading } = useSupabaseAuth();
    const router = useRouter();
    const { t } = useI18n();

    const [users, setUsers] = useState<User[]>([]);
    const [credentials, setCredentials] = useState<WKRadarCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ username: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [cardExists, setCardExists] = useState<boolean | null>(null);
    const [creatingCard, setCreatingCard] = useState(false);

    // Redirecionar se não for admin
    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, authLoading, router]);

    // Carregar usuários e credenciais
    const loadData = async () => {
        try {
            setLoading(true);

            // Carregar usuários
            const usersResponse = await fetchWithToken('/api/users-unified');
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                // Normaliza os dados para usar id e first_name/last_name consistentemente
                const normalizedUsers = usersData.map((u: any) => ({
                    id: u._id || u.id,
                    first_name: u.firstName || u.first_name || '',
                    last_name: u.lastName || u.last_name || '',
                    email: u.email || '',
                    position: u.position || ''
                }));
                setUsers(normalizedUsers || []);
            }

            // Carregar credenciais existentes
            const credResponse = await fetchWithToken('/api/wkradar/credentials/all');
            if (credResponse.ok) {
                const credData = await credResponse.json();
                if (credData.success) {
                    setCredentials(credData.credentials || []);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setMessage({ type: 'error', text: t('common.error') });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
            checkCardStatus();
        }
    }, [isAdmin]);

    // Verificar se o card existe no dashboard
    const checkCardStatus = async () => {
        try {
            const response = await fetchWithToken('/api/wkradar/seed-card');
            if (response.ok) {
                const data = await response.json();
                setCardExists(data.exists);
            }
        } catch (error) {
            console.error('Erro ao verificar status do card:', error);
        }
    };

    // Criar o card no dashboard
    const seedCard = async () => {
        try {
            setCreatingCard(true);
            const response = await fetchWithToken('/api/wkradar/seed-card', {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ type: 'success', text: data.message || 'Card criado com sucesso!' });
                setCardExists(true);
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Erro ao criar card' });
            }
        } catch (error) {
            console.error('Erro ao criar card:', error);
            setMessage({ type: 'error', text: 'Erro ao criar card' });
        } finally {
            setCreatingCard(false);
        }
    };

    // Gera username padrão para um usuário
    const generateDefaultUsername = (user: User) => {
        const firstName = user?.first_name || user?.firstName || '';
        const lastName = user?.last_name || user?.lastName || '';

        if (firstName && lastName) {
            const fn = firstName.toLowerCase().trim().split(' ')[0];
            const ln = lastName.toLowerCase().trim().split(' ')[0];
            return `${fn}.${ln}`;
        }
        return user?.email?.split('@')[0]?.toLowerCase() || '';
    };

    // Verifica se um usuário tem credenciais customizadas
    const getUserCredentials = (userId: string) => {
        return credentials.find(c => c.user_id === userId);
    };

    // Inicia edição
    const startEditing = (user: User) => {
        const existing = getUserCredentials(user.id);
        setEditingUser(user.id);
        setEditForm({
            username: existing?.username || generateDefaultUsername(user),
            password: existing?.password || ''
        });
    };

    // Salvar credenciais
    const saveCredentials = async (userId: string) => {
        try {
            setSaving(true);

            const response = await fetchWithToken('/api/wkradar/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    userId,
                    username: editForm.username,
                    password: editForm.password
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: t('common.success') });
                setEditingUser(null);
                loadData(); // Recarregar dados
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || t('common.error') });
            }
        } catch (error) {
            console.error('Erro ao salvar credenciais:', error);
            setMessage({ type: 'error', text: t('common.error') });
        } finally {
            setSaving(false);
        }
    };

    // Remover credenciais customizadas
    const removeCredentials = async (userId: string) => {
        if (!confirm(t('wkradar.confirmRemove', 'Tem certeza que deseja remover as credenciais customizadas? O usuário voltará a usar as credenciais padrão.'))) {
            return;
        }

        try {
            setSaving(true);

            const response = await fetchWithToken(`/api/wkradar/credentials?userId=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage({ type: 'success', text: t('common.success') });
                loadData();
            } else {
                setMessage({ type: 'error', text: t('common.error') });
            }
        } catch (error) {
            console.error('Erro ao remover credenciais:', error);
            setMessage({ type: 'error', text: t('common.error') });
        } finally {
            setSaving(false);
        }
    };

    // Filtrar usuários
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.first_name?.toLowerCase().includes(searchLower) ||
            user.last_name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
        );
    });

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <FiMonitor className="h-8 w-8 text-indigo-600 mr-3" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {t('wkradar.adminTitle', 'Configuração WKRadar')}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {t('wkradar.adminDesc', 'Gerencie as credenciais de acesso ao WKRadar para cada usuário')}
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadData}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                >
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    {t('common.refresh')}
                </button>
            </div>

            {/* Mensagem de feedback */}
            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    {message.text}
                    <button onClick={() => setMessage(null)} className="float-right">×</button>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <FiKey className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                        <p className="font-medium text-blue-900">
                            {t('wkradar.defaultCredentials', 'Credenciais Padrão')}
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                            {t('wkradar.defaultCredentialsDesc', 'Por padrão, os usuários usam o formato primeiro_nome.sobrenome como login e a senha padrão definida em WKRADAR_DEFAULT_PASSWORD no servidor. Configure credenciais customizadas abaixo quando necessário.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Card Status Panel */}
            <div className={`rounded-lg p-4 mb-6 ${cardExists ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {cardExists ? (
                            <FiCheck className="h-5 w-5 text-green-600 mr-3" />
                        ) : (
                            <FiMonitor className="h-5 w-5 text-yellow-600 mr-3" />
                        )}
                        <div>
                            <p className={`font-medium ${cardExists ? 'text-green-900' : 'text-yellow-900'}`}>
                                {cardExists
                                    ? t('wkradar.cardActive', 'Card WKRadar ativo no Dashboard')
                                    : t('wkradar.cardNotCreated', 'Card WKRadar não está no Dashboard')}
                            </p>
                            <p className={`text-sm ${cardExists ? 'text-green-700' : 'text-yellow-700'}`}>
                                {cardExists
                                    ? t('wkradar.cardActiveDesc', 'O card está visível para usuários com permissão.')
                                    : t('wkradar.cardNotCreatedDesc', 'Clique no botão para adicionar o card WKRadar ao dashboard.')}
                            </p>
                        </div>
                    </div>
                    {!cardExists && cardExists !== null && (
                        <button
                            onClick={seedCard}
                            disabled={creatingCard}
                            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                            {creatingCard ? (
                                <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FiPlus className="mr-2 h-4 w-4" />
                            )}
                            {t('wkradar.createCard', 'Criar Card')}
                        </button>
                    )}
                </div>
            </div>

            {/* Busca */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Tabela de usuários */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('common.user', 'Usuário')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('wkradar.wkUsername', 'Login WKRadar')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('wkradar.wkPassword', 'Senha WKRadar')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('common.status', 'Status')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => {
                                const creds = getUserCredentials(user.id);
                                const isEditing = editingUser === user.id;
                                const defaultUsername = generateDefaultUsername(user);

                                return (
                                    <tr key={user.id} className={isEditing ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <FiUsers className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.username}
                                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                    className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <span className="text-sm text-gray-900">
                                                    {creds?.username || defaultUsername}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.password}
                                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                    className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <span className="text-sm text-gray-500">
                                                    {creds ? '••••••••' : '•••••••• (padrão)'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {creds ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                                    {t('wkradar.customized', 'Customizado')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                    {t('common.default', 'Padrão')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {isEditing ? (
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => saveCredentials(user.id)}
                                                        disabled={saving}
                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                    >
                                                        <FiSave className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser(null)}
                                                        className="text-gray-600 hover:text-gray-900"
                                                    >
                                                        <FiX className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => startEditing(user)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title={t('common.edit')}
                                                    >
                                                        <FiEdit2 className="h-5 w-5" />
                                                    </button>
                                                    {creds && (
                                                        <button
                                                            onClick={() => removeCredentials(user.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title={t('common.delete')}
                                                        >
                                                            <FiTrash2 className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {t('common.noResults')}
                    </div>
                )}
            </div>
        </div>
    );
}
