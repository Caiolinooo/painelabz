
'use client';

import React from 'react';
import { ESocialEvento, ESocialEventoStatus } from '@/types/e-social';
import { useI18n } from '@/contexts/I18nContext';
import {
  FiEye,
  FiEdit2,
  FiSend,
  FiTrash2,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown, 
  FiChevronRight
} from 'react-icons/fi';

interface EventosListProps {
  eventos: ESocialEvento[];
  loading: boolean;
  onView: (evento: ESocialEvento) => void;
  onEdit?: (evento: ESocialEvento) => void;
  onSend?: (evento: ESocialEvento) => void;
  onDelete: (evento: ESocialEvento) => void;
  onConsult?: (evento: ESocialEvento) => void;
  consultLoading?: string | null;
}

const statusStyle: Record<ESocialEventoStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-700 border-gray-200',
  pendente_revisao: 'bg-amber-100 text-amber-800 border-amber-200',
  revisao_aprovado: 'bg-green-100 text-green-800 border-green-200',
  revisao_rejeitado: 'bg-red-100 text-red-800 border-red-200',
  fila_envio: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  enviando: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
  enviado: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  processado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  erro: 'bg-rose-100 text-rose-800 border-rose-200',
  devolvido: 'bg-rose-100 text-rose-800 border-rose-200',
};

const statusI18nKey: Record<ESocialEventoStatus, string> = {
  rascunho: 'draft',
  pendente_revisao: 'pendingReview',
  revisao_aprovado: 'approved',
  revisao_rejeitado: 'rejected',
  fila_envio: 'queued',
  enviando: 'sending',
  enviado: 'sent',
  processado: 'processed',
  erro: 'error',
  devolvido: 'returned',
};

function formatarCPF(cpf?: string | null): string {
  if (!cpf) return '-';

  const clean = cpf.replace(/\D/g, '');

  if (clean.length === 11) {
    return clean.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }

  return cpf;
}

