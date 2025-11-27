'use client';

import React, { useState, useEffect } from 'react';
import { FiCheck, FiEdit2, FiMessageSquare, FiUser, FiCalendar, FiStar, FiEye } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { getCriteriosPorTipoUsuario } from '@/data/criterios-avaliacao';
import { isUsuarioLider } from '@/lib/utils/lideranca';
import SeletorEstrelas, { ExibicaoEstrelas } from './SeletorEstrelas';
import type { CriterioAvaliacao } from '@/data/criterios-avaliacao';

interface AvaliacaoParaAprovacao {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_email: string;
  status: string;
  data_autoavaliacao: string;
  periodo_nome: string;
  respostas: Record<string, any>;
  comentario_gerente?: string;
}

interface InterfaceAprovacaoGerenteProps {
  gerenteId: string;
}

export default function InterfaceAprovacaoGerente({ gerenteId }: InterfaceAprovacaoGerenteProps) {
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState<AvaliacaoParaAprovacao[]>([]);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoParaAprovacao | null>(null);
  const [criterios, setCriterios] = useState<CriterioAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [comentarios, setComentarios] = useState('');
  const [notasGerente, setNotasGerente] = useState<Record<string, number>>({});
  const [modoEdicao, setModoEdicao] = useState(false);

  useEffect(() => {
    carregarAvaliacoesPendentes();
  }, [gerenteId]);

  const carregarAvaliacoesPendentes = async () => {
    try {
      setLoading(true);

      // Buscar avaliações aguardando aprovação do gerente na tabela CORRETA (avaliacoes_desempenho)
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes_desempenho')
        .select(`
          id,
          funcionario_id,
          status,
          data_autoavaliacao,
          respostas,
          comentario_avaliador,
          funcionario:users_unified!avaliacoes_desempenho_funcionario_id_fkey(first_name, last_name, email),
          periodo:periodos_avaliacao(nome)
        `)
        .eq('status', 'aguardando_aprovacao')
        .order('data_autoavaliacao', { ascending: true });

      if (error) {
        console.error('Erro ao carregar avaliações:', error);
        return;
      }

      const avaliacoesFormatadas = avaliacoes?.map(avaliacao => {
        const func = avaliacao.funcionario as any;
        const nomeCompleto = func ? `${func.first_name} ${func.last_name}` : 'Nome não encontrado';

        return {
          id: avaliacao.id,
          funcionario_id: avaliacao.funcionario_id,
          funcionario_nome: nomeCompleto,
          funcionario_email: func?.email || 'Email não encontrado',
          status: avaliacao.status,
          data_autoavaliacao: avaliacao.data_autoavaliacao,
          periodo_nome: (avaliacao.periodo as any)?.nome || 'Período não encontrado',
          respostas: avaliacao.respostas || {},
          comentario_gerente: avaliacao.comentario_avaliador
        };
      }) || [];

      setAvaliacoesPendentes(avaliacoesFormatadas);
    } catch (error) {
      console.error('Erro ao carregar avaliações pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAprovacao = async (avaliacao: AvaliacaoParaAprovacao) => {
    setAvaliacaoSelecionada(avaliacao);
    // Carregar comentário existente se houver
    setComentarios(avaliacao.comentario_gerente || avaliacao.respostas['Q15']?.comentario || '');

    // Inicializar notas do gerente com base nas respostas existentes (Q15-Q24)
    const notasIniciais: Record<string, number> = {};
    // Mapear respostas Q15-Q24 para notas
    Object.keys(avaliacao.respostas).forEach(key => {
      if (avaliacao.respostas[key]?.nota) {
        notasIniciais[key] = avaliacao.respostas[key].nota;
      }
    });
    setNotasGerente(notasIniciais);

    setModoEdicao(false);

    // Verificar se o funcionário é líder para carregar critérios corretos
    const funcionarioEhLider = await isUsuarioLider(avaliacao.funcionario_id);
    const criteriosDisponiveis = getCriteriosPorTipoUsuario(funcionarioEhLider);
    setCriterios(criteriosDisponiveis);

    setShowModal(true);
  };

  const handleAprovacao = async (aprovada: boolean) => {
    if (!avaliacaoSelecionada) return;

    try {
      setLoading(true);

      const token = document.cookie.split('; ').find(row => row.startsWith('abzToken='))?.split('=')[1];

      let url = `/api/avaliacao-desempenho/avaliacoes/${avaliacaoSelecionada.id}/approve`;
      let body: any = {
        comentario_avaliador: comentarios,
        respostas: {
          ...avaliacaoSelecionada.respostas,
          // Atualizar Q15 com o comentário
          'Q15': { ...avaliacaoSelecionada.respostas['Q15'], comentario: comentarios }
        }
      };

      // Se for devolver (não aprovada), usar endpoint de devolução ou patch
      if (!aprovada) {
        // Devolver para ajustes
        url = `/api/avaliacao/${avaliacaoSelecionada.id}`;
        body = {
          status: 'devolvida',
          comentario_gerente: comentarios
        };

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          await carregarAvaliacoesPendentes();
          setShowModal(false);
          alert('Avaliação devolvida para ajustes!');
        } else {
          const data = await response.json();
          alert(data.error || 'Erro ao devolver avaliação');
        }
        return;
      }

      // Se for aprovar
      // Adicionar notas do gerente ao body
      if (modoEdicao) {
        Object.entries(notasGerente).forEach(([key, valor]) => {
          body.respostas[key] = { ...body.respostas[key], nota: valor };
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await carregarAvaliacoesPendentes();
        setShowModal(false);
        alert('Avaliação aprovada com sucesso!');
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao processar avaliação');
      }
    } catch (error) {
      console.error('Erro ao processar avaliação:', error);
      alert('Erro ao processar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const calcularPontuacaoTotal = () => {
    const notas = Object.values(notasGerente);
    if (notas.length === 0) return 0;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  };

  const formatarData = (data: string) => {
    if (!data) return 'Data não disponível';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && avaliacoesPendentes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Avaliações Pendentes de Aprovação</h2>
        <p className="text-gray-600">
          Revise e aprove as autoavaliações enviadas pelos funcionários
        </p>
      </div>

      {/* Lista de Avaliações Pendentes */}
      {avaliacoesPendentes.length === 0 ? (
        <div className="text-center py-12">
          <FiCheck className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma avaliação pendente
          </h3>
          <p className="text-gray-600">
            Todas as avaliações foram processadas ou não há autoavaliações enviadas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {avaliacoesPendentes.map((avaliacao) => (
            <div key={avaliacao.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiUser className="text-blue-600" size={20} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {avaliacao.funcionario_nome}
                      </h3>
                      <p className="text-sm text-gray-600">{avaliacao.funcionario_email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <FiCalendar className="mr-2" size={14} />
                      <span>Período: {avaliacao.periodo_nome}</span>
                    </div>
                    <div className="flex items-center">
                      <FiCalendar className="mr-2" size={14} />
                      <span>Enviada em: {formatarData(avaliacao.data_autoavaliacao)}</span>
                    </div>
                  </div>

                  {/* Preview das respostas */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Principais resultados obtidos e metas atingidas:</h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {avaliacao.respostas['Q11']?.comentario || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => abrirModalAprovacao(avaliacao)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiEye className="mr-2" size={16} />
                    Revisar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Aprovação */}
      {showModal && avaliacaoSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Avaliação de {avaliacaoSelecionada.funcionario_nome}
                  </h3>
                  <p className="text-sm text-gray-600">{avaliacaoSelecionada.periodo_nome}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Respostas da Autoavaliação - Conforme AN-TED-002-R0 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Respostas da Autoavaliação</h4>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Questão 11: Principais resultados obtidos e metas atingidas durante o ano</h5>
                  <p className="text-gray-700">{avaliacaoSelecionada.respostas['Q11']?.comentario || 'Não respondido'}</p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Questão 12: Melhorias obtidas desde a última avaliação</h5>
                  <p className="text-gray-700">{avaliacaoSelecionada.respostas['Q12']?.comentario || 'Não respondido'}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Questão 13: Aspectos que precisam de desenvolvimento e LNT</h5>
                  <p className="text-gray-700">{avaliacaoSelecionada.respostas['Q13']?.comentario || 'Não respondido'}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Questão 14: Objetivos para o próximo ano</h5>
                  <p className="text-gray-700">{avaliacaoSelecionada.respostas['Q14']?.comentario || 'Não respondido'}</p>
                </div>
              </div>

              {/* Avaliação por Critérios (Q15-Q24) */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Avaliação por Critérios (Gerente)</h4>
                  <button
                    onClick={() => setModoEdicao(!modoEdicao)}
                    className={`flex items-center px-3 py-1 rounded-lg text-sm transition-colors ${modoEdicao
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <FiEdit2 className="mr-1" size={14} />
                    {modoEdicao ? 'Modo Edição Ativo' : 'Editar Notas'}
                  </button>
                </div>

                <div className="grid gap-4">
                  {criterios.map((criterio) => (
                    <div key={criterio.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="mb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">{criterio.nome}</h5>
                            <p className="text-sm text-gray-600 mt-1">{criterio.descricao}</p>
                            {criterio.apenas_lideres && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Critério de Liderança
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Avaliação do Gerente (modo edição ou visualização) */}
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-green-900 mb-2">Sua Avaliação (Gerente):</p>
                          {modoEdicao ? (
                            <SeletorEstrelas
                              valor={notasGerente[criterio.id] || 0}
                              onChange={(nota) => {
                                setNotasGerente(prev => ({
                                  ...prev,
                                  [criterio.id]: nota
                                }));
                              }}
                              tamanho="sm"
                              mostrarLegenda={false}
                            />
                          ) : (
                            <ExibicaoEstrelas
                              valor={notasGerente[criterio.id] || 0}
                              tamanho="sm"
                              mostrarValor={true}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {modoEdicao && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Pontuação Total Estimada:</strong> {calcularPontuacaoTotal().toFixed(2)} / 5.00
                    </p>
                  </div>
                )}
              </div>

              {/* Comentários do Gerente - Questão 15 */}
              <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
                <div className="flex items-center mb-3">
                  <FiMessageSquare className="text-orange-600 mr-2" size={20} />
                  <div>
                    <label className="block text-base font-semibold text-gray-900">
                      Questão 15: Comentários do Avaliador
                    </label>
                    <p className="text-sm text-gray-600">
                      Adicione seus comentários e observações finais sobre a avaliação
                    </p>
                  </div>
                </div>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className="w-full h-32 border border-orange-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Descreva suas observações sobre o desempenho do colaborador, feedback geral, pontos de destaque, áreas que necessitam atenção especial, etc..."
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAprovacao(false)}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  <FiEdit2 className="mr-2" size={16} />
                  Devolver para Ajustes
                </button>
                <button
                  onClick={() => handleAprovacao(true)}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <FiCheck className="mr-2" size={16} />
                  Aprovar Avaliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
