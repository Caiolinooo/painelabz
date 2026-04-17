'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import {
    FiClipboard,
    FiUsers,
    FiEdit2,
    FiTrash2,
    FiSave,
    FiX,
    FiSearch,
    FiRefreshCw,
    FiKey,
    FiCheck,
    FiAlertCircle,
} from 'react-icons/fi';
import { fetchWithToken } from '@/lib/tokenStorage';

interface User {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    position?: string;
}

interface PoliwebCredential {
    user_id: string;
    username: string;
    password: string;
    username_antigo?: string;
    password_antigo?: string;
}

export default function PoliwebAdminPage() {
    const { isAdmin, isLoading: authLoading } = useSupabaseAuth();
    const router = useRouter();
    const { t } = useI18n();

    const [users, setUsers] = useState<User[]>([]);
    const [credentials, setCredentials] = useState<PoliwebCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        username: '',
        password: '',
        username_antigo: '',
        password_antigo: '',
        useSameCredentials: true
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, authLoading, router]);

    const loadData = async () => {
        try {
            setLoading(true);

            const usersResponse = await fetchWithToken('/api/users-unified');
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const normalizedUsers = usersData.map((u: any) => ({
                    id: u._id || u.id,
                    first_name: u.firstName || u.first_name || '',
                    last_name: u.lastName || u.last_name || '',
                    email: u.email || '',
                    position: u.position || ''
                }));
                setUsers(normalizedUsers);
            }

            const credResponse = await fetchWithToken('/api/poliweb/credentials/all');
            if (credResponse.ok) {
                const credData = await credResponse.json();
                if (credData.success) {
                    setCredentials(credData.credentials || []);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar dados' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    const getUserCredentials = (userId: string) => {
        return credentials.find(c => c.user_id === userId);
    };

    const startEditing = (user: User) => {
        const existing = getUserCredentials(user.id);
        setEditingUser(user.id);
        
        // Check if using same credentials (no antigo credentials set)
        const useSame = !existing?.username_antigo && !existing?.password_antigo;
        
        setEditForm({
            username: existing?.username || '',
            password: existing?.password || '',
            username_antigo: existing?.username_antigo || '',
            password_antigo: existing?.password_antigo || '',
            useSameCredentials: useSame
        });
    };

    const saveCredentials = async (userId: string) => {
        try {
            setSaving(true);

            const response = await fetchWithToken('/api/poliweb/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    username: editForm.username,
                    password: editForm.password,
                    username_antigo: editForm.useSameCredentials ? null : editForm.username_antigo,
                    password_antigo: editForm.useSameCredentials ? null : editForm.password_antigo,
                    useSameCredentials: editForm.useSameCredentials
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Credenciais salvas com sucesso!' });
                setEditingUser(null);
                loadData();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
            }
        } catch (error) {
            console.error('Erro ao salvar credenciais:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar credenciais' });
        } finally {
            setSaving(false);
        }
    };

    const removeCredentials = async (userId: string) => {
        if (!confirm('Tem certeza que deseja remover as credenciais Poliweb deste usuário?')) {
            return;
        }

        try {
            setSaving(true);

            const response = await fetchWithToken(`/api/poliweb/credentials?userId=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Credenciais removidas com sucesso!' });
                loadData();
            } else {
                setMessage({ type: 'error', text: 'Erro ao remover credenciais' });
            }
        } catch (error) {
            console.error('Erro ao remover credenciais:', error);
            setMessage({ type: 'error', text: 'Erro ao remover credenciais' });
        } finally {
            setSaving(false);
        }
    };

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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
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
                    <FiClipboard className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Configuração Poliweb
                        </h1>
                        <p className="text-sm text-gray-500">
                            Gerencie as credenciais de acesso ao Poliweb (Novo e Antigo)
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadData}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                >
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    Atualizar
                </button>
            </div>

            {/* Message */}
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
                            Credenciais de Acesso
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                            Configure o email e senha para o Poliweb Novo e, opcionalmente, credenciais diferentes para o Poliweb Antigo. 
                            Marque "Usar mesmas credenciais" para usar os mesmos dados de acesso em ambas as versões.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Poliweb Novo (Email)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Poliweb Antigo (Email)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => {
                                const creds = getUserCredentials(user.id);
                                const isEditing = editingUser === user.id;
                                const hasAntigo = creds?.username_antigo || creds?.password_antigo;

                                return (
                                    <tr key={user.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <FiUsers className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Poliweb Novo */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editForm.username}
                                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                        placeholder="Email Poliweb Novo"
                                                        className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editForm.password}
                                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                        placeholder="Senha Poliweb Novo"
                                                        className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-sm text-gray-900">
                                                        {creds?.username || <span className="text-gray-400 italic">Não configurado</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {creds ? '••••••••' : <span className="text-gray-400 italic">—</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* Poliweb Antigo */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <label className="flex items-center text-sm text-gray-600 mb-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.useSameCredentials}
                                                            onChange={(e) => setEditForm({ ...editForm, useSameCredentials: e.target.checked })}
                                                            className="mr-2"
                                                        />
                                                        Usar mesmas credenciais
                                                    </label>
                                                    {!editForm.useSameCredentials && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={editForm.username_antigo}
                                                                onChange={(e) => setEditForm({ ...editForm, username_antigo: e.target.value })}
                                                                placeholder="Email Poliweb Antigo"
                                                                className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editForm.password_antigo}
                                                                onChange={(e) => setEditForm({ ...editForm, password_antigo: e.target.value })}
                                                                placeholder="Senha Poliweb Antigo"
                                                                className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    {hasAntigo ? (
                                                        <>
                                                            <div className="text-sm text-gray-900">
                                                                {creds?.username_antigo || <span className="text-gray-400 italic">Não configurado</span>}
                                                            </div>
                                                            <div className="text-sm text-gray-500">••••••••</div>
                                                        </>
                                                    ) : creds ? (
                                                        <span className="text-sm text-green-600 flex items-center gap-1">
                                                            <FiCheck className="h-4 w-4" />
                                                            Mesmo que Novo
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Não configurado</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {creds ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                                                    <FiCheck className="h-3 w-3" />
                                                    Configurado
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {isEditing ? (
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => saveCredentials(user.id)}
                                                        disabled={saving || !editForm.username || !editForm.password}
                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Editar credenciais"
                                                    >
                                                        <FiEdit2 className="h-5 w-5" />
                                                    </button>
                                                    {creds && (
                                                        <button
                                                            onClick={() => removeCredentials(user.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Remover credenciais"
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
                        Nenhum usuário encontrado
                    </div>
                )}
            </div>
        </div>
    );
}
