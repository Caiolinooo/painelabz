'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import MainLayout from '@/components/Layout/MainLayout';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';

// Tipo para avaliação
interface Avaliacao {
  id: string;
  funcionario_id: string;
  avaliador_id: string;
  periodo: string;
  status: string;
  created_at: string;
  updated_at?: string;
  funcionario_nome?: string;
  funcionario_email?: string;
  avaliador_nome?: string;
  avaliador_email?: string;
}

export default function AvaliacaoPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null); // ID da avaliação sendo excluída
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null); // Mensagem de sucesso

  useEffect(() => {
    const fetchAvaliacoes = async () => {
      try {
        setLoading(true);

        // Criar cliente Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar avaliações diretamente da tabela avaliacoes
        let data;
        let error = null;

        console.log('Buscando avaliações...');

        try {
          // Primeiro tentamos buscar usando a view vw_avaliacoes_desempenho
          const { data: avaliacoesView, error: avaliacoesViewError } = await supabase
            .from('vw_avaliacoes_desempenho')
            .select('*')
            .order('created_at', { ascending: false });

          if (!avaliacoesViewError && avaliacoesView && avaliacoesView.length > 0) {
            console.log('Avaliações encontradas na view:', avaliacoesView.length);
            data = avaliacoesView;
          } else {
            console.log('Erro ou nenhuma avaliação encontrada na view, tentando tabela direta...');

            // Se falhar, tentamos com a tabela direta
            const { data: avaliacoes, error: avaliacoesError } = await supabase
              .from('avaliacoes')
              .select(`
                *,
                funcionario:funcionario_id(id, nome, email),
                avaliador:avaliador_id(id, nome, email)
              `)
              .is('deleted_at', null)  // Apenas avaliações não excluídas
              .order('created_at', { ascending: false });

            if (avaliacoesError) {
              console.error('Erro ao buscar na tabela avaliacoes:', avaliacoesError);
              throw avaliacoesError;
            }

            console.log('Avaliações encontradas na tabela:', avaliacoes.length);
            data = avaliacoes;
          }
        } catch (err) {
          console.error('Erro ao buscar avaliações:', err);

          // Última tentativa: buscar diretamente com uma consulta simples
          try {
            console.log('Tentando consulta simples...');
            const { data: avaliacoesSimples, error: avaliacoesSimplesError } = await supabase
              .from('avaliacoes')
              .select('*')
              .limit(10);

            if (avaliacoesSimplesError) {
              console.error('Erro na consulta simples:', avaliacoesSimplesError);
              throw avaliacoesSimplesError;
            }

            console.log('Avaliações encontradas na consulta simples:', avaliacoesSimples.length);

            // Se encontrou avaliações, mas não temos dados de funcionários,
            // vamos buscar os funcionários separadamente
            if (avaliacoesSimples.length > 0) {
              const funcionarioIds = [...new Set(avaliacoesSimples.map(a => a.funcionario_id))];
              const avaliadorIds = [...new Set(avaliacoesSimples.map(a => a.avaliador_id))];
              const allIds = [...new Set([...funcionarioIds, ...avaliadorIds])];

              const { data: funcionarios, error: funcionariosError } = await supabase
                .from('funcionarios')
                .select('id, nome, email')
                .in('id', allIds);

              if (funcionariosError) {
                console.error('Erro ao buscar funcionários:', funcionariosError);
              }

              // Mapear funcionários por ID
              const funcionariosMap = {};
              if (funcionarios) {
                funcionarios.forEach(f => {
                  funcionariosMap[f.id] = f;
                });
              }

              // Adicionar dados de funcionários às avaliações
              data = avaliacoesSimples.map(a => ({
                ...a,
                funcionario: funcionariosMap[a.funcionario_id] || null,
                avaliador: funcionariosMap[a.avaliador_id] || null
              }));
            } else {
              data = avaliacoesSimples;
            }
          } catch (finalErr) {
            console.error('Erro final ao buscar avaliações:', finalErr);
            throw finalErr;
          }
        }

        if (error) {
          throw error;
        }

        // Formatar dados de forma simples
        console.log('Formatando dados, total de avaliações:', data?.length || 0);

        // Verificar se temos dados
        if (!data || data.length === 0) {
          console.log('Nenhuma avaliação encontrada para formatar');
          setAvaliacoes([]);
          setLoading(false);
          return;
        }

        // Log para debug
        console.log('Exemplo de avaliação:', data[0]);

        const avaliacoesFormatadas = data.map(item => {
          // Obter nomes do funcionário e avaliador
          let funcionarioNome = 'Desconhecido';
          let avaliadorNome = 'Desconhecido';
          let funcionarioEmail = null;
          let avaliadorEmail = null;

          // Verificar se temos dados do funcionário
          if (item.funcionario) {
            funcionarioNome = item.funcionario.nome || 'Desconhecido';
            funcionarioEmail = item.funcionario.email || null;
          } else if (item.funcionario_nome) {
            // Se estamos usando a view
            funcionarioNome = item.funcionario_nome || 'Desconhecido';
            funcionarioEmail = item.funcionario_email || null;
          }

          // Verificar se temos dados do avaliador
          if (item.avaliador) {
            avaliadorNome = item.avaliador.nome || 'Desconhecido';
            avaliadorEmail = item.avaliador.email || null;
          } else if (item.avaliador_nome) {
            // Se estamos usando a view
            avaliadorNome = item.avaliador_nome || 'Desconhecido';
            avaliadorEmail = item.avaliador_email || null;
          }

          // Determinar a data de criação
          const dataCriacao = item.data_criacao || item.created_at || new Date().toISOString();

          return {
            id: item.id,
            funcionario_id: item.funcionario_id,
            avaliador_id: item.avaliador_id,
            periodo: item.periodo || 'N/A',
            status: item.status || 'pendente',
            created_at: dataCriacao,
            updated_at: item.data_atualizacao || item.updated_at,
            funcionario_nome: funcionarioNome,
            funcionario_email: funcionarioEmail,
            avaliador_nome: avaliadorNome,
            avaliador_email: avaliadorEmail
          };
        });

        setAvaliacoes(avaliacoesFormatadas);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar avaliações:', err);

        // Mostrar informações mais detalhadas sobre o erro
        let errorMessage = 'Ocorreu um erro ao carregar as avaliações. Por favor, tente novamente.';

        if (err instanceof Error) {
          errorMessage += ' Detalhes: ' + err.message;

          // Adicionar informações sobre o stack trace
          if (err.stack) {
            console.error('Stack trace:', err.stack);
          }
        } else if (typeof err === 'object' && err !== null) {
          // Para erros do Supabase que podem não ser instâncias de Error
          errorMessage += ' Detalhes: ' + JSON.stringify(err);
        }

        // Verificar se há problemas com a conexão ao Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || supabaseUrl === '') {
          errorMessage += ' NEXT_PUBLIC_SUPABASE_URL não está definido.';
        }

        if (!supabaseKey || supabaseKey === '') {
          errorMessage += ' NEXT_PUBLIC_SUPABASE_ANON_KEY não está definido.';
        }

        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchAvaliacoes();
  }, []);

  // Filtrar avaliações com base no termo de pesquisa
  const filteredAvaliacoes = avaliacoes.filter(avaliacao =>
    avaliacao.avaliador_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    avaliacao.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    avaliacao.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    avaliacao.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para traduzir o status usando o sistema de tradução
  const { t } = useI18n();
  const traduzirStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return t('avaliacao.status.pending', 'Pendente');
      case 'in_progress': return t('avaliacao.status.inProgress', 'Em Progresso');
      case 'completed': return t('avaliacao.status.completed', 'Concluída');
      case 'archived': return t('avaliacao.status.archived', 'Arquivada');
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

  // Função para mover uma avaliação para a lixeira
  const handleMoveToTrash = async (id: string) => {
    if (!confirm(t('avaliacao.confirmMoveToTrash', 'Tem certeza que deseja mover esta avaliação para a lixeira? Ela será excluída permanentemente após 30 dias.'))) {
      return;
    }

    try {
      setDeleteLoading(id);

      // Criar cliente Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Atualizar o campo deleted_at para a data atual
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'archived' // Também marcar como arquivada
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Atualizar a lista de avaliações (remover a avaliação excluída)
      setAvaliacoes(prev => prev.filter(avaliacao => avaliacao.id !== id));

      // Mostrar mensagem de sucesso
      setDeleteSuccess(t('avaliacao.movedToTrashSuccess', 'Avaliação movida para a lixeira com sucesso!'));

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Erro ao mover avaliação para a lixeira:', err);
      alert(t('avaliacao.moveToTrashError', 'Ocorreu um erro ao mover a avaliação para a lixeira. Por favor, tente novamente.'));
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('avaliacao.avaliacoes.title', 'Lista de Avaliações')}</h1>
          <div className="flex space-x-2">
            <Link href="/avaliacao/lixeira" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center">
              <FiTrash2 className="mr-2" /> {t('avaliacao.trashLink', 'Lixeira')}
            </Link>
            <Link href="/avaliacao/nova" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
              <FiPlus className="mr-2" /> {t('avaliacao.novaAvaliacao', 'Nova Avaliação')}
            </Link>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {deleteSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-6">
            <p>{deleteSuccess}</p>
          </div>
        )}

        {/* Barra de pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('avaliacao.searchPlaceholder', 'Pesquisar avaliações...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
            <div className="flex items-center mb-2">
              <FiAlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">{t('common.error', 'Erro')}</h3>
            </div>
            <p>{error}</p>
          </div>
        ) : filteredAvaliacoes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 p-6 rounded-md text-center">
            <p className="text-lg">{t('avaliacao.noAvaliacoes', 'Nenhuma avaliação encontrada.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.avaliador', 'Avaliador')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.funcionario', 'Funcionário')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.periodo', 'Período')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.status.title', 'Status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.createdAt', 'Data de Criação')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('avaliacao.actions', 'Ações')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAvaliacoes.map((avaliacao) => (
                  <tr key={avaliacao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{avaliacao.avaliador_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{avaliacao.funcionario_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{avaliacao.periodo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(avaliacao.status)}`}>
                        {traduzirStatus(avaliacao.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/avaliacao/ver/${avaliacao.id}?source=list`} className="text-blue-600 hover:text-blue-900" title="Visualizar">
                          <FiEye className="h-5 w-5" />
                        </Link>
                        <Link href={`/avaliacao/editar/${avaliacao.id}?source=list`} className="text-green-600 hover:text-green-900" title="Editar">
                          <FiEdit className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleMoveToTrash(avaliacao.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Mover para a lixeira"
                          disabled={deleteLoading === avaliacao.id}
                        >
                          {deleteLoading === avaliacao.id ? (
                            <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-red-600 rounded-full"></div>
                          ) : (
                            <FiTrash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
