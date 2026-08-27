'use client';

import React from 'react';
import { ESocialEvento, ESocialEventoStatus } from '@/types/e-social';
import { useI18n } from '@/contexts/I18nContext';
import { FiEye, FiEdit2, FiSend, FiTrash2, FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

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
  rascunho: 'bg-gray-100 text-gray-700',
  pendente_revisao: 'bg-amber-100 text-amber-800',
  revisao_aprovado: 'bg-green-100 text-green-800',
  revisao_rejeitado: 'bg-red-100 text-red-800',
  fila_envio: 'bg-indigo-100 text-indigo-800',
  enviando: 'bg-blue-100 text-blue-800',
  enviado: 'bg-cyan-100 text-cyan-800',
  processado: 'bg-emerald-100 text-emerald-800',
  erro: 'bg-red-100 text-red-800',
  devolvido: 'bg-rose-100 text-rose-800',
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
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

export default function EventosList({ eventos, loading, onView, onEdit, onSend, onDelete, onConsult, consultLoading }: EventosListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.code')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.worker')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.createdAt')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('eSocial.eventosList.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {eventos.map((evento) => (
              <tr key={evento.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-bold text-slate-800">
                  {evento.evento_codigo}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {evento.evento_nome || evento.evento_codigo}
                    </span>
                    {evento.modulo_origem && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        Origem: <span className="text-slate-600 font-semibold">{evento.modulo_origem}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200 shadow-xs">
                      {(evento.colaborador_nome || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate max-w-[220px]" title={evento.colaborador_nome || 'Colaborador'}>
                        {evento.colaborador_nome || 'Colaborador não identificado'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <span>{formatarCPF(evento.cpf_trabalhador)}</span>
                        {evento.colaborador_matricula && (
                          <span className="text-gray-400 font-sans">• Mat: {evento.colaborador_matricula}</span>
                        )}
                        {evento.colaborador_cargo && (
                          <span className="text-blue-600 font-sans truncate max-w-[120px]" title={evento.colaborador_cargo}>• {evento.colaborador_cargo}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[evento.status] || 'bg-gray-100 text-gray-700'}`}>
                      {t(`eSocial.eventStatus.${statusI18nKey[evento.status] || evento.status}`)}
                    </span>
                    {(evento.ultimo_erro || evento.erros_processamento) && (
                      <FiAlertTriangle size={14} className="text-red-500" title="Possui erros pendentes" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {new Date(evento.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(evento)}
                      className="p-1.5 text-gray-400 hover:text-abz-blue transition-colors"
                      title={t('eSocial.eventosList.view')}
                    >
                      <FiEye size={16} />
                    </button>
                    {evento.status === 'pendente_revisao' && onEdit && (
                      <button
                        onClick={() => onEdit(evento)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Revisar"
                      >
                        <FiEdit2 size={16} />
                      </button>
                    )}
                    {evento.status === 'erro' && onEdit && (
                      <button
                        onClick={() => onEdit(evento)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Revisar (recuperar de erro)"
                      >
                        <FiEdit2 size={16} />
                      </button>
                    )}
                    {(evento.status === 'enviado' || evento.status === 'processado' || !!evento.protocolo_envio) && onConsult && (
                      <button
                        onClick={() => onConsult(evento)}
                        disabled={consultLoading === evento.id}
                        className={`p-1.5 transition-colors ${consultLoading === evento.id ? 'text-blue-400 animate-spin' : 'text-gray-400 hover:text-blue-600'}`}
                        title="Consultar protocolo no e-Social"
                      >
                        <FiRefreshCw size={16} />
                      </button>
                    )}
                    {evento.status === 'revisao_aprovado' && onSend && (
                      <button
                        onClick={() => onSend(evento)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Enviar"
                      >
                        <FiSend size={16} />
                      </button>
                    )}
                    {['rascunho', 'pendente_revisao', 'revisao_aprovado', 'revisao_rejeitado', 'erro', 'devolvido'].includes(evento.status) && (
                      <button
                        onClick={() => onDelete(evento)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title={t('eSocial.eventosList.delete')}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  {t('eSocial.eventosList.noEvents')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
