'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiUsers,
  FiShield,
  FiSearch,
  FiKey,
  FiClock,
  FiMail,
  FiPhone,
  FiGlobe,
  FiRefreshCw,
  FiUserCheck,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiFilter,
  FiSettings
} from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import UserEditor, { UserEditorData } from '@/components/admin/UserEditor';
import UserAccessHistory from '@/components/admin/UserAccessHistory';
import UserPasswordReset from '@/components/admin/UserPasswordReset';
import UserRoleManager from '@/components/admin/UserRoleManager';

// Interface para o usuário na lista
interface User {
  _id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string;
  department?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  isAuthorized?: boolean;
  authorizationStatus?: string;
  accessPermissions?: any;
}

// Interface para usuário autorizado
type AuthorizedUser = {
  _id: string;
  email?: string;
  phoneNumber?: string;
  domain?: string;
  inviteCode?: string;
  status: 'active' | 'pending' | 'rejected' | 'expired';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount?: number;
  notes?: string;
};

// Estatísticas de acesso
type AuthStats = {
  users: {
    total: number;
    active: number;
    newLast30Days: number;
    activeLast7Days: number;
  };
  authorizations: {
    email: number;
    phone: number;
    domain: number;
    inviteCode: number;
    pending: number;
    rejected: number;
  };
  departments: Array<{ name: string; count: number }>;
  positions: Array<{ name: string; count: number }>;
};