export default function EventosList({
  eventos,
  loading,
  onView,
  onEdit,
  onSend,
  onDelete,
  onConsult,
  consultLoading,
}: EventosListProps) {
  const { t } = useI18n();
 
  const [colaboradoresAbertos, setColaboradoresAbertos] = React.useState<
  Record<string, boolean>
>({});
const alternarColaborador = (cpf: string) => {
  setColaboradoresAbertos((estadoAtual) => ({
    ...estadoAtual,
    [cpf]: !estadoAtual[cpf],
  }));

};
  /*
   * Agrupa todos os eventos pelo CPF.
   * Assim, S-2200, S-2205, S-2206 etc.
   * do mesmo trabalhador ficam juntos.
   */
  const eventosAgrupados = eventos.reduce(
    (grupos, evento) => {
      const cpf =
        evento.cpf_trabalhador || `sem-cpf-${evento.id}`;

      if (!grupos[cpf]) {
        grupos[cpf] = [];
      }

      grupos[cpf].push(evento);

      return grupos;
    },
    {} as Record<string, ESocialEvento[]>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">

          {/* CABEÇALHO DA TABELA */}
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.code', 'Código')}
              </th>

              <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.name', 'Evento')}
              </th>

              <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.worker', 'Colaborador')}
              </th>

              <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.status', 'Status / Recibo')}
              </th>

              <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.createdAt', 'Data / Envio')}
              </th>

              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('eSocial.eventosList.actions', 'Ações')}
              </th>
            </tr>
          </thead>

          {/* CORPO */}
          <tbody className="bg-white divide-y divide-gray-100">

            {Object.entries(eventosAgrupados).map(
              ([cpf, eventosDoColaborador]) => {
                const primeiroEvento = eventosDoColaborador[0];

                const nomeColaborador =
                  primeiroEvento.colaborador_nome ||
                  'Colaborador não identificado';

                return (
                  <React.Fragment key={cpf}>

                    {/* CABEÇALHO DO COLABORADOR */}
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                        <button
  type="button"
  onClick={() => alternarColaborador(cpf)}
  className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-200 transition-colors"
  title={colaboradoresAbertos[cpf] ? 'Recolher eventos' : 'Expandir eventos'}
>
  {colaboradoresAbertos[cpf] ? (
    <FiChevronDown className="w-5 h-5" />
  ) : (
    <FiChevronRight className="w-5 h-5" />
  )}
</button>
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200">
                            {nomeColaborador
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="flex flex-col">

                            <span className="text-sm font-bold text-gray-900">
                              {nomeColaborador}
                            </span>

                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">

                              <span className="font-mono">
                                CPF: {formatarCPF(cpf)}
                              </span>

                              {primeiroEvento.colaborador_matricula && (
                                <span>
                                  • Mat:{' '}
                                  {primeiroEvento.colaborador_matricula}
                                </span>
                              )}

                              {primeiroEvento.colaborador_cargo && (
                                <span className="text-blue-600">
                                  •{' '}
                                  {primeiroEvento.colaborador_cargo}
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                {eventosDoColaborador.length}{' '}
                                {eventosDoColaborador.length === 1
                                  ? 'evento'
                                  : 'eventos'}
                              </span>

                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* EVENTOS DESTE COLABORADOR */}
                    {colaboradoresAbertos[cpf] && (
  <>
                     {eventosDoColaborador.map((evento) => {
                      const hasReceipt = Boolean(
                        evento.numero_recibo
                      );

                      const hasProtocol = Boolean(
                        evento.protocolo_envio
                      );

                      const isSent =
                        evento.status === 'enviado' ||
                        evento.status === 'processado';

                      return (
                        <tr
                          key={evento.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >

                          {/* CÓDIGO */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {evento.evento_codigo}
                            </span>
                          </td>

                          {/* EVENTO */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">
                                {evento.evento_nome ||
                                  evento.evento_codigo}
                              </span>

                              {evento.modulo_origem && (
                                <span className="text-[11px] text-gray-400 font-mono">
                                  Origem:{' '}
                                  <span className="text-slate-600 font-semibold">
                                    {evento.modulo_origem}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* COLABORADOR */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">

                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                                {nomeColaborador
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span
                                  className="text-sm font-semibold text-gray-900 truncate max-w-[220px]"
                                  title={nomeColaborador}
                                >
                                  {nomeColaborador}
                                </span>

                                <span className="text-xs text-gray-500 font-mono">
                                  {formatarCPF(
                                    evento.cpf_trabalhador
                                  )}
                                </span>
                              </div>

                            </div>
                          </td>

                          {/* STATUS */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">

                              <div className="flex items-center gap-1.5">

                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    statusStyle[evento.status] ||
                                    'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {evento.status ===
                                    'processado' && (
                                    <FiCheckCircle
                                      size={12}
                                      className="text-emerald-600"
                                    />
                                  )}

                                  {t(
                                    `eSocial.eventStatus.${
                                      statusI18nKey[
                                        evento.status
                                      ] || evento.status
                                    }`
                                  )}
                                </span>

                                {(evento.ultimo_erro ||
                                  (Array.isArray(
                                    evento.erros_processamento
                                  ) &&
                                    evento.erros_processamento
                                      .length > 0)) && (
                                  <FiAlertTriangle
                                    size={14}
                                    className="text-red-500 shrink-0"
                                    title="Possui erros ou rejeição"
                                  />
                                )}

                              </div>

                              {hasReceipt && (
                                <span
                                  className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate max-w-[200px]"
                                  title={`Recibo e-Social: ${evento.numero_recibo}`}
                                >
                                  Recibo:{' '}
                                  <strong>
                                    {evento.numero_recibo}
                                  </strong>
                                </span>
                              )}

                              {!hasReceipt && hasProtocol && (
                                <span
                                  className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[200px]"
                                  title={`Protocolo de Envio: ${evento.protocolo_envio}`}
                                >
                                  Prot: {evento.protocolo_envio}
                                </span>
                              )}

                            </div>
                          </td>

                          {/* DATAS */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col text-xs">

                              <span>
                                Criado:{' '}
                                {new Date(
                                  evento.created_at
                                ).toLocaleDateString()}
                              </span>

                              {evento.data_envio && (
                                <span className="text-blue-600 font-medium">
                                  Enviado:{' '}
                                  {new Date(
                                    evento.data_envio
                                  ).toLocaleDateString()}{' '}
                                  {new Date(
                                    evento.data_envio
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}

                            </div>
                          </td>

                          {/* AÇÕES */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-1.5">

                              {/* VISUALIZAR */}
                              <button
                                onClick={() => onView(evento)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title={t(
                                  'eSocial.eventosList.view',
                                  'Visualizar Evento & XML'
                                )}
                              >
                                <FiEye size={16} />
                              </button>

                              {/* EDITAR */}
                              {[
                                'pendente_revisao',
                                'erro',
                                'rascunho',
                                'devolvido',
                              ].includes(evento.status) &&
                                onEdit && (
                                  <button
                                    onClick={() =>
                                      onEdit(evento)
                                    }
                                    className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                                    title="Revisar e Auto-Corrigir"
                                  >
                                    <FiEdit2 size={16} />
                                  </button>
                                )}

                              {/* CONSULTAR */}
                              {(isSent || hasProtocol) &&
                                onConsult && (
                                  <button
                                    onClick={() =>
                                      onConsult(evento)
                                    }
                                    disabled={
                                      consultLoading === evento.id
                                    }
                                    className={`p-1.5 rounded-md transition-colors ${
                                      consultLoading === evento.id
                                        ? 'text-blue-500 animate-spin bg-blue-50'
                                        : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Consultar protocolo no e-Social"
                                  >
                                    <FiRefreshCw size={16} />
                                  </button>
                                )}

                              {/* ENVIAR */}
                              {evento.status ===
                                'revisao_aprovado' &&
                                onSend && (
                                  <button
                                    onClick={() =>
                                      onSend(evento)
                                    }
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                    title="Transmitir ao e-Social"
                                  >
                                    <FiSend size={16} />
                                  </button>
                                )}

                              {/* EXCLUIR */}
                              {[
                                'rascunho',
                                'pendente_revisao',
                                'revisao_aprovado',
                                'revisao_rejeitado',
                                'erro',
                                'devolvido',
                              ].includes(evento.status) && (
                                <button
                                  onClick={() =>
                                    onDelete(evento)
                                  }
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                  title={t(
                                    'eSocial.eventosList.delete',
                                    'Excluir'
                                  )}
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                     </>
                )}

                  </React.Fragment>
                );
              }
            )}

            {/* NENHUM EVENTO */}
            {eventos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  {t(
                    'eSocial.eventosList.noEvents',
                    'Nenhum evento encontrado'
                  )}
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
