'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiBarChart2, FiUsers, FiFileText, FiUpload, FiPlus, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

// Tipo para usuários
interface User extends Tables<'users'> {
  // Campos adicionais se necessário
}

export default function AvaliacaoPage() {
  const { t } = useI18n();
  const { user, profile } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();
  const [moduleStatus, setModuleStatus] = useState<'loading' | 'online' | 'error'>('loading');
  const [funcionarios, setFuncionarios] = useState<User[]>([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);
  const [errorFuncionarios, setErrorFuncionarios] = useState<string | null>(null);

  // Carregar funcionários do Supabase
  useEffect(() => {
    async function loadFuncionarios() {
      try {
        setLoadingFuncionarios(true);
        setErrorFuncionarios(null);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('first_name', { ascending: true });

        if (error) {
          throw error;
        }

        setFuncionarios(data || []);
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        setErrorFuncionarios('Erro ao carregar funcionários. Tente novamente.');
      } finally {
        setLoadingFuncionarios(false);
      }
    }

    loadFuncionarios();
  }, []);

  // Verificar o status do módulo de avaliação de desempenho
  useEffect(() => {
    async function checkModuleStatus() {
      try {
        const response = await fetch('/api/avaliacao-desempenho');
        const data = await response.json();

        if (data.status === 'online') {
          setModuleStatus('online');
        } else {
          setModuleStatus('error');
        }
      } catch (error) {
        console.error('Erro ao verificar status do módulo:', error);
        setModuleStatus('error');
      }
    }

    checkModuleStatus();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
      <PageHeader
        title={t('avaliacao.title', 'Avaliação de Desempenho')}
        description={t('avaliacao.description', 'Gerencie avaliações de desempenho dos colaboradores')}
        icon={<FiBarChart2 className="w-8 h-8" />}
      />

      {/* Status do módulo */}
      <div className="flex items-center mb-4">
        <div className="mr-2 flex items-center">
          <span className="mr-2">{t('avaliacao.moduleStatus', 'Status do módulo')}:</span>
          {moduleStatus === 'loading' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              {t('avaliacao.statusLoading', 'Carregando...')}
            </span>
          )}
          {moduleStatus === 'online' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              {t('avaliacao.statusOnline', 'Online')}
            </span>
          )}
          {moduleStatus === 'error' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              {t('avaliacao.statusError', 'Erro')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'dashboard'
              ? 'text-abz-blue border-b-2 border-abz-blue'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          {t('avaliacao.dashboard')}
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'funcionarios'
              ? 'text-abz-blue border-b-2 border-abz-blue'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('funcionarios')}
        >
          {t('avaliacao.funcionarios.title')}
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'relatorios'
              ? 'text-abz-blue border-b-2 border-abz-blue'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('relatorios')}
        >
          {t('avaliacao.relatorios.title')}
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'importacao'
              ? 'text-abz-blue border-b-2 border-abz-blue'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('importacao')}
        >
          {t('avaliacao.importacao.title')}
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            title={t('avaliacao.funcionarios.title')}
            description={t('avaliacao.funcionarios.noFuncionarios')}
            icon={<FiUsers className="w-6 h-6" />}
            onClick={() => setActiveTab('funcionarios')}
            className="bg-white hover:bg-gray-50"
          />
          <Card
            title={t('avaliacao.title')}
            description={t('avaliacao.noAvaliacoes')}
            icon={<FiBarChart2 className="w-6 h-6" />}
            onClick={() => {}}
            className="bg-white hover:bg-gray-50"
          />
          <Card
            title={t('avaliacao.relatorios.title')}
            description={t('avaliacao.relatorios.description')}
            icon={<FiFileText className="w-6 h-6" />}
            onClick={() => setActiveTab('relatorios')}
            className="bg-white hover:bg-gray-50"
          />
          <Card
            title={t('avaliacao.importacao.title')}
            description={t('avaliacao.importacao.description')}
            icon={<FiUpload className="w-6 h-6" />}
            onClick={() => setActiveTab('importacao')}
            className="bg-white hover:bg-gray-50"
          />
        </div>
      )}

      {/* Funcionários Tab */}
      {activeTab === 'funcionarios' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{t('avaliacao.funcionarios.title')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  async function reloadFuncionarios() {
                    try {
                      setLoadingFuncionarios(true);
                      setErrorFuncionarios(null);

                      const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .order('first_name', { ascending: true });

                      if (error) {
                        throw error;
                      }

                      setFuncionarios(data || []);
                    } catch (error) {
                      console.error('Erro ao carregar funcionários:', error);
                      setErrorFuncionarios('Erro ao carregar funcionários. Tente novamente.');
                    } finally {
                      setLoadingFuncionarios(false);
                    }
                  }
                  reloadFuncionarios();
                }}
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                disabled={loadingFuncionarios}
              >
                <FiRefreshCw className={`mr-2 ${loadingFuncionarios ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => router.push('/avaliacao/funcionarios/novo')}
                className="flex items-center px-3 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark"
              >
                <FiPlus className="mr-2" />
                {t('avaliacao.funcionarios.addFuncionario')}
              </button>
            </div>
          </div>

          {errorFuncionarios && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <div className="flex items-center">
                <FiAlertCircle className="mr-2" />
                <span>{errorFuncionarios}</span>
              </div>
            </div>
          )}

          {loadingFuncionarios ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-abz-blue"></div>
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <FiUsers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{t('avaliacao.funcionarios.noFuncionarios')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {funcionarios.map((funcionario) => (
                    <tr key={funcionario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {funcionario.first_name?.[0]}{funcionario.last_name?.[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{funcionario.first_name} {funcionario.last_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{funcionario.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{funcionario.position || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{funcionario.department || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${funcionario.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {funcionario.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/avaliacao/funcionarios/${funcionario.id}`)}
                          className="text-abz-blue hover:text-abz-blue-dark mr-3"
                        >
                          Detalhes
                        </button>
                        <button
                          onClick={() => router.push(`/avaliacao/avaliacoes/nova?funcionarioId=${funcionario.id}`)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Avaliar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Relatórios Tab */}
      {activeTab === 'relatorios' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">{t('avaliacao.relatorios.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('avaliacao.relatorios.tipoRelatorio')}
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="individual">{t('avaliacao.relatorios.tipoOptions.individual')}</option>
                <option value="departamento">{t('avaliacao.relatorios.tipoOptions.departamento')}</option>
                <option value="geral">{t('avaliacao.relatorios.tipoOptions.geral')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('avaliacao.relatorios.periodoRelatorio')}
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="mensal">{t('avaliacao.periodoOptions.mensal')}</option>
                <option value="trimestral">{t('avaliacao.periodoOptions.trimestral')}</option>
                <option value="semestral">{t('avaliacao.periodoOptions.semestral')}</option>
                <option value="anual">{t('avaliacao.periodoOptions.anual')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
              {t('avaliacao.relatorios.exportarExcel')}
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
              {t('avaliacao.relatorios.exportarPDF')}
            </button>
            <button className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded">
              {t('avaliacao.relatorios.gerarRelatorio')}
            </button>
          </div>
        </div>
      )}

      {/* Importação Tab */}
      {activeTab === 'importacao' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">{t('avaliacao.importacao.title')}</h2>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <FiUpload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{t('avaliacao.importacao.instructionsText')}</p>
            <p className="text-gray-500 mb-4">{t('avaliacao.importacao.fileFormat')}</p>
            <button className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded">
              {t('avaliacao.importacao.selectFile')}
            </button>
          </div>
          <div className="flex justify-between">
            <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
              {t('avaliacao.importacao.template')}
            </button>
            <button className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded" disabled>
              {t('avaliacao.importacao.upload')}
            </button>
          </div>
        </div>
      )}

      {/* Botão de Nova Avaliação */}
      <div className="mt-8">
        <Link
          href="/avaliacao/avaliacoes/nova"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
        >
          <FiPlus className="mr-2 -ml-1 h-5 w-5" />
          {t('avaliacao.novaAvaliacao', 'Nova Avaliação')}
        </Link>
      </div>
    </div>
    </MainLayout>
  );
}
