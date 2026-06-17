'use client';

import React, { useState } from 'react';
import { ESocialEvento } from '@/types/e-social';
import { useI18n } from '@/contexts/I18nContext';
import { FiX, FiCheck, FiXCircle, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

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

  // Matrícula Correction State
  const [matriculaCorreta, setMatriculaCorreta] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [correctSuccess, setCorrectSuccess] = useState(false);

  // Validation State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [camposPreenchidos, setCamposPreenchidos] = useState<Record<string, string>>({});
  const [savingCampos, setSavingCampos] = useState(false);

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
    setMatriculaCorreta('');
    setCorrectError(null);
    setCorrectSuccess(false);
    onClose();
  };

  const handleCorrectMatricula = async () => {
    if (!matriculaCorreta.trim()) return;
    setCorrecting(true);
    setCorrectError(null);
    try {
      const response = await fetch('/api/e-social/corrigir-matricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED***
          eventId: evento.id,
          matriculaCorreta: matriculaCorreta.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao corrigir matrícula');
      }
      setCorrectSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setCorrectError(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setCorrecting(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const response = await fetch(`/api/e-social/eventos/${evento.id}/validar`, { method: 'POST' });
      const data = await response.json();
      setValidationResult(data);
      if (data.pronto) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      setValidationResult({ pronto: false, erros: [err.message || 'Erro de conexão'] });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveCampos = async () => {
    setSavingCampos(true);
    try {
      const response = await fetch(`/api/e-social/eventos/${evento.id}/corrigir-campos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED*** campos: camposPreenchidos })
      });
      const data = await response.json();
      setValidationResult(data);
      if (data.pronto) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      setValidationResult({ pronto: false, erros: [err.message || 'Erro ao salvar campos'] });
    } finally {
      setSavingCampos(false);
    }
  };
  const errorMsg = evento.ultimo_erro || (Array.isArray(evento.erros_processamento) ? evento.erros_processamento.join('; ') : '');
  const isMatriculaError = evento.status === 'erro' && (
    errorMsg.toLowerCase().includes('não foi localizado o contrato de trabalho') ||
    errorMsg.toLowerCase().includes('contrato de trabalho não localizado') ||
    errorMsg.toLowerCase().includes('não localizado o contrato de trabalho')
  );

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
          {isMatriculaError && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <FiAlertTriangle size={18} className="text-amber-600 animate-pulse" />
                <span>Erro Crítico: Matrícula Rejeitada pelo e-Social</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                O governo retornou o erro indicando que este CPF não possui a matrícula <strong>{evento.matricula || 'enviada'}</strong> cadastrada no e-Social.
                <br /><br />
                <strong>Como resolver:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Acesse o portal do e-Social usando seu certificado.</li>
                  <li>Vá em <strong>Empregado &gt; Gestão de Empregados</strong> e filtre pelo CPF <strong>{evento.cpf_trabalhador}</strong>.</li>
                  <li>Copie o número da matrícula que consta no portal (ex: <code>17784306000189.000541</code>).</li>
                  <li>Insira o valor correto abaixo e clique em Corrigir.</li>
                </ol>
              </p>
              
              <div className="flex gap-2 items-end pt-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-800 mb-1">Matrícula Correta (do portal e-Social)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                    placeholder="Ex: 17784306000189.000541"
                    value={matriculaCorreta}
                    onChange={(e) => setMatriculaCorreta(e.target.value)}
                    disabled={correcting || correctSuccess}
                  />
                </div>
                <button
                  onClick={handleCorrectMatricula}
                  disabled={!matriculaCorreta.trim() || correcting || correctSuccess}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
                >
                  {correcting ? (
                    <FiRefreshCw className="animate-spin" />
                  ) : correctSuccess ? (
                    <FiCheck />
                  ) : null}
                  {correcting ? 'Corrigindo...' : correctSuccess ? 'Corrigido!' : 'Corrigir e Recompilar XML'}
                </button>
              </div>

              {correctError && (
                <p className="text-xs text-red-600 font-medium">{correctError}</p>
              )}
              {correctSuccess && (
                <p className="text-xs text-emerald-600 font-medium">Sucesso! A matrícula foi atualizada no colaborador, o XML foi regenerado e a página será recarregada.</p>
              )}
            </div>
          )}

          {/* UI de Validação */}
          {validationResult && (
            <div className={`p-4 rounded-lg border ${validationResult.pronto ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} space-y-3`}>
              <div className={`flex items-center gap-2 font-semibold ${validationResult.pronto ? 'text-emerald-800' : 'text-amber-800'}`}>
                {validationResult.pronto ? <FiCheck size={18} /> : <FiAlertTriangle size={18} />}
                <span>{validationResult.pronto ? 'Validação Concluída com Sucesso!' : 'Atenção Necessária'}</span>
              </div>

              {validationResult.correcoesAplicadas && validationResult.correcoesAplicadas.length > 0 && (
                <div className="text-xs text-emerald-700 bg-emerald-100/50 p-2 rounded">
                  <p className="font-semibold mb-1">Correções Automáticas Aplicadas:</p>
                  <ul className="list-disc list-inside">
                    {validationResult.correcoesAplicadas.map((c: any, i: number) => (
                      <li key={i}>{c.descricao}: <span className="line-through opacity-70">{c.de}</span> → <strong>{c.para}</strong></li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.erros && validationResult.erros.length > 0 && (
                <div className="text-xs text-red-700 bg-red-100/50 p-2 rounded">
                  <p className="font-semibold mb-1">Erros Críticos:</p>
                  <ul className="list-disc list-inside">
                    {validationResult.erros.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.camposPendentes && validationResult.camposPendentes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-200/50">
                  <p className="text-xs font-semibold text-amber-800">Preencha os campos obrigatórios pendentes:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {validationResult.camposPendentes.map((c: any) => (
                      <div key={c.campo}>
                        <label className="block text-[11px] font-medium text-amber-900 mb-1">
                          {c.label} {c.dica && <span className="text-amber-600/70 font-normal">({c.dica})</span>}
                        </label>
                        {c.tipo === 'select' ? (
                          <select
                            className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded bg-white"
                            value={camposPreenchidos[c.campo] || ''}
                            onChange={(e) => setCamposPreenchidos({ ...camposPreenchidos, [c.campo]: e.target.value })}
                          >
                            <option value="">Selecione...</option>
                            {c.opcoes?.map((o: any) => (
                              <option key={o.valor} value={o.valor}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={c.tipo === 'date' ? 'date' : 'text'}
                            className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded bg-white"
                            value={camposPreenchidos[c.campo] || ''}
                            onChange={(e) => setCamposPreenchidos({ ...camposPreenchidos, [c.campo]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveCampos}
                    disabled={savingCampos || Object.keys(camposPreenchidos).length === 0}
                    className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {savingCampos ? 'Salvando...' : 'Salvar e Revalidar'}
                  </button>
                </div>
              )}
            </div>
          )}

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
            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-abz-blue bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
            >
              <FiRefreshCw size={16} className={validating ? 'animate-spin' : ''} />
              {validating ? 'Validando...' : 'Validar Auto-Correção'}
            </button>
            
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
