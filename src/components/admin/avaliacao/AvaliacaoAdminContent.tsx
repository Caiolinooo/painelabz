'use client';

import React, { useState, useEffect } from 'react';
import { FiSettings, FiList, FiUsers, FiDatabase, FiLoader, FiAlertCircle, FiCalendar, FiUserCheck, FiAward, FiPlus, FiTrash2, FiShield } from 'react-icons/fi';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { CriteriosManager } from './CriteriosManager';
import { useI18n } from '@/contexts/I18nContext';
import MainLayout from '@/components/Layout/MainLayout';
import { CreateCriteriosTable } from '@/components/admin/avaliacao/CreateCriteriosTable';
import { ImportCriteriosButton } from '@/components/admin/avaliacao/ImportCriteriosButton';
import PainelPeriodosAvaliacao from '@/components/admin/PainelPeriodosAvaliacao';
import PainelGerentesAvaliacao from '@/components/admin/PainelConfigGerentesAvaliacaoAdvanced';
import PainelLideresSetor from '@/components/admin/PainelLideresSetor';
import ExecutarMigrationAvaliacao from '@/components/admin/ExecutarMigrationAvaliacao';
import DiagnosticoAdmin from '@/components/admin/DiagnosticoAdmin';
import DiagnosticoForeignKeys from '@/components/admin/DiagnosticoForeignKeys';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { fetchWithToken } from '@/lib/tokenStorage';

interface AuditAssignment {
  userId: string;
  leaderIds: string[];
}

interface AuditUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

const createEmptyAssignment = (): AuditAssignment => ({ userId: '', leaderIds: [] });

const normalizeAuditAssignments = (assignments: any): AuditAssignment[] => {
  if (!Array.isArray(assignments)) return [];

  return assignments
    .map((assignment) => ({
      userId: typeof assignment?.userId === 'string' ? assignment.userId : '',
      leaderIds: Array.isArray(assignment?.leaderIds)
        ? assignment.leaderIds.filter((leaderId: unknown): leaderId is string => typeof leaderId === 'string')
        : []
    }))
    .filter((assignment) => Boolean(assignment.userId));
};

const normalizeUsers = (users: any[]): AuditUserOption[] => users
  .map((user) => {
    const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
    const name = `${firstName} ${lastName}`.trim() || user?.email || 'Usuário sem nome';

    return {
      id: user?._id || user?.id || '',
      name,
      email: user?.email || '',
      role: user?.role || 'USER',
      active: user?.active !== false
    };
  })
  .filter((user) => Boolean(user.id))
  .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

/**
 * Client component for the Avaliacao Admin page content
 */
