'use client';

import React, { useState } from 'react';
import { ESocialEvento } from '@/types/e-social';
import { useI18n } from '@/contexts/I18nContext';
import { FiX, FiCheck, FiXCircle } from 'react-icons/fi';

interface EventoRevisaoProps {
  evento: ESocialEvento;
  open: boolean;
  onClose: () => void;
  onApprove: (eventoId: string, comentario?: string) => void;
  onReject: (eventoId: string, comentario?: string) => void;
  loading?: boolean;
}

export default function EventoRevisao({ evento, open, onClose, onApprove, onReject, loading }: EventoRevisaoProps) {
  const { t } = useI18n();
  const [comentario, setComentario] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  if (!open) return null;

  const handleConfirm = () => {
    if (confirmAction === 'approve') {
      onApprove(evento.id, comentario || undefined);
    } else if (confirmAction === 'reject') {
      onReject(evento.id, comentario || undefined);
    }
    setConfirmAction(null);
    setComentario('');
  };

  const handleClose = () => {
    setConfirmAction(null);
    setComentario('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {t('eSocial.revisao.title')}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={22} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('eSocial.eventosList.code')}:</span>
              <p className="font-mono font-medium text-gray-800">{evento.evento_codigo}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('eSocial.eventosList.name')}:</span>
              <p className="font-medium text-gray-800">{evento.evento_nome || evento.evento_codigo}</p>
            </div>
            <div>
              <span className="text-gray-500">CPF:</span>
              <p className="font-medium text-gray-800">{evento.cpf_trabalhador || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Módulo Origem:</span>
              <p className="font-medium text-gray-800">{evento.modulo_origem || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('eSocial.eventosList.createdAt')}:</span>
              <p className="font-medium text-gray-800">{new Date(evento.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Sessão de Detalhes do Erro */}
          {(evento.status === 'erro' || evento.ultimo_erro) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-800 font-semibold">
                <FiXCircle size={18} />
                <span>Inconsistências Retornadas pelo e-Social</span>
              </div>
              
              {evento.protocolo_envio && (
                <div className="text-xs text-red-700 font-medium">
                  Protocolo de Envio: <span className="font-mono bg-red-100 px-1 py-0.5 rounded">{evento.protocolo_envio}</span>
                </div>
              )}

              {/* Erros Detalhados */}
              <div className="space-y-2">
                {Array.isArray(evento.erros_processamento) && evento.erros_processamento.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-1.5 pl-1">
                    {evento.erros_processamento.map((err: string, idx: number) => (
                      <li key={idx} className="leading-relaxed whitespace-pre-line">
                        {err}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-red-700 whitespace-pre-line leading-relaxed">
                    {evento.ultimo_erro || 'Erro desconhecido no processamento do lote.'}
                  </p>
                )}
              </div>

              {/* Retorno XML do Governo (Colapsável) */}
              {evento.retorno_completo?.xmlRetorno && (
                <div className="pt-2 border-t border-red-200/50">
                  <details className="group">
                    <summary className="text-xs font-medium text-red-800 cursor-pointer hover:underline list-none flex items-center justify-between">
                      <span>Exibir Retorno XML Completo do Governo</span>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <pre className="mt-2 bg-white/85 border border-red-100 rounded-md p-3 text-[10px] font-mono text-gray-700 max-h-60 overflow-auto whitespace-pre-wrap">
                      {evento.retorno_completo.xmlRetorno}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {evento.xml_gerado && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">XML</h3>
              <pre className="bg-gray-50 border rounded-lg p-3 text-xs font-mono text-gray-700 max-h-60 overflow-auto whitespace-pre-wrap">
                {evento.xml_gerado}
              </pre>
            </div>
          )}

          {evento.dados_evento && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dados do Evento</h3>
              <pre className="bg-gray-50 border rounded-lg p-3 text-xs font-mono text-gray-700 max-h-40 overflow-auto">
                {JSON.stringify(evento.dados_evento, null, 2)}
              </pre>
            </div>
          )}

          {confirmAction && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {confirmAction === 'approve'
                  ? t('eSocial.revisao.approveConfirm')
                  : t('eSocial.revisao.rejectConfirm')}
              </p>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
                rows={3}
                placeholder={t('eSocial.revisao.commentPlaceholder')}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm text-white rounded-md disabled:opacity-50 ${
                    confirmAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? '...' : confirmAction === 'approve' ? t('eSocial.revisao.approve') : t('eSocial.revisao.reject')}
                </button>
              </div>
            </div>
          )}
        </div>

        {!confirmAction && (
          <div className="p-5 border-t flex justify-end gap-3">
            {['pendente_revisao', 'erro', 'rascunho', 'revisao_rejeitado'].includes(evento.status) ? (
              <>
                <button
                  onClick={() => setConfirmAction('reject')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  <FiXCircle size={16} />
                  {t('eSocial.revisao.reject')}
                </button>
                <button
                  onClick={() => setConfirmAction('approve')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                >
                  <FiCheck size={16} />
                  {t('eSocial.revisao.approve')}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
