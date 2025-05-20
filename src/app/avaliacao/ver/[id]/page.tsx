'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import MainLayout from '@/components/Layout/MainLayout';
import { FiArrowLeft, FiEdit, FiTrash2, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Tipo para avaliação
interface Avaliacao {
  id: string;
  funcionario_id: string;
  avaliador_id: string;
  periodo: string;
  data_inicio?: string;
  data_fim?: string;
  status: string;
  pontuacao_total?: number;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
  funcionario?: {
    nome: string;
    cargo?: string;
    departamento?: string;
  };
  avaliador?: {
    nome: string;
    cargo?: string;
  };
}

export default function VerAvaliacaoPage({ params }: { params: { id: string } }) {
  // Obter o ID da avaliação de forma segura
  const [avaliacaoId, setAvaliacaoId] = useState<string>('');

  // Usar useEffect para definir o ID de forma segura
  useEffect(() => {
    if (params && params.id) {
      console.log('ID da avaliação:', params.id);
      setAvaliacaoId(params.id);
    } else {
      console.error('ID da avaliação não encontrado nos parâmetros');
    }
  }, [params]);

  const router = useRouter();
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  useEffect(() => {
    const fetchAvaliacao = async () => {
      try {
        // Verificar se temos um ID válido
        if (!avaliacaoId) {
          console.log('Aguardando ID da avaliação...');
          return;
        }

        console.log('Buscando avaliação com ID:', avaliacaoId);
        setLoading(true);
        setError(null);

        // Criar cliente Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar avaliação pelo ID
        const { data, error } = await supabase
          .from('avaliacoes')
          .select(`
            *,
            funcionario:funcionario_id(id, nome, cargo, departamento),
            avaliador:avaliador_id(id, nome, cargo)
          `)
          .eq('id', avaliacaoId)
          .is('deleted_at', null)
          .single();

        if (error) {
          console.error('Erro na consulta Supabase:', error);
          throw error;
        }

        console.log('Avaliação encontrada:', data);
        setAvaliacao(data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar avaliação:', err);
        setError('Ocorreu um erro ao carregar a avaliação. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchAvaliacao();
  }, [avaliacaoId]);

  // Função para aprovar avaliação
  const handleApprove = async () => {
    if (!avaliacao) return;

    if (!confirm('Tem certeza que deseja aprovar esta avaliação?')) {
      return;
    }

    try {
      setApproveLoading(true);

      // Criar cliente Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Atualizar o status para 'completed'
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', avaliacao.id);

      if (error) {
        throw error;
      }

      // Atualizar o estado local
      setAvaliacao(prev => prev ? { ...prev, status: 'completed' } : null);

      alert('Avaliação aprovada com sucesso!');
    } catch (err) {
      console.error('Erro ao aprovar avaliação:', err);
      alert('Ocorreu um erro ao aprovar a avaliação. Por favor, tente novamente.');
    } finally {
      setApproveLoading(false);
    }
  };

  // Função para mover para a lixeira
  const handleMoveToTrash = async () => {
    if (!avaliacao) return;

    if (!confirm('Tem certeza que deseja mover esta avaliação para a lixeira? Ela será excluída permanentemente após 30 dias.')) {
      return;
    }

    try {
      setDeleteLoading(true);

      // Criar cliente Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Atualizar o campo deleted_at para a data atual
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'archived'
        })
        .eq('id', avaliacao.id);

      if (error) {
        throw error;
      }

      alert('Avaliação movida para a lixeira com sucesso!');

      // Redirecionar para a lista de avaliações
      router.push('/avaliacao');
    } catch (err) {
      console.error('Erro ao mover avaliação para a lixeira:', err);
      alert('Ocorreu um erro ao mover a avaliação para a lixeira. Por favor, tente novamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Função para traduzir o status
  const traduzirStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Progresso';
      case 'completed': return 'Concluída';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <Link href="/avaliacao" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <FiArrowLeft className="mr-2" /> Voltar para a lista
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
            <div className="flex items-center mb-2">
              <FiAlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">Erro</h3>
            </div>
            <p>{error}</p>
          </div>
        ) : avaliacao ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Detalhes da Avaliação</h1>
              <div className="flex space-x-2">
                {avaliacao.status !== 'completed' && (
                  <button
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                  >
                    {approveLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" /> Aprovar
                      </>
                    )}
                  </button>
                )}
                <Link href={`/avaliacao/editar/${avaliacao.id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                  <FiEdit className="mr-2" /> Editar
                </Link>
                <button
                  onClick={handleMoveToTrash}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" /> Excluir
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Informações Gerais</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 font-medium">ID:</span>
                    <p className="text-gray-900">{avaliacao.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Período:</span>
                    <p className="text-gray-900">{avaliacao.periodo}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Status:</span>
                    <p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(avaliacao.status)}`}>
                        {traduzirStatus(avaliacao.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Data de Criação:</span>
                    <p className="text-gray-900">{new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {avaliacao.updated_at && (
                    <div>
                      <span className="text-gray-600 font-medium">Última Atualização:</span>
                      <p className="text-gray-900">{new Date(avaliacao.updated_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Pessoas</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 font-medium">Funcionário:</span>
                    <p className="text-gray-900">{avaliacao.funcionario?.nome || 'Desconhecido'}</p>
                  </div>
                  {avaliacao.funcionario?.cargo && (
                    <div>
                      <span className="text-gray-600 font-medium">Cargo do Funcionário:</span>
                      <p className="text-gray-900">{avaliacao.funcionario.cargo}</p>
                    </div>
                  )}
                  {avaliacao.funcionario?.departamento && (
                    <div>
                      <span className="text-gray-600 font-medium">Departamento:</span>
                      <p className="text-gray-900">{avaliacao.funcionario.departamento}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 font-medium">Avaliador:</span>
                    <p className="text-gray-900">{avaliacao.avaliador?.nome || 'Desconhecido'}</p>
                  </div>
                  {avaliacao.avaliador?.cargo && (
                    <div>
                      <span className="text-gray-600 font-medium">Cargo do Avaliador:</span>
                      <p className="text-gray-900">{avaliacao.avaliador.cargo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {avaliacao.observacoes && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Observações</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-900 whitespace-pre-line">{avaliacao.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-md">
            <div className="flex items-center mb-2">
              <FiAlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">Avaliação não encontrada</h3>
            </div>
            <p>A avaliação solicitada não foi encontrada ou pode ter sido excluída.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