export default function AvaliacaoAdminContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'database' | 'criterios' | 'funcionarios' | 'periodos' | 'gerentes' | 'lideres' | 'config'>('periodos');
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [auditAssignments, setAuditAssignments] = useState<AuditAssignment[]>([createEmptyAssignment()]);
  const [availableUsers, setAvailableUsers] = useState<AuditUserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const weightedEnvEnabled = isFeatureEnabled('avaliacao_weighted_calc');

  // Carregar settings globais
  useEffect(() => {
    const load = async () => {
      setSettingsLoading(true);
      try {
        const res = await fetch('/api/avaliacao/settings');
        const json = await res.json();
        if (json.success) {
          setSettings(json.data);

          const loadedAssignments = normalizeAuditAssignments(json.data?.obrigatoriedade?.auditoria?.gerentesGerais);
          setAuditAssignments(loadedAssignments.length > 0 ? loadedAssignments : [createEmptyAssignment()]);
        }
      } catch(err) {
        console.warn('Falha ao carregar settings', err);
      } finally {
        setSettingsLoading(false);
      }
    };

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await fetchWithToken('/api/users', { method: 'GET' });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error || 'Erro ao carregar usuários');
        }

        setAvailableUsers(normalizeUsers(Array.isArray(json) ? json : []));
      } catch (err) {
        console.warn('Falha ao carregar usuários para auditoria', err);
      } finally {
        setUsersLoading(false);
      }
    };

    load();
    loadUsers();
  }, []);

  const toggleWeighted = async () => {
    if (!weightedEnvEnabled) {
      alert('A função de cálculo ponderado está desativada via ambiente. Defina EVALUACAO_WEIGHTED_ENABLED=true para ativar.');
      return;
    }
    const targetMethod = settings?.calculo?.method === 'weighted' ? 'simple_average' : 'weighted';
    try {
      setSettingsLoading(true);
      const res = await fetchWithToken('/api/avaliacao/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED*** method: targetMethod })
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
      } else {
        alert('Erro ao atualizar método: ' + (json.error || 'desconhecido'));
      }
    } catch (e:any) {
      alert('Falha na requisição: ' + e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateAuditAssignment = (index: number, nextValue: AuditAssignment) => {
    setAuditAssignments((currentAssignments) => currentAssignments.map((assignment, currentIndex) => (
      currentIndex === index ? nextValue : assignment
    )));
  };

  const saveAuditSettings = async () => {
    try {
      setAuditSaving(true);

      const payload = normalizeAuditAssignments(auditAssignments);
      const response = await fetchWithToken('/api/avaliacao/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED*** gerentesGerais: payload })
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'Erro ao salvar auditoria');
      }

      setSettings(json.data);
      const savedAssignments = normalizeAuditAssignments(json.data?.obrigatoriedade?.auditoria?.gerentesGerais);
      setAuditAssignments(savedAssignments.length > 0 ? savedAssignments : [createEmptyAssignment()]);
      alert('Configuração de auditoria salva com sucesso.');
    } catch (error: any) {
      alert(`Falha ao salvar auditoria: ${error.message || 'erro desconhecido'}`);
    } finally {
      setAuditSaving(false);
    }
  };

  const gerenteGeralOptions = availableUsers.filter((user) => user.active);
  const leaderOptions = availableUsers.filter((user) => user.active);

  const { user, profile, isLoading, isAdmin } = useSupabaseAuth();
  const router = useRouter();

  // Verificar se o usuário é administrador
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      console.log(t('components.usuarioNaoEAdministradorRedirecionando'));
      router.push('/dashboard');
    }
  }, [isLoading, isAdmin, router]);

  // Mostrar tela de carregamento enquanto verifica permissões
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <FiLoader className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  // Se não for administrador, não mostrar nada (será redirecionado)
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin.avaliacao.title', 'Administração do Módulo de Avaliação')}
          </h1>
        </div>

        {/* Alerta de Migration Necessária */}
        {activeTab !== 'database' && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <FiAlertCircle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  ⚠️ Migration Necessária
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Para usar este módulo, você precisa executar a migration do banco de dados.
                    Vá para a aba <strong>"Banco de Dados"</strong> e clique em <strong>"Executar Migration"</strong>.
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setActiveTab('database')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                  >
                    <FiDatabase className="mr-1" />
                    Ir para Banco de Dados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <button
                onClick={() => setActiveTab('periodos')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'periodos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiCalendar className="inline-block mr-2" />
                Períodos de Avaliação
              </button>
              <button
                onClick={() => setActiveTab('gerentes')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'gerentes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiUserCheck className="inline-block mr-2" />
                Gerentes de Avaliação
              </button>
              <button
                onClick={() => setActiveTab('lideres')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'lideres'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiAward className="inline-block mr-2" />
                Líderes de Setor
              </button>
              <button
                onClick={() => setActiveTab('criterios')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'criterios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiList className="inline-block mr-2" />
                {t('admin.avaliacao.tabs.criterios', 'Critérios')}
              </button>
              <button
                onClick={() => setActiveTab('funcionarios')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'funcionarios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiUsers className="inline-block mr-2" />
                {t('admin.avaliacao.tabs.funcionarios', 'Funcionários')}
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'database'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiDatabase className="inline-block mr-2" />
                {t('admin.avaliacao.tabs.database', 'Banco de Dados')}
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiSettings className="inline-block mr-2" />
                Configuração
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'periodos' && (
              <PainelPeriodosAvaliacao />
            )}

            {activeTab === 'gerentes' && (
              <PainelGerentesAvaliacao />
            )}

            {activeTab === 'lideres' && (
              <PainelLideresSetor />
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {t('admin.avaliacao.database.title', 'Configuração do Banco de Dados')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(
                    'admin.avaliacao.database.description',
                    t('components.gerencieAsTabelasDoBancoDeDadosNecessariasParaOMod')
                  )}
                </p>

                <div className="grid grid-cols-1 gap-6">
                  <DiagnosticoAdmin />
                  <DiagnosticoForeignKeys />
                  <ExecutarMigrationAvaliacao />
                  <CreateCriteriosTable />
                  <ImportCriteriosButton />
                </div>
              </div>
            )}

            {activeTab === 'criterios' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {t('admin.avaliacao.criterios.title', 'Gerenciamento de Critérios')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(
                    'admin.avaliacao.criterios.description',
                    t('components.gerencieOsCriteriosDeAvaliacaoUtilizadosNoSistema')
                  )}
                </p>
                <CriteriosManager />
              </div>
            )}

            {activeTab === 'funcionarios' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {t('admin.avaliacao.funcionarios.title', 'Gerenciamento de Funcionários')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(
                    'admin.avaliacao.funcionarios.description',
                    t('components.gerencieOsFuncionariosQueParticipamDoProcessoDeAva')
                  )}
                </p>

                <div className="flex justify-center">
                  <Link
                    href="/admin/user-management"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiUsers className="mr-2 -ml-1 h-5 w-5" />
                    {t('admin.avaliacao.funcionarios.manage', 'Gerenciar Funcionários')}
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Configuração de Cálculo</h2>
                <div className="p-4 border rounded-md bg-gray-50 space-y-4">
                  <p className="text-sm text-gray-600">
                    Controle do método de cálculo das médias. O ambiente deve ter <code className="px-1 bg-yellow-200 rounded">EVALUACAO_WEIGHTED_ENABLED=true</code> para permitir uso de pesos.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">Cálculo Ponderado</p>
                      <p className="text-xs text-gray-500">Quando ativo, usa pesos configurados por pergunta (default 1).</p>
                    </div>
                    <button
                      onClick={toggleWeighted}
                      disabled={settingsLoading}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                        settings?.calculo?.method === 'weighted' && weightedEnvEnabled
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                      }`}
                    >
                      {settingsLoading ? 'Atualizando...' : settings?.calculo?.method === 'weighted' && weightedEnvEnabled ? 'Ativado' : 'Desativado'}
                    </button>
                  </div>
                  {!weightedEnvEnabled && (
                    <div className="text-xs text-red-600">
                      A flag de ambiente não está ativa. Mesmo que o método esteja setado para weighted, o cálculo continuará simples.
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-md bg-white space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <FiShield className="text-blue-600" />
                        Auditoria de gerente geral
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Defina quais usuários poderão atuar como gerente geral no módulo de avaliação e quais líderes/avaliadores cada um poderá auditar em modo somente leitura.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAuditAssignments((current) => [...current, createEmptyAssignment()])}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <FiPlus />
                      Adicionar gerente geral
                    </button>
                  </div>

                  {(usersLoading || settingsLoading) && (
                    <div className="text-sm text-gray-500">Carregando usuários e configurações...</div>
                  )}

                  {!usersLoading && leaderOptions.length === 0 && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                      Nenhum usuário ativo foi encontrado para configurar a auditoria.
                    </div>
                  )}

                  <div className="space-y-4">
                    {auditAssignments.map((assignment, index) => (
                      <div key={`${assignment.userId || 'novo'}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Gerente geral #{index + 1}</p>
                            <p className="text-xs text-gray-500">Selecione o usuário e depois os líderes/avaliadores que ele poderá acompanhar.</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setAuditAssignments((current) => {
                              const next = current.filter((_, currentIndex) => currentIndex !== index);
                              return next.length > 0 ? next : [createEmptyAssignment()];
                            })}
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 />
                            Remover
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <label className="block text-sm text-gray-700">
                            <span className="mb-2 block font-medium">Usuário gerente geral</span>
                            <select
                              value={assignment.userId}
                              onChange={(event) => updateAuditAssignment(index, { userId: event.target.value, leaderIds: assignment.leaderIds.filter((leaderId) => leaderId !== event.target.value) })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                            >
                              <option value="">Selecione um usuário</option>
                              {gerenteGeralOptions.map((userOption) => {
                                const selectedByOtherRow = auditAssignments.some((currentAssignment, currentIndex) => (
                                  currentIndex !== index && currentAssignment.userId === userOption.id
                                ));

                                return (
                                  <option
                                    key={userOption.id}
                                    value={userOption.id}
                                    disabled={selectedByOtherRow}
                                  >
                                    {userOption.name} {userOption.email ? `(${userOption.email})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </label>

                          <label className="block text-sm text-gray-700">
                            <span className="mb-2 block font-medium">Líderes / avaliadores visíveis</span>
                            <select
                              multiple
                              value={assignment.leaderIds}
                              onChange={(event) => updateAuditAssignment(index, {
                                ...assignment,
                                leaderIds: Array.from(event.target.selectedOptions).map((option) => option.value)
                              })}
                              className="min-h-40 w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                            >
                              {leaderOptions
                                .filter((userOption) => userOption.id !== assignment.userId)
                                .map((userOption) => (
                                  <option key={userOption.id} value={userOption.id}>
                                    {userOption.name} {userOption.email ? `(${userOption.email})` : ''}
                                  </option>
                                ))}
                            </select>
                            <span className="mt-2 block text-xs text-gray-500">
                              Use Ctrl/Cmd para selecionar múltiplos usuários. {assignment.leaderIds.length} selecionado(s).
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveAuditSettings}
                      disabled={auditSaving}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {auditSaving ? 'Salvando...' : 'Salvar auditoria'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

