'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import MainLayout from '@/components/Layout/MainLayout';
import { FiSave, FiX, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  departamento?: string;
  email?: string;
}

interface Avaliacao {
  id: string;
  funcionario_id: string;
  avaliador_id: string;
  periodo: string;
  status: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
  funcionario?: Funcionario;
  avaliador?: Funcionario;
}

export default function EditarAvaliacaoPage({ params }: { params: { id: string } }) {
  // Obter o ID da avaliação diretamente dos params
  // Não usamos React.use() aqui porque está causando erros
  const avaliacaoId = params.id;

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [avaliadores, setAvaliadores] = useState<Funcionario[]>([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);

  // Estado do formulário
  const [formData, setFormData] = useState({
    avaliador_id: '',
    funcionario_id: '',
    periodo: '',
    status: 'pending',
    observacoes: ''
  });

  // Obter o parâmetro source da URL
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há um parâmetro source na URL
    const urlParams = new URLSearchParams(window.location.search);
    const sourceParam = urlParams.get('source');
    setSource(sourceParam);

    // Remover o parâmetro t da URL se existir
    if (urlParams.has('t')) {
      urlParams.delete('t');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Carregar avaliação e funcionários
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Criar cliente Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar avaliação pelo ID
        const { data: avaliacaoData, error: avaliacaoError } = await supabase
          .from('avaliacoes')
          .select(`
            *,
            funcionario:funcionario_id(id, nome, cargo, departamento),
            avaliador:avaliador_id(id, nome, cargo)
          `)
          .eq('id', avaliacaoId)
          .is('deleted_at', null)
          .single();

        if (avaliacaoError) {
          throw avaliacaoError;
        }

        // Buscar todos os funcionários
        const { data: funcionariosData, error: funcionariosError } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo, departamento, email')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (funcionariosError) {
          throw funcionariosError;
        }

        // Separar avaliadores (gerentes e admins) dos funcionários comuns
        const todosFuncionarios = funcionariosData || [];
        const apenasAvaliadores = todosFuncionarios.filter(f =>
          f.cargo?.toLowerCase().includes('gerente') ||
          f.cargo?.toLowerCase().includes('diretor') ||
          f.cargo?.toLowerCase().includes('admin')
        );

        setFuncionarios(todosFuncionarios);
        setAvaliadores(apenasAvaliadores);
        setLoadingFuncionarios(false);

        // Preencher o formulário com os dados da avaliação
        setFormData({
          avaliador_id: avaliacaoData.avaliador_id,
          funcionario_id: avaliacaoData.funcionario_id,
          periodo: avaliacaoData.periodo,
          status: avaliacaoData.status,
          observacoes: avaliacaoData.observacoes || ''
        });

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchData();
  }, [avaliacaoId]);

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
      setSaveLoading(true);
      setError(null);

      // Validar campos obrigatórios
      if (!formData.avaliador_id || !formData.funcionario_id || !formData.periodo) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        setSaveLoading(false);
        return;
      }

      // Criar cliente Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Atualizar avaliação
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          avaliador_id: formData.avaliador_id,
          funcionario_id: formData.funcionario_id,
          periodo: formData.periodo,
          status: formData.status,
          observacoes: formData.observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', avaliacaoId);

      if (error) {
        throw error;
      }

      console.log('Avaliação atualizada com sucesso');
      setSuccess(true);

      // Redirecionar para a página de detalhes após 2 segundos
      setTimeout(() => {
        router.push(`/avaliacao/ver/${avaliacaoId}`);
      }, 2000);

    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err);
      setError('Ocorreu um erro ao atualizar a avaliação. Por favor, tente novamente.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          {source === 'list' ? (
            <Link href="/avaliacao" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <FiArrowLeft className="mr-2" /> Voltar para a lista
            </Link>
          ) : (
            <Link href={`/avaliacao/ver/${avaliacaoId}`} className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <FiArrowLeft className="mr-2" /> Voltar para detalhes
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error && !success ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md mb-6">
            <div className="flex items-center mb-2">
              <FiAlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">Erro</h3>
            </div>
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Editar Avaliação</h1>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-6">
                <p>Avaliação atualizada com sucesso! Redirecionando...</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="avaliador_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Avaliador *
                  </label>
                  <select
                    id="avaliador_id"
                    name="avaliador_id"
                    value={formData.avaliador_id}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loadingFuncionarios || success}
                  >
                    <option value="">Selecione um avaliador</option>
                    {avaliadores.map(avaliador => (
                      <option key={avaliador.id} value={avaliador.id}>
                        {avaliador.nome} ({avaliador.cargo || 'Sem cargo'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="funcionario_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Funcionário *
                  </label>
                  <select
                    id="funcionario_id"
                    name="funcionario_id"
                    value={formData.funcionario_id}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loadingFuncionarios || success}
                  >
                    <option value="">Selecione um funcionário</option>
                    {funcionarios.map(funcionario => (
                      <option key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome} ({funcionario.cargo || 'Sem cargo'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 mb-1">
                    Período *
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
                    disabled={success}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={success}
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="completed">Concluída</option>
                    <option value="archived">Arquivada</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={success}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href={`/avaliacao/ver/${avaliacaoId}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiX className="mr-2" /> Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saveLoading || success}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" /> Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
