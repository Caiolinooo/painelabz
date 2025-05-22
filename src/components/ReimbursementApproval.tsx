'use client';

import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiFilter, FiRefreshCw, FiCheck, FiX, FiEye, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabaseAdmin } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { getAuthToken, fetchWithAuth } from '@/lib/authUtils';

interface Reimbursement {
  id: string;
  protocolo: string;
  nome: string;
  email: string;
  data: string;
  valorTotal: number;
  valor_total?: number;
  tipoReembolso: string;
  tipo_reembolso?: string;
  status: string;
  created_at: string;
}

export default function ReimbursementApproval() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isAdmin, profile } = useSupabaseAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasApprovalPermission, setHasApprovalPermission] = useState(false);

  // Estado para o modal de rejeição
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Verificar permissões do usuário
  useEffect(() => {
    // Forçar a verificação de permissões para garantir que o componente seja exibido corretamente
    console.log('Verificando permissões de aprovação para o componente...');
    console.log('Dados do usuário:', {
      id: user?.id,
      email: user?.email,
      isAdmin,
      role: profile?.role,
      accessPermissions: profile?.accessPermissions,
      access_permissions: profile?.access_permissions
    });

    // Administradores sempre têm permissão
    if (isAdmin) {
      console.log('Usuário é administrador, concedendo permissão de aprovação');
      setHasApprovalPermission(true);
      return;
    }

    // Verificar se o usuário é gerente
    const isManager = profile?.role === 'MANAGER';
    if (isManager) {
      console.log('Usuário é gerente, concedendo permissão de aprovação');
      setHasApprovalPermission(true);
      return;
    }

    // Verificar permissões específicas
    const hasFeaturePermission = !!(
      profile?.accessPermissions?.features?.reimbursement_approval ||
      profile?.access_permissions?.features?.reimbursement_approval
    );

    console.log('Verificando permissões de aprovação:', {
      isAdmin,
      isManager,
      hasFeaturePermission,
      role: profile?.role,
      accessPermissions: profile?.accessPermissions,
      access_permissions: profile?.access_permissions
    });

    // Verificar se o email do usuário é o email do administrador
    const adminEmail = 'caio.correia@groupabz.com'; // Email do administrador
    const isAdminEmail = user?.email === adminEmail;

    if (isAdminEmail) {
      console.log('Email do usuário corresponde ao email do administrador, concedendo permissão');
      setHasApprovalPermission(true);
      return;
    }

    setHasApprovalPermission(hasFeaturePermission);
  }, [isAdmin, profile, user]);

  // Carregar solicitações de reembolso usando a função auxiliar de autenticação

  // Carregar solicitações de reembolso
  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir URL com parâmetros de consulta
      const queryParams = new URLSearchParams({
        status: statusFilter,
        limit: limit.toString(),
        page: page.toString()
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      // Usar a função fetchWithAuth para fazer a requisição autenticada
      const response = await fetchWithAuth(`/api/reembolso?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Erro ao carregar solicitações de reembolso: ${response.status}`);
      }

      const data = await response.json();
      setReimbursements(data.data || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error('Erro ao carregar solicitações de reembolso:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar solicitações quando o componente montar ou os filtros mudarem
  useEffect(() => {
    // Verificar se o email do usuário é o email do administrador
    const adminEmail = 'caio.correia@groupabz.com'; // Email do administrador
    const isAdminEmail = user?.email === adminEmail;

    // Permitir que administradores e gerentes também carreguem os reembolsos
    if (hasApprovalPermission || isAdmin || profile?.role === 'MANAGER' || isAdminEmail) {
      console.log('Carregando reembolsos para aprovação...', {
        hasApprovalPermission,
        isAdmin,
        role: profile?.role,
        email: user?.email,
        isAdminEmail
      });
      fetchReimbursements();
    }
  }, [hasApprovalPermission, isAdmin, profile?.role, statusFilter, page, limit, searchTerm, user?.email]);

  // Função para aprovar uma solicitação
  const handleApprove = async (id: string) => {
    try {
      console.log(`Tentando aprovar reembolso com ID: ${id}`);

      // Primeiro, buscar o protocolo usando o ID
      const { data: reimbursements, error: fetchError } = await supabaseAdmin
        .from('Reimbursement')
        .select('protocolo')
        .eq('id', id)
        .single();

      if (fetchError || !reimbursements) {
        console.log('Tabela Reimbursement não encontrada, tentando tabela alternativa');
        // Tentar com o nome alternativo da tabela
        const { data: altReimbursements, error: altFetchError } = await supabaseAdmin
          .from('reimbursements')
          .select('protocolo')
          .eq('id', id)
          .single();

        if (altFetchError) {
          console.error('Erro ao buscar reembolso na tabela alternativa:', altFetchError);
          throw new Error('Reembolso não encontrado');
        }

        if (!altReimbursements) {
          console.error('Reembolso não encontrado em nenhuma tabela');
          throw new Error('Reembolso não encontrado');
        }

        // Usar o protocolo da tabela alternativa
        const protocolo = altReimbursements.protocolo;
        console.log(`Protocolo encontrado na tabela alternativa: ${protocolo}`);

        // Usar a função fetchWithAuth para fazer a requisição autenticada
        const response = await fetchWithAuth(`/api/reembolso/${protocolo}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'aprovado',
            observacao: 'Solicitação aprovada pelo administrador'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Resposta de erro:', errorText);
          throw new Error(`Erro ao aprovar solicitação: ${response.status}`);
        }

        toast.success('Solicitação aprovada com sucesso!');
        fetchReimbursements();
        return;
      }

      // Usar o protocolo da tabela principal
      const protocolo = reimbursements.protocolo;
      console.log(`Protocolo encontrado na tabela principal: ${protocolo}`);

      // Usar a função fetchWithAuth para fazer a requisição autenticada
      const response = await fetchWithAuth(`/api/reembolso/${protocolo}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'aprovado',
          observacao: 'Solicitação aprovada pelo administrador'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro:', errorText);
        throw new Error(`Erro ao aprovar solicitação: ${response.status}`);
      }

      toast.success('Solicitação aprovada com sucesso!');
      fetchReimbursements();
    } catch (err) {
      console.error('Erro ao aprovar solicitação:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar solicitação');
    }
  };

  // Função para abrir o modal de rejeição
  const handleReject = (id: string) => {
    console.log(`Abrindo modal de rejeição para o reembolso com ID: ${id}`);
    setRejectingId(id);
    setRejectReason('');
    setShowRejectModal(true);

    // Pequeno atraso para garantir que o DOM seja atualizado
    setTimeout(() => {
      // Tentar focar no textarea
      const textarea = document.querySelector('textarea[placeholder="Informe o motivo da rejeição..."]');
      if (textarea) {
        (textarea as HTMLTextAreaElement).focus();
      }
    }, 100);
  };

  // Função para fechar o modal de rejeição
  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectingId(null);
    setRejectReason('');
  };

  // Função para confirmar a rejeição com motivo
  const confirmReject = async () => {
    // Verificar se temos um ID e um motivo
    if (!rejectingId) {
      toast.error('ID do reembolso não encontrado');
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição');
      return;
    }

    setRejectLoading(true);

    try {
      console.log(`Tentando rejeitar reembolso com ID: ${rejectingId}, motivo: ${rejectReason}`);

      // Primeiro, buscar o protocolo usando o ID
      const { data: reimbursements, error: fetchError } = await supabaseAdmin
        .from('Reimbursement')
        .select('protocolo')
        .eq('id', rejectingId)
        .single();

      if (fetchError || !reimbursements) {
        console.log('Tabela Reimbursement não encontrada, tentando tabela alternativa');
        // Tentar com o nome alternativo da tabela
        const { data: altReimbursements, error: altFetchError } = await supabaseAdmin
          .from('reimbursements')
          .select('protocolo')
          .eq('id', rejectingId)
          .single();

        if (altFetchError) {
          console.error('Erro ao buscar reembolso na tabela alternativa:', altFetchError);
          throw new Error('Reembolso não encontrado');
        }

        if (!altReimbursements) {
          console.error('Reembolso não encontrado em nenhuma tabela');
          throw new Error('Reembolso não encontrado');
        }

        // Usar o protocolo da tabela alternativa
        const protocolo = altReimbursements.protocolo;
        console.log(`Protocolo encontrado na tabela alternativa: ${protocolo}`);

        // Usar a função fetchWithAuth para fazer a requisição autenticada
        const response = await fetchWithAuth(`/api/reembolso/${protocolo}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'rejeitado',
            observacao: rejectReason
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Resposta de erro:', errorText);
          throw new Error(`Erro ao rejeitar solicitação: ${response.status}`);
        }

        toast.success('Solicitação rejeitada com sucesso!');
        closeRejectModal();
        fetchReimbursements();
        return;
      }

      // Usar o protocolo da tabela principal
      const protocolo = reimbursements.protocolo;
      console.log(`Protocolo encontrado na tabela principal: ${protocolo}`);

      // Usar a função fetchWithAuth para fazer a requisição autenticada
      const response = await fetchWithAuth(`/api/reembolso/${protocolo}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'rejeitado',
          observacao: rejectReason
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro:', errorText);
        throw new Error(`Erro ao rejeitar solicitação: ${response.status}`);
      }

      toast.success('Solicitação rejeitada com sucesso!');
      closeRejectModal();
      fetchReimbursements();
    } catch (err) {
      console.error('Erro ao rejeitar solicitação:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao rejeitar solicitação');
    } finally {
      setRejectLoading(false);
    }
  };

  // Função para visualizar detalhes de uma solicitação
  const handleViewDetails = (reimbursement: Reimbursement) => {
    console.log(`Navegando para detalhes do reembolso com protocolo: ${reimbursement.protocolo}`);
    router.push(`/reembolso/${reimbursement.protocolo}`);
  };

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Verificar se o email do usuário é o email do administrador
  const adminEmail = 'caio.correia@groupabz.com'; // Email do administrador
  const isAdminEmail = user?.email === adminEmail;

  // Verificar se o usuário tem permissão para acessar a página
  if (!hasApprovalPermission && !isAdmin && profile?.role !== 'MANAGER' && !isAdminEmail) {
    console.log('Acesso negado ao componente de aprovação:', {
      hasApprovalPermission,
      isAdmin,
      role: profile?.role,
      email: user?.email,
      isAdminEmail
    });

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <FiX className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">{t('common.accessDenied', 'Acesso Negado')}</h2>
        <p className="text-red-600 mb-4">
          {t('reimbursement.approvalPermissionRequired', 'Você não tem permissão para acessar a página de aprovação de reembolsos.')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{t('reimbursement.tabs.approval')}</h2>
      </div>

      {/* Filtros e pesquisa */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={t('common.search')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-abz-blue focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchReimbursements();
                  }
                }}
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={fetchReimbursements}
              className="ml-2 p-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark"
              title={t('common.search')}
            >
              <FiSearch />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                className="pl-4 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-abz-blue focus:border-transparent appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pendente">Pendentes</option>
                <option value="aprovado">Aprovados</option>
                <option value="rejeitado">Rejeitados</option>
                <option value="pago">Pagos</option>
                <option value="">Todos</option>
              </select>
              <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={fetchReimbursements}
              className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              title={t('common.refresh')}
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de solicitações */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={fetchReimbursements}
              className="mt-4 px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        ) : reimbursements.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>{t('common.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reimbursement.form.protocol')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reimbursement.form.fullName')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reimbursement.form.expenseDate')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reimbursement.form.expenseType')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reimbursement.form.expenseValue')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reimbursements.map((reimbursement) => (
                  <tr key={reimbursement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reimbursement.protocolo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reimbursement.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(reimbursement.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reimbursement.tipoReembolso || reimbursement.tipo_reembolso}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(reimbursement.valorTotal || reimbursement.valor_total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        reimbursement.status === 'aprovado' ? 'bg-green-100 text-green-800' :
                        reimbursement.status === 'rejeitado' ? 'bg-red-100 text-red-800' :
                        reimbursement.status === 'pago' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reimbursement.status.charAt(0).toUpperCase() + reimbursement.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(reimbursement)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('common.view')}
                        >
                          <FiEye />
                        </button>
                        {reimbursement.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => handleApprove(reimbursement.id)}
                              className="text-green-600 hover:text-green-900"
                              title={t('common.approve')}
                            >
                              <FiCheck />
                            </button>
                            <button
                              onClick={() => handleReject(reimbursement.id)}
                              className="text-red-600 hover:text-red-900"
                              title={t('common.reject')}
                            >
                              <FiX />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {!loading && !error && reimbursements.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {t('common.showing')} <span className="font-medium">{(page - 1) * limit + 1}</span> {t('common.to')}{' '}
            <span className="font-medium">{Math.min(page * limit, totalCount)}</span> {t('common.of')}{' '}
            <span className="font-medium">{totalCount}</span> {t('common.results')}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded-md ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-abz-blue text-white hover:bg-abz-blue-dark'
              }`}
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * limit >= totalCount}
              className={`px-3 py-1 rounded-md ${
                page * limit >= totalCount
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-abz-blue text-white hover:bg-abz-blue-dark'
              }`}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {/* Modal de rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiX className="mr-2 text-red-500" />
                Rejeitar Solicitação
              </h2>
              <button
                onClick={closeRejectModal}
                className="text-gray-500 hover:text-gray-700"
                disabled={rejectLoading}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6 bg-red-50 p-4 rounded-lg border-2 border-red-300 shadow-md">
                <h3 className="text-lg font-medium text-red-800 mb-2 flex items-center">
                  <FiAlertTriangle className="mr-2 text-red-600" />
                  Motivo da Rejeição
                </h3>
                <p className="text-red-700 mb-3 text-sm">
                  Por favor, informe o motivo da rejeição. Esta informação será enviada ao solicitante.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  className="w-full p-3 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  rows={4}
                  autoFocus
                  disabled={rejectLoading}
                ></textarea>
                {!rejectReason.trim() && (
                  <div className="mt-2 text-sm text-red-600">
                    O motivo da rejeição é obrigatório
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                disabled={rejectLoading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={rejectLoading || !rejectReason.trim()}
              >
                {rejectLoading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                ) : (
                  <FiX className="mr-2" />
                )}
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
