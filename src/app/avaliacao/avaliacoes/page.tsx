'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiFileText, FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import PageHeader from '@/components/PageHeader';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Avaliacao {
  id: number;
  funcionarioId: number;
  avaliadorId: number;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  pontuacaoTotal: number;
  observacoes?: string;
  funcionario?: {
    id: number;
    nome: string;
    cargo: string;
  };
  avaliador?: {
    id: number;
    nome: string;
    cargo: string;
  };
}

export default function AvaliacoesPage() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const router = useRouter();

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar avaliações
  useEffect(() => {
    async function loadAvaliacoes() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/avaliacao-desempenho/avaliacoes');
        if (!response.ok) {
          throw new Error('Erro ao carregar avaliações');
        }
        const data = await response.json();
        setAvaliacoes(data);
      } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    loadAvaliacoes();
  }, []);

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Renderizar status
  const renderStatus = (status: Avaliacao['status']) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {t('avaliacao.status.pendente', 'Pendente')}
          </span>
        );
      case 'em_andamento':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {t('avaliacao.status.emAndamento', 'Em andamento')}
          </span>
        );
      case 'concluida':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('avaliacao.status.concluida', 'Concluída')}
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {t('avaliacao.status.cancelada', 'Cancelada')}
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <PageHeader
          title={t('avaliacao.avaliacoes', 'Avaliações')}
          description={t('avaliacao.avaliacoesDesc', 'Gerencie avaliações de desempenho')}
          icon={<FiFileText className="w-8 h-8" />}
        />

        <div className="mb-4">
          <Link
            href="/avaliacao"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft className="mr-1" />
            {t('common.voltar', 'Voltar')}
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t('avaliacao.listaAvaliacoes', 'Lista de Avaliações')}</h2>
          <Link
            href="/avaliacao/avaliacoes/nova"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            <FiPlus className="mr-2 -ml-1 h-5 w-5" />
            {t('avaliacao.novaAvaliacao', 'Nova Avaliação')}
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
          </div>
        ) : avaliacoes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <FiFileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{t('avaliacao.semAvaliacoes', 'Nenhuma avaliação encontrada')}</p>
            <Link
              href="/avaliacao/avaliacoes/nova"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
            >
              <FiPlus className="mr-2 -ml-1 h-5 w-5" />
              {t('avaliacao.novaAvaliacao', 'Nova Avaliação')}
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.funcionario', 'Funcionário')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.avaliador', 'Avaliador')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.periodo', 'Período')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.dataInicio', 'Data Início')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.dataFim', 'Data Fim')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.status', 'Status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.pontuacao', 'Pontuação')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.acoes', 'Ações')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {avaliacoes.map((avaliacao) => (
                    <tr key={avaliacao.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {avaliacao.funcionario?.nome || `ID: ${avaliacao.funcionarioId}`}
                        </div>
                        {avaliacao.funcionario?.cargo && (
                          <div className="text-sm text-gray-500">
                            {avaliacao.funcionario.cargo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {avaliacao.avaliador?.nome || `ID: ${avaliacao.avaliadorId}`}
                        </div>
                        {avaliacao.avaliador?.cargo && (
                          <div className="text-sm text-gray-500">
                            {avaliacao.avaliador.cargo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {avaliacao.periodo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(avaliacao.dataInicio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(avaliacao.dataFim)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatus(avaliacao.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {avaliacao.status === 'concluida' ? avaliacao.pontuacaoTotal.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/avaliacao/avaliacoes/${avaliacao.id}`}
                            className="text-abz-blue hover:text-abz-blue-dark"
                            title={t('common.visualizar', 'Visualizar')}
                          >
                            <FiEye className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/avaliacao/avaliacoes/${avaliacao.id}/editar`}
                            className="text-yellow-600 hover:text-yellow-900"
                            title={t('common.editar', 'Editar')}
                          >
                            <FiEdit className="h-5 w-5" />
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-900"
                            title={t('common.excluir', 'Excluir')}
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
