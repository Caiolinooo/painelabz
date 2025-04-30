'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiFileText, FiArrowLeft, FiSave } from 'react-icons/fi';
import PageHeader from '@/components/PageHeader';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Funcionario {
  id: number;
  nome: string;
  cargo: string;
  departamento: string;
}

interface Criterio {
  id: number;
  nome: string;
  descricao: string;
  categoria: string;
  peso: number;
  pontuacaoMaxima: number;
}

export default function NovaAvaliacaoPage() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const router = useRouter();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    funcionarioId: '',
    avaliadorId: '',
    periodo: '',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: '',
    observacoes: ''
  });

  // Carregar funcionários e critérios
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
        if (!token) {
          throw new Error('Não autorizado');
        }

        // Carregar funcionários
        const funcionariosResponse = await fetch('/api/avaliacao-desempenho/funcionarios', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!funcionariosResponse.ok) {
          throw new Error('Erro ao carregar funcionários');
        }

        const funcionariosResult = await funcionariosResponse.json();
        if (funcionariosResult.success) {
          setFuncionarios(funcionariosResult.data);
        } else {
          throw new Error(funcionariosResult.error || 'Erro ao carregar funcionários');
        }

        // Carregar critérios
        const criteriosResponse = await fetch('/api/avaliacao-desempenho/criterios', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!criteriosResponse.ok) {
          throw new Error('Erro ao carregar critérios');
        }

        const criteriosResult = await criteriosResponse.json();
        if (criteriosResult.success) {
          setCriterios(criteriosResult.data);
        } else {
          throw new Error(criteriosResult.error || 'Erro ao carregar critérios');
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Calcular data de fim (30 dias após a data de início)
  useEffect(() => {
    if (formData.dataInicio) {
      const dataInicio = new Date(formData.dataInicio);
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        dataFim: dataFim.toISOString().split('T')[0]
      }));
    }
  }, [formData.dataInicio]);

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
      if (!token) {
        throw new Error('Não autorizado');
      }

      const response = await fetch('/api/avaliacao-desempenho/avaliacoes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          funcionarioId: parseInt(formData.funcionarioId),
          avaliadorId: parseInt(formData.avaliadorId),
          periodo: formData.periodo,
          criterios: criterios.map(criterio => ({
            criterioId: criterio.id,
            peso: criterio.peso,
            notaMaxima: criterio.pontuacaoMaxima || 5,
            nota: null
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar avaliação');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar avaliação');
      }

      // Redirecionar para a página de avaliações
      router.push('/avaliacao');
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <PageHeader
          title={t('avaliacao.novaAvaliacao', 'Nova Avaliação')}
          description={t('avaliacao.novaAvaliacaoDesc', 'Crie uma nova avaliação de desempenho')}
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

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.funcionario', 'Funcionário')} *
                </label>
                <select
                  name="funcionarioId"
                  value={formData.funcionarioId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={isLoading}
                >
                  <option value="">{t('common.selecione', 'Selecione...')}</option>
                  {funcionarios.map(funcionario => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome} - {funcionario.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.avaliador', 'Avaliador')} *
                </label>
                <select
                  name="avaliadorId"
                  value={formData.avaliadorId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={isLoading}
                >
                  <option value="">{t('common.selecione', 'Selecione...')}</option>
                  {funcionarios.map(funcionario => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome} - {funcionario.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.periodo', 'Período')} *
                </label>
                <input
                  type="text"
                  name="periodo"
                  value={formData.periodo}
                  onChange={handleChange}
                  placeholder="Ex: 2023-1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.dataInicio', 'Data de Início')} *
                </label>
                <input
                  type="date"
                  name="dataInicio"
                  value={formData.dataInicio}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.dataFim', 'Data de Fim')} *
                </label>
                <input
                  type="date"
                  name="dataFim"
                  value={formData.dataFim}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.observacoes', 'Observações')}
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href="/avaliacao"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('common.cancelar', 'Cancelar')}
              </Link>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
                disabled={isLoading}
              >
                <FiSave className="mr-2 -ml-1 h-5 w-5" />
                {isLoading ? t('common.salvando', 'Salvando...') : t('common.salvar', 'Salvar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