export default function UnifiedUserManager() {
  const { user, isAdmin } = useSupabaseAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'authorized'>('users');

  // Estados para usuários regulares
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para usuários autorizados
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [filter, setFilter] = useState('all');

  // Estados para modais
  const [showEditor, setShowEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccessHistory, setShowAccessHistory] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Estados para formulário de autorização
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<'email' | 'phone' | 'domain' | 'invite'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [domain, setDomain] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Estados para mensagens
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isFixingToken, setIsFixingToken] = useState(false);

  // Estados para rejeição
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Carregar dados quando o componente montar
  useEffect(() => {
    if (user) {
      // Primeiro tentar renovar o token
      const refreshToken = async () => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
          if (token) {
            console.log('Tentando renovar token antes de carregar dados...');
            const refreshResponse = await fetch('/api/auth/token-refresh', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              console.log('Token renovado com sucesso antes de carregar dados');

              if (refreshData.token && refreshData.token !== token) {
                console.log('Atualizando token renovado no localStorage');
                localStorage.setItem('token', refreshData.token);
                // Remover o token antigo se existir
                localStorage.removeItem('abzToken');
              }
            } else {
              console.log('Falha na renovação do token, tentando fix-token');

              // Tentar corrigir o token
              try {
                const fixResponse = await fetch('/api/auth/fix-token', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });

                if (fixResponse.ok) {
                  const fixData = await fixResponse.json();
                  console.log('Token corrigido com sucesso');

                  if (fixData.token && fixData.token !== token) {
                    console.log('Atualizando token corrigido no localStorage');
                    localStorage.setItem('token', fixData.token);
                  }
                }
              } catch (fixError) {
                console.error('Erro ao tentar corrigir token:', fixError);
              }
            }
          }
        } catch (refreshError) {
          console.error('Erro ao renovar token antes de carregar dados:', refreshError);
        }

        // Carregar dados após tentativa de renovação/correção do token
        fetchUsers();
        fetchAuthorizedUsers();
        fetchStats();
      };

      refreshToken();
    }
  }, [user]);

  // Carregar dados quando a aba mudar
  useEffect(() => {
    console.log('UnifiedUserManager - Tab changed to:', activeTab);
    if (activeTab === 'users') {
      console.log('Iniciando busca de usuários devido à mudança de aba');
      fetchUsers();
    } else if (activeTab === 'authorized') {
      fetchAuthorizedUsers();
      fetchStats();
    }
  }, [activeTab]);




  // Função para corrigir o token manualmente
  const fixToken = async () => {
    setIsFixingToken(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não há token para corrigir. Faça login novamente.');
      }

      // Primeiro tentar renovar o token
      console.log('Tentando renovar token manualmente...');
      const refreshResponse = await fetch('/api/auth/token-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('Token renovado com sucesso');

        if (refreshData.token && refreshData.token !== token) {
          console.log('Atualizando token renovado no localStorage');
          localStorage.setItem('token', refreshData.token);
          localStorage.removeItem('abzToken');

          setSuccessMessage('Token renovado com sucesso! Recarregando dados...');

          // Recarregar dados
          await fetchUsers();
          await fetchAuthorizedUsers();
          await fetchStats();

          return;
        }
      }

      // Se a renovação falhar, tentar corrigir o token
      console.log('Tentando corrigir token manualmente...');
      const fixResponse = await fetch('/api/auth/fix-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (fixResponse.ok) {
        const fixData = await fixResponse.json();
        console.log('Token corrigido com sucesso');

        if (fixData.token) {
          console.log('Atualizando token corrigido no localStorage');
          localStorage.setItem('token', fixData.token);
          localStorage.removeItem('abzToken');

          setSuccessMessage('Token corrigido com sucesso! Recarregando dados...');

          // Recarregar dados
          await fetchUsers();
          await fetchAuthorizedUsers();
          await fetchStats();
        } else {
          setError('Token corrigido, mas nenhum novo token foi gerado.');
        }
      } else {
        const errorData = await fixResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao corrigir token');
      }
    } catch (error) {
      console.error('Erro ao corrigir token:', error);
      setError(`Erro ao corrigir token: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);

      // Se falhar, tentar criar um novo token para o administrador
      if (user?.email === 'caio.correia@groupabz.com' || user?.phoneNumber === '+5522997847289') {
        try {
          console.log('Tentando criar novo token para o administrador...');

          // Redirecionar para a página de correção de admin
          router.push('/admin-fix');
        } catch (adminFixError) {
          console.error('Erro ao tentar corrigir token de administrador:', adminFixError);
        }
      }
    } finally {
      setIsFixingToken(false);
    }
  };

  // Filtrar usuários quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = users.filter(user => {
        return (
          user.firstName.toLowerCase().includes(lowercasedFilter) ||
          user.lastName.toLowerCase().includes(lowercasedFilter) ||
          user.phoneNumber.toLowerCase().includes(lowercasedFilter) ||
          (user.email && user.email.toLowerCase().includes(lowercasedFilter)) ||
          (user.position && user.position.toLowerCase().includes(lowercasedFilter)) ||
          (user.department && user.department.toLowerCase().includes(lowercasedFilter))
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);


  // Buscar usuários regulares
  const fetchUsers = async () => {
    console.log('=== INICIANDO BUSCA DE USUÁRIOS ===');
    setLoading(true);
    setError(null);
    try {
      // Tentar renovar o token primeiro
      try {
        const refreshToken = localStorage.getItem('token') || localStorage.getItem('abzToken');
        if (refreshToken) {
          console.log('Tentando renovar token antes de buscar usuários...');
          const refreshResponse = await fetch('/api/auth/token-refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
            },
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Token renovado com sucesso antes de buscar usuários');

            if (refreshData.token && refreshData.token !== refreshToken) {
              console.log('Atualizando token renovado no localStorage');
              localStorage.setItem('token', refreshData.token);
              // Remover o token antigo se existir
              localStorage.removeItem('abzToken');
            }
          }
        }
      } catch (refreshError) {
        console.error('Erro ao renovar token antes de buscar usuários:', refreshError);
      }

      // Obter o token (possivelmente renovado)
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não autorizado');
      }

      console.log('Buscando usuários com token:', token.substring(0, 10) + '...');

      // Usar o endpoint de usuários unificados para garantir que estamos obtendo os dados mais recentes
      console.log('Iniciando requisição para /api/users-unified...');

      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/users-unified?_=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log('Resposta da API de usuários:', response.status, response.statusText);

      if (!response.ok) {
        // Se receber 401 ou 403, tentar corrigir o token e tentar novamente
        if (response.status === 401 || response.status === 403) {
          console.log('Acesso negado, tentando corrigir token...');

          try {
            const fixResponse = await fetch('/api/auth/fix-token', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              console.log('Token corrigido com sucesso');

              if (fixData.token) {
                console.log('Usando novo token para tentar novamente');
                localStorage.setItem('token', fixData.token);
                localStorage.removeItem('abzToken');

                // Tentar novamente com o novo token usando a API direta do Supabase
                const retryResponse = await fetch(`/api/users/supabase?_=${new Date().getTime()}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${fixData.token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                });

                if (retryResponse.ok) {
                  const retryText = await retryResponse.text();
                  if (retryText && retryText.trim() !== '') {
                    try {
                      const retryData = JSON.parse(retryText);
                      console.log('Usuários recebidos após correção de token:', retryData.length);
                      setUsers(retryData);
                      setFilteredUsers(retryData);
                      setLoading(false);
                      return;
                    } catch (parseError) {
                      console.error('Erro ao analisar resposta JSON após correção de token:', parseError);
                    }
                  }
                }
              }
            }
          } catch (fixError) {
            console.error('Erro ao tentar corrigir token:', fixError);
          }
        }

        const errorText = await response.text();
        let errorData = {};

        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('Erro ao analisar resposta de erro:', parseError);
          console.log('Texto da resposta de erro:', errorText);
        }

        console.error('Erro ao buscar usuários:', errorData);
        throw new Error(errorData.error || `Erro ao carregar usuários: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Resposta recebida, tamanho:', responseText.length);

      // Verificar se a resposta está vazia
      if (!responseText || responseText.trim() === '') {
        console.error('Resposta vazia recebida da API');
        setUsers([]);
        setFilteredUsers([]);
        setError('Nenhum usuário encontrado. A resposta da API está vazia.');
        setLoading(false);
        return;
      }

      // Log dos primeiros 200 caracteres da resposta para depuração
      console.log('Primeiros 200 caracteres da resposta:', responseText.substring(0, 200));

      let data = [];
      try {
        data = JSON.parse(responseText);
        console.log('Usuários recebidos:', data.length);

        if (data.length > 0) {
          console.log('Amostra do primeiro usuário:', JSON.stringify(data[0], null, 2));
          console.log('Campos do primeiro usuário:', Object.keys(data[0]).join(', '));
        } else {
          console.log('Array de usuários vazio retornado pela API');
        }

        // Sempre mapear os dados para garantir o formato correto
        console.log('Mapeando dados para o formato padrão...');

        // Mapear para o formato correto independentemente da estrutura original
        const mappedData = Array.isArray(data) ? data.map((user: any) => {
          const mappedUser = {
            _id: user.id || user._id || '',
            firstName: user.first_name || user.firstName || 'Usuário',
            lastName: user.last_name || user.lastName || 'Desconhecido',
            email: user.email || '',
            phoneNumber: user.phone_number || user.phoneNumber || '',
            role: user.role || 'USER',
            position: user.position || '',
            department: user.department || '',
            active: user.active !== undefined ? user.active : true,
            createdAt: user.created_at || user.createdAt || new Date().toISOString(),
            updatedAt: user.updated_at || user.updatedAt || new Date().toISOString(),
            accessPermissions: user.access_permissions || user.accessPermissions || {},
            isAuthorized: user.is_authorized || user.isAuthorized || false,
            authorizationStatus: user.authorization_status || user.authorizationStatus || null
          };

          console.log(`Usuário mapeado: ${mappedUser.firstName} ${mappedUser.lastName} (${mappedUser._id})`);
          return mappedUser;
        }) : [];

        console.log('Total de dados mapeados:', mappedData.length);

        if (mappedData.length > 0) {
          console.log('Exemplo de usuário mapeado:', JSON.stringify(mappedData[0], null, 2));
        }

        // Atualizar o estado com os dados mapeados
        setUsers(mappedData);
        setFilteredUsers(mappedData);
        console.log('Estado de usuários atualizado com', mappedData.length, 'registros');

        // Verificar se os dados foram definidos corretamente
        setTimeout(() => {
          console.log('Verificando estado após atualização:');
          console.log('- users.length:', users.length);
          console.log('- filteredUsers.length:', filteredUsers.length);
        }, 100);
      } catch (parseError) {
        console.error('Erro ao analisar resposta JSON:', parseError);
        console.log('Primeiros 100 caracteres da resposta:', responseText.substring(0, 100));
        throw new Error('Erro ao processar dados de usuários. Formato inválido.');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError(`Erro ao carregar usuários: ${error instanceof Error ? error.message : String(error)}`);

      // Definir um array vazio em caso de erro para evitar que a interface fique presa em "Carregando..."
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);

      // Garantir que o estado de carregamento seja desativado mesmo em caso de erro
      setTimeout(() => {
        if (loading) {
          console.log('Forçando desativação do estado de carregamento após timeout');
          setLoading(false);
        }
      }, 5000);
    }
  };



  // Buscar usuários autorizados
  const fetchAuthorizedUsers = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/authorized-users';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      console.log('Buscando usuários autorizados com token:', token.substring(0, 10) + '...');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro ao buscar usuários autorizados:', errorData);

        // Se o erro for de acesso negado e o usuário for o administrador principal, redirecionar para a página de correção
        if (response.status === 403 &&
            (user?.email === 'caio.correia@groupabz.com' || user?.phoneNumber === '+5522997847289')) {
          console.log('Usuário é o administrador principal mas não tem acesso. Redirecionando para correção...');
          router.push('/admin-fix');
          return;
        }

        throw new Error(errorData.error || 'Erro ao carregar usuários autorizados');
      }

      const responseText = await response.text();
      console.log('Resposta recebida, tamanho:', responseText.length);

      // Verificar se a resposta está vazia
      if (!responseText || responseText.trim() === '') {
        console.error('Resposta vazia recebida da API de usuários autorizados');
        setAuthorizedUsers([]);
        setError('Nenhum usuário autorizado encontrado. A resposta da API está vazia.');
        return;
      }

      try {
        const data = JSON.parse(responseText);
        console.log('Usuários autorizados recebidos:', data.length);

        // Verificar se os dados estão no formato esperado
        if (Array.isArray(data)) {
          // Verificar se os dados têm a estrutura esperada
          if (data.length > 0) {
            const firstUser = data[0];
            // Verificar se os campos necessários estão presentes
            if (!firstUser._id) {
              console.warn('Dados de usuário autorizado podem estar em formato incorreto:', firstUser);
              console.log('Tentando mapear para o formato correto...');

              // Tentar mapear para o formato correto
              const mappedData = data.map((user: any) => ({
                _id: user.id || user._id || '',
                email: user.email || undefined,
                phoneNumber: user.phone_number || user.phoneNumber || undefined,
                domain: user.authorization_domain || user.domain || undefined,
                inviteCode: user.invite_code || user.inviteCode || undefined,
                status: user.authorization_status || user.status || 'pending',
                createdAt: user.created_at || user.createdAt || new Date().toISOString(),
                updatedAt: user.updated_at || user.updatedAt || new Date().toISOString(),
                expiresAt: user.authorization_expires_at || user.expires_at || user.expiresAt || undefined,
                maxUses: user.authorization_max_uses || user.max_uses || user.maxUses || undefined,
                usedCount: user.authorization_uses || user.uses || user.usedCount || 0,
                notes: user.authorization_notes ?
                  (Array.isArray(user.authorization_notes) ?
                    user.authorization_notes.map((note: any) => note.note || note.details || note).join(', ') :
                    String(user.authorization_notes)
                  ) : user.notes || undefined
              }));

              console.log('Dados mapeados:', mappedData.length);
              setAuthorizedUsers(mappedData);
            } else {
              // Dados já estão no formato correto
              setAuthorizedUsers(data);
            }
          } else {
            // Array vazio, definir como está
            setAuthorizedUsers(data);
          }
        } else {
          console.error('Formato de resposta inesperado para usuários autorizados:', typeof data);
          setError('Formato de resposta inesperado. Esperava um array de usuários autorizados.');
          setAuthorizedUsers([]);
        }
      } catch (parseError) {
        console.error('Erro ao analisar resposta JSON de usuários autorizados:', parseError);
        console.log('Primeiros 100 caracteres da resposta:', responseText.substring(0, 100));
        setError('Erro ao processar dados de usuários autorizados. Formato inválido.');
        setAuthorizedUsers([]);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários autorizados:', error);
      setError('Erro ao carregar usuários autorizados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      console.log('Buscando estatísticas com token:', token.substring(0, 10) + '...');

      const response = await fetch('/api/admin/access-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Resposta da API de estatísticas:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro ao buscar estatísticas:', errorData);

        // Se o erro for de acesso negado e o usuário for o administrador principal, redirecionar para a página de correção
        if (response.status === 403 &&
            (user?.email === 'caio.correia@groupabz.com' || user?.phoneNumber === '+5522997847289')) {
          console.log('Usuário é o administrador principal mas não tem acesso às estatísticas. Redirecionando para correção...');
          router.push('/admin-fix');
          return;
        }

        throw new Error(errorData.error || 'Erro ao carregar estatísticas');
      }

      const data = await response.json();
      console.log('Estatísticas recebidas:', data);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Funções para gerenciar usuários regulares
  const handleAddUser = () => {
    setSelectedUser(null);
    setIsNewUser(true);
    setShowEditor(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsNewUser(false);
    setShowEditor(true);
  };

  const handleDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleViewHistory = (user: User) => {
    setSelectedUser(user);
    setShowAccessHistory(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordReset(true);
  };

  const handleManageRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleManager(true);
  };

  const handleSaveUser = async (userData: UserEditorData, password?: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não autorizado');
      }

      const method = isNewUser ? 'POST' : 'PUT';
      const url = isNewUser ? '/api/users' : `/api/users/${userData._id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userData,
          password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar usuário');
      }

      setSuccessMessage(`Usuário ${isNewUser ? 'criado' : 'atualizado'} com sucesso!`);
      setShowEditor(false);
      fetchUsers();

      // Limpar a mensagem após 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setError(`Erro ao salvar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não autorizado');
      }

      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }

      setSuccessMessage('Usuário excluído com sucesso!');
      setShowDeleteConfirm(false);
      fetchUsers();

      // Limpar a mensagem após 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setError(`Erro ao excluir usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Funções para gerenciar usuários autorizados
  const handleAddAuthorizedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      let action = '';
      const payload: any = { notes };

      switch (formType) {
        case 'email':
          action = 'add_user';
          payload.email = email;
          break;
        case 'phone':
          action = 'add_user';
          payload.phoneNumber = phoneNumber;
          break;
        case 'domain':
          action = 'add_domain';
          payload.domain = domain;
          break;
        case 'invite':
          action = 'generate_invite';
          // Adicionar configurações de expiração se fornecidas
          if (expiryDays) payload.expiryDays = expiryDays;
          if (maxUses) payload.maxUses = maxUses;
          break;
      }

      payload.action = action;

      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      const response = await fetch('/api/admin/authorized-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao adicionar usuário autorizado');
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);

        // Se for código de convite, mostrar o código gerado
        if (formType === 'invite' && result.inviteCode) {
          setGeneratedInviteCode(result.inviteCode);

          // Se tiver email para enviar o convite
          if (inviteEmail && result.inviteCode && result.expiresAt) {
            // Enviar email com o código de convite
            const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

            if (!token) {
              throw new Error('Token não encontrado. Faça login novamente.');
            }

            const emailResponse = await fetch('/api/admin/send-invite', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                email: inviteEmail,
                inviteCode: result.inviteCode,
                expiresAt: result.expiresAt,
                maxUses: result.maxUses || 1
              })
            });

            if (emailResponse.ok) {
              setSuccessMessage(`${result.message} Email enviado para ${inviteEmail}.`);
            } else {
              setSuccessMessage(`${result.message} Mas houve um erro ao enviar o email.`);
            }
          }
        }

        // Limpar formulário
        setEmail('');
        setPhoneNumber('');
        setDomain('');
        setNotes('');
        setExpiryDays('');
        setMaxUses('');
        setInviteEmail('');

        // Atualizar lista
        fetchAuthorizedUsers();
        fetchStats();
      } else {
        setError(result.message || 'Erro ao adicionar usuário autorizado');
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário autorizado:', error);
      setError('Erro ao adicionar usuário autorizado. Tente novamente.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      const response = await fetch('/api/admin/authorized-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approve',
          id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao aprovar usuário');
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Usuário aprovado com sucesso');
        fetchAuthorizedUsers();
        fetchStats();
      } else {
        setError(result.message || 'Erro ao aprovar usuário');
      }
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      setError('Erro ao aprovar usuário. Tente novamente.');
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedUserId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      const response = await fetch('/api/admin/authorized-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reject',
          id: selectedUserId,
          reason: rejectReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao rejeitar usuário');
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Usuário rejeitado com sucesso');
        setShowRejectModal(false);
        fetchAuthorizedUsers();
        fetchStats();
      } else {
        setError(result.message || 'Erro ao rejeitar usuário');
      }
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      setError('Erro ao rejeitar usuário. Tente novamente.');
    }
  };

  const handleDeleteAuthorizedUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário autorizado?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      const response = await fetch(`/api/admin/authorized-users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao excluir usuário autorizado');
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Usuário autorizado excluído com sucesso');
        fetchAuthorizedUsers();
        fetchStats();
      } else {
        setError(result.message || 'Erro ao excluir usuário autorizado');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário autorizado:', error);
      setError('Erro ao excluir usuário autorizado. Tente novamente.');
    }
  };

  // Funções auxiliares
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthorizationTypeIcon = (user: AuthorizedUser) => {
    if (user.email) return <FiMail className="text-blue-500" />;
    if (user.phoneNumber) return <FiPhone className="text-green-500" />;
    if (user.domain) return <FiGlobe className="text-purple-500" />;
    if (user.inviteCode) return <FiKey className="text-yellow-500" />;
    return null;
  };

  const getAuthorizationTypeText = (user: AuthorizedUser) => {
    if (user.email) return `Email: ${user.email}`;
    if (user.phoneNumber) return `Telefone: ${user.phoneNumber}`;
    if (user.domain) return `Domínio: ${user.domain}`;
    if (user.inviteCode) return `Código de Convite: ${user.inviteCode}`;
    return 'Desconhecido';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendente</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejeitado</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Expirado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Renderização do componente
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Abas */}
      <div className="flex justify-between mb-6">
        <div>
          <button
            onClick={fixToken}
            disabled={isFixingToken}
            className={`flex items-center px-4 py-2 rounded-md ${isFixingToken ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            <FiRefreshCw className={`mr-2 ${isFixingToken ? 'animate-spin' : ''}`} />
            {isFixingToken ? 'Corrigindo Token...' : 'Corrigir Token de Acesso'}
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'users' ? 'bg-abz-blue text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <FiUser className="mr-2" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('authorized')}
            className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'authorized' ? 'bg-abz-blue text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <FiUserCheck className="mr-2" />
            Autorizações
          </button>
        </div>
      </div>

      {/* Mensagens de sucesso e erro */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mb-4 flex items-center">
          <FiCheck className="mr-2 flex-shrink-0 h-5 w-5" />
          <div>
            <p className="font-bold">Sucesso</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
          <FiAlertCircle className="mr-2 flex-shrink-0 h-5 w-5" />
          <div>
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Conteúdo da aba de usuários */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap justify-between items-center mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="relative mr-2">
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-abz-blue focus:border-abz-blue w-full md:w-64"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button
                onClick={() => {
                  console.log('Atualizando lista de usuários manualmente');
                  fetchUsers();
                }}
                className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                title="Atualizar lista de usuários"
              >
                <FiRefreshCw className="mr-1" />
                Atualizar
              </button>
            </div>

            <button
              onClick={handleAddUser}
              className="flex items-center px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark transition-colors"
            >
              <FiPlus className="mr-2" />
              Novo Usuário
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    console.log(`Renderizando usuário: ${user.firstName} ${user.lastName} (${user._id})`);
                    return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-abz-blue rounded-full flex items-center justify-center text-white">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.department || 'Sem departamento'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.phoneNumber}</div>
                        {user.email && <div className="text-sm text-gray-500">{user.email}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.role === 'ADMIN' ? 'Administrador' : user.role === 'MANAGER' ? 'Gerente' : 'Usuário'}
                        </div>
                        <div className="text-sm text-gray-500">{user.position || 'Não definido'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewHistory(user)}
                            className="text-gray-600 hover:text-abz-blue"
                            title="Ver histórico de acesso"
                          >
                            <FiClock />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="text-gray-600 hover:text-abz-blue"
                            title="Redefinir senha"
                          >
                            <FiKey />
                          </button>
                          <button
                            onClick={() => handleManageRole(user)}
                            className="text-gray-600 hover:text-abz-blue"
                            title="Gerenciar papel/função"
                          >
                            <FiShield />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-gray-600 hover:text-abz-blue"
                            title="Editar usuário"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(user)}
                            className="text-gray-600 hover:text-red-600"
                            title="Excluir usuário"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da aba de usuários autorizados */}
      {activeTab === 'authorized' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700">Usuários</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Total: <span className="font-bold">{stats.users.total}</span></p>
                  <p className="text-sm">Ativos: <span className="font-bold">{stats.users.active}</span></p>
                  <p className="text-sm">Novos (30 dias): <span className="font-bold">{stats.users.newLast30Days}</span></p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-700">Autorizações</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Email: <span className="font-bold">{stats.authorizations.email}</span></p>
                  <p className="text-sm">Telefone: <span className="font-bold">{stats.authorizations.phone}</span></p>
                  <p className="text-sm">Domínio: <span className="font-bold">{stats.authorizations.domain}</span></p>
                  <p className="text-sm">Convite: <span className="font-bold">{stats.authorizations.inviteCode}</span></p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-700">Solicitações</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Pendentes: <span className="font-bold">{stats.authorizations.pending}</span></p>
                  <p className="text-sm">Rejeitadas: <span className="font-bold">{stats.authorizations.rejected}</span></p>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-700">Departamentos</h3>
                <div className="mt-2 space-y-1">
                  {stats.departments.slice(0, 3).map((dept, index) => (
                    <p key={index} className="text-sm">{dept.name}: <span className="font-bold">{dept.count}</span></p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-wrap justify-between items-center mb-6">
            <div className="flex space-x-2 mb-2 sm:mb-0">
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setGeneratedInviteCode('');
                  setSuccessMessage('');
                  setError('');
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <FiPlus className="mr-2" />
                {showAddForm ? 'Cancelar' : 'Adicionar'}
              </button>

              <button
                onClick={() => {
                  fetchAuthorizedUsers();
                  fetchStats();
                }}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FiRefreshCw className="mr-2" />
                Atualizar
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="pending">Pendentes</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
          </div>

          {/* Formulário de adição */}
          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Adicionar Autorização</h3>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setFormType('email')}
                  className={`flex items-center px-3 py-2 rounded-md ${formType === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  <FiMail className="mr-2" />
                  Email
                </button>

                <button
                  onClick={() => setFormType('phone')}
                  className={`flex items-center px-3 py-2 rounded-md ${formType === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  <FiPhone className="mr-2" />
                  Telefone
                </button>

                <button
                  onClick={() => setFormType('domain')}
                  className={`flex items-center px-3 py-2 rounded-md ${formType === 'domain' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  <FiGlobe className="mr-2" />
                  Domínio
                </button>

                <button
                  onClick={() => setFormType('invite')}
                  className={`flex items-center px-3 py-2 rounded-md ${formType === 'invite' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  <FiKey className="mr-2" />
                  Código de Convite
                </button>
              </div>

              <form onSubmit={handleAddAuthorizedUser} className="space-y-4">
                {formType === 'email' && (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="usuario@exemplo.com"
                    />
                  </div>
                )}

                {formType === 'phone' && (
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Telefone
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+5511999999999"
                    />
                  </div>
                )}

                {formType === 'domain' && (
                  <div>
                    <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                      Domínio
                    </label>
                    <input
                      type="text"
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="exemplo.com"
                    />
                  </div>
                )}

                {formType === 'invite' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-700 mb-1">
                          Dias até Expiração (opcional)
                        </label>
                        <input
                          type="number"
                          id="expiryDays"
                          value={expiryDays}
                          onChange={(e) => setExpiryDays(e.target.value)}
                          min="1"
                          max="365"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <label htmlFor="maxUses" className="block text-sm font-medium text-gray-700 mb-1">
                          Número Máximo de Usos (opcional)
                        </label>
                        <input
                          type="number"
                          id="maxUses"
                          value={maxUses}
                          onChange={(e) => setMaxUses(e.target.value)}
                          min="1"
                          max="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Enviar Convite por Email (opcional)
                      </label>
                      <input
                        type="email"
                        id="inviteEmail"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="usuario@exemplo.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Se preenchido, o código de convite será enviado para este email
                      </p>
                    </div>

                    {generatedInviteCode && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mt-4">
                        <p className="font-semibold mb-2">Código de Convite Gerado:</p>
                        <div className="bg-white p-3 rounded border border-yellow-300 text-center">
                          <span className="text-xl font-mono font-bold tracking-wider">{generatedInviteCode}</span>
                        </div>
                        <p className="text-sm mt-2 text-yellow-700">
                          Compartilhe este código com o usuário que você deseja convidar.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {formType !== 'invite' || !generatedInviteCode ? (
                  <>
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Observações (opcional)
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Adicione informações relevantes sobre esta autorização"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {formType === 'invite' ? 'Gerar Código' : 'Adicionar'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedInviteCode('');
                        setSuccessMessage('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Gerar Outro Código
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Lista de usuários autorizados */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiração / Usos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : authorizedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum usuário autorizado encontrado.
                    </td>
                  </tr>
                ) : (
                  authorizedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getAuthorizationTypeIcon(user)}
                          <span className="ml-2 text-sm text-gray-900">
                            {user.email ? 'Email' : user.phoneNumber ? 'Telefone' : user.domain ? 'Domínio' : 'Convite'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getAuthorizationTypeText(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.inviteCode && (
                          <div>
                            {user.expiresAt && (
                              <div className="mb-1">
                                <span className="font-medium">Expira:</span> {formatDate(user.expiresAt)}
                              </div>
                            )}
                            {user.maxUses && (
                              <div>
                                <span className="font-medium">Usos:</span> {user.usedCount || 0}/{user.maxUses}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(user._id)}
                                className="text-green-600 hover:text-green-900"
                                title="Aprovar"
                              >
                                <FiCheck className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openRejectModal(user._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Rejeitar"
                              >
                                <FiX className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteAuthorizedUser(user._id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Excluir"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      {showEditor && selectedUser && (
        <UserEditor
          user={{
            _id: selectedUser._id,
            phoneNumber: selectedUser.phoneNumber,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            email: selectedUser.email,
            role: selectedUser.role,
            position: selectedUser.position,
            department: selectedUser.department
          }}
          onSave={handleSaveUser}
          onCancel={() => setShowEditor(false)}
          isNew={false}
        />
      )}

      {showEditor && isNewUser && (
        <UserEditor
          user={{
            phoneNumber: '',
            firstName: '',
            lastName: '',
            email: '',
            role: 'USER',
            position: '',
            department: ''
          }}
          onSave={handleSaveUser}
          onCancel={() => setShowEditor(false)}
          isNew={true}
        />
      )}

      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="mb-4">
              Tem certeza que deseja excluir o usuário <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccessHistory && selectedUser && (
        <UserAccessHistory
          userId={selectedUser._id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
          onClose={() => setShowAccessHistory(false)}
        />
      )}

      {showPasswordReset && selectedUser && (
        <UserPasswordReset
          userId={selectedUser._id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
          onClose={() => setShowPasswordReset(false)}
        />
      )}

      {showRoleManager && selectedUser && (
        <UserRoleManager
          userId={selectedUser._id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
          currentRole={selectedUser.role}
          onClose={() => setShowRoleManager(false)}
          onRoleUpdated={() => {
            setShowRoleManager(false);
            fetchUsers();
          }}
        />
      )}

      {/* Modal de rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Rejeitar Solicitação</h3>

            <div className="mb-4">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Rejeição
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informe o motivo da rejeição"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}