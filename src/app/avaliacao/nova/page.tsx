'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import MainLayout from '@/components/Layout/MainLayout';
import { FiSave, FiX, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/I18nContext';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  user_id: string;
  users?: {
    id: string;
    role: string;
  };
}

export default function NovaAvaliacaoPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [avaliadores, setAvaliadores] = useState<Funcionario[]>([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);

  // Estado do formulário
  const [formData, setFormData] = useState({
    avaliador_id: '',
    funcionario_id: '', // Alterado de avaliado_id para funcionario_id
    periodo: '',
    status: 'pending',
    observacoes: ''
  });

  // Carregar funcionários e avaliadores
  useEffect(() => {
    const fetchFuncionarios = async () => {
      try {
        setLoadingFuncionarios(true);

        // Criar cliente Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar todos os funcionários da tabela funcionarios
        const { data, error } = await supabase
          .from('funcionarios')
          .select(`
            id,
            nome,
            email,
            cargo,
            user_id,
            users:user_id (id, role)
          `)
          .is('deleted_at', null)
          .order('nome', { ascending: true });

        if (error) {
          throw error;
        }

        // Separar avaliadores (gerentes e admins) dos funcionários comuns
        const todosFuncionarios = data || [];
        const apenasAvaliadores = todosFuncionarios.filter(f =>
          f.users?.role === 'ADMIN' || f.users?.role === 'MANAGER'
        );

        setFuncionarios(todosFuncionarios);
        setAvaliadores(apenasAvaliadores);
        setLoadingFuncionarios(false);
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err);
        setError(t('avaliacao.nova.loadFuncionariosError', 'Ocorreu um erro ao carregar os funcionários. Por favor, tente novamente.'));
        setLoadingFuncionarios(false);
      }
    };

    fetchFuncionarios();
  }, []);

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
      setLoading(true);
      setError(null);

      // Validar campos obrigatórios
      if (!formData.avaliador_id || !formData.funcionario_id || !formData.periodo) {
        setError(t('avaliacao.nova.requiredFieldsError', 'Por favor, preencha todos os campos obrigatórios.'));
        setLoading(false);
        return;
      }

      // Criar cliente Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Criar nova avaliação
      const { data, error } = await supabase
        .from('avaliacoes')
        .insert({
          avaliador_id: formData.avaliador_id,
          funcionario_id: formData.funcionario_id, // Alterado de avaliado_id para funcionario_id
          periodo: formData.periodo,
          status: formData.status,
          observacoes: formData.observacoes,
          created_at: new Date().toISOString(),
          data_criacao: new Date().toISOString()
        })
        .select();

      if (error) {
        throw error;
      }

      console.log('Avaliação criada com sucesso:', data);
      setSuccess(true);

      // Redirecionar para a lista após 2 segundos
      setTimeout(() => {
        router.push('/avaliacao');
      }, 2000);

    } catch (err) {
      console.error('Erro ao criar avaliação:', err);
      setError(t('avaliacao.nova.createError', 'Ocorreu um erro ao criar a avaliação. Por favor, tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/avaliacao" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <FiArrowLeft className="mr-2" /> {t('avaliacao.trash.backToList', 'Voltar para a lista')}
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('avaliacao.novaAvaliacao', 'Nova Avaliação')}</h1>

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-6">
              <p>{t('avaliacao.nova.createSuccess', 'Avaliação criada com sucesso! Redirecionando...')}</p>
            </div>
          ) : null}

          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
              <p>{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="avaliador_id" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.avaliador', 'Avaliador')} *
                </label>
                <select
                  id="avaliador_id"
                  name="avaliador_id"
                  value={formData.avaliador_id}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingFuncionarios}
                >
                  <option value="">{t('avaliacao.nova.selectAvaliador', 'Selecione um avaliador')}</option>
                  {avaliadores.map(avaliador => (
                    <option key={avaliador.id} value={avaliador.id}>
                      {avaliador.nome} ({avaliador.cargo || avaliador.users?.role || 'Funcionário'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="funcionario_id" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.funcionario', 'Funcionário')} *
                </label>
                <select
                  id="funcionario_id"
                  name="funcionario_id"
                  value={formData.funcionario_id}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingFuncionarios}
                >
                  <option value="">{t('avaliacao.nova.selectFuncionario', 'Selecione um funcionário')}</option>
                  {funcionarios.map(funcionario => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome} ({funcionario.email || funcionario.cargo || 'Sem email'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.periodo', 'Período')} *
                </label>
                <input
                  type="text"
                  id="periodo"
                  name="periodo"
                  value={formData.periodo}
                  onChange={handleChange}
                  placeholder="Ex: 2025-Q1"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('avaliacao.status.title', 'Status')}
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">{t('avaliacao.status.pending', 'Pendente')}</option>
                  <option value="in_progress">{t('avaliacao.status.inProgress', 'Em Progresso')}</option>
                  <option value="completed">{t('avaliacao.status.completed', 'Concluída')}</option>
                  <option value="archived">{t('avaliacao.status.archived', 'Arquivada')}</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
                {t('avaliacao.observacoes', 'Observações')}
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/avaliacao"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiX className="mr-2" /> {t('common.cancel', 'Cancelar')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                    {t('common.saving', 'Salvando...')}
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" /> {t('common.save', 'Salvar')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
