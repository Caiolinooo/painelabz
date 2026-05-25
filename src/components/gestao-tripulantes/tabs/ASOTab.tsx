'use client';

import React, { useState } from 'react';
import { FiUpload, FiDownload, FiSend, FiHeart, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  tipo_documento: string;
  titulo: string;
  numero_documento: string;
  orgao_emissor: string;
  data_emissao: string;
  data_validade: string;
  status_validacao: string;
  ocr_status: string;
  arquivo_url: string;
  aso_data?: {
    tipo_exame?: string;
    resultado?: string;
    data_realizacao?: string;
    medico_nome?: string;
    medico_crm?: string;
    nome_clinica?: string;
    esocial_status?: string;
  };
}

interface Props {
  colaboradorId: string;
  documentos: Document[];
  onRefresh?: () => void;
}

const TIPO_EXAME_COLORS: Record<string, string> = {
  admissional: 'bg-blue-100 text-blue-700',
  periodico: 'bg-purple-100 text-purple-700',
  demissional: 'bg-red-100 text-red-700',
  retorno: 'bg-orange-100 text-orange-700',
  mudanca_funcao: 'bg-yellow-100 text-yellow-700',
};

const RESULTADO_COLORS: Record<string, string> = {
  apto: 'bg-green-100 text-green-700',
  inapto: 'bg-red-100 text-red-700',
  apto_condicional: 'bg-yellow-100 text-yellow-700',
};

const ESOCIAL_STATUS_COLORS: Record<string, string> = {
  nao_enviado: 'text-gray-400',
  pendente_revisao: 'text-orange-500',
  aprovado: 'text-blue-600',
  enviado: 'text-green-600',
  erro: 'text-red-600',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    valido: 'bg-green-100 text-green-700',
    vencendo: 'bg-orange-100 text-orange-700',
    vencido: 'bg-red-100 text-red-700',
    pendente: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function ASOTab({ colaboradorId, documentos, onRefresh }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [runningOcr, setRunningOcr] = useState<string | null>(null);

  const asos = documentos.filter(d => d.tipo_documento === 'aso');

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('colaborador_id', colaboradorId);
      fd.append('tipo_documento', 'aso');
      fd.append('titulo', 'ASO');

      const res = await fetchWithToken('/api/gestao-tripulantes/documentos/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload falhou');
      toast.success(t('gestaoTripulantes.upload.success'));
      onRefresh?.();
    } catch {
      toast.error(t('gestaoTripulantes.upload.error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRunOCR = async (docId: string) => {
    try {
      setRunningOcr(docId);
      const res = await fetchWithToken(`/api/gestao-tripulantes/documentos/${docId}/ocr`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao processar OCR');
      }
      toast.success('Processamento OCR executado com sucesso!');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar OCR');
    } finally {
      setRunningOcr(null);
    }
  };

  const handleSendESocial = async (docId: string) => {
    try {
      setSending(docId);
      const res = await fetchWithToken(`/api/gestao-tripulantes/documentos/${docId}/esocial`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Falha ao enviar E-Social');
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Evento E-Social criado para revisão!');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || t('gestaoTripulantes.errors.saveError'));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Upload bar */}
      <div className="p-4 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiHeart className="text-red-500" />
          <span>{asos.length} ASO(s) cadastrado(s)</span>
        </div>
        <label className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg cursor-pointer hover:bg-red-700 transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <FiUpload className="w-3.5 h-3.5" />
          {uploading ? t('gestaoTripulantes.upload.uploading') : t('gestaoTripulantes.aso.uploadAso')}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {asos.length === 0 ? (
        <div className="p-12 text-center">
          <FiHeart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('gestaoTripulantes.aso.noAso')}</p>
        </div>
      ) : (
        asos.map(doc => {
          const meta = doc.aso_data || {};
          const eSocialStatus = meta.esocial_status || 'nao_enviado';
          return (
            <div key={doc.id} className="p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{doc.titulo}</p>
                    {meta.tipo_exame && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_EXAME_COLORS[meta.tipo_exame.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`gestaoTripulantes.aso.${meta.tipo_exame}`, meta.tipo_exame)}
                      </span>
                    )}
                    {meta.resultado && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULTADO_COLORS[meta.resultado.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`gestaoTripulantes.aso.${meta.resultado}`, meta.resultado)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-xs text-gray-400">Realização</p>
                      <p className="text-xs font-medium text-gray-700">{formatDate(meta.data_realizacao || doc.data_emissao)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Validade</p>
                      <p className="text-xs font-medium text-gray-700">{formatDate(doc.data_validade)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Médico</p>
                      <p className="text-xs font-medium text-gray-700">{meta.medico_nome || '—'}{meta.medico_crm ? ` (${meta.medico_crm})` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Clínica</p>
                      <p className="text-xs font-medium text-gray-700">{meta.nome_clinica || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">{t('gestaoTripulantes.aso.eSocialStatus')}:</span>
                      <span className={`text-xs font-semibold ${ESOCIAL_STATUS_COLORS[eSocialStatus] || 'text-gray-500'}`}>
                        {eSocialStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">OCR:</span>
                      <span className={`text-xs font-semibold ${
                        doc.ocr_status === 'concluido' ? 'text-green-600' :
                        doc.ocr_status === 'processando' ? 'text-blue-600 animate-pulse' :
                        doc.ocr_status === 'erro' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {(doc.ocr_status || 'pendente').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={doc.status_validacao} />

                  {doc.arquivo_url && (
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                      <FiDownload className="w-3 h-3" /> PDF
                    </a>
                  )}

                  {/* Executar OCR se pendente ou erro */}
                  {(!doc.ocr_status || doc.ocr_status === 'pendente' || doc.ocr_status === 'erro') && (
                    <button
                      onClick={() => handleRunOCR(doc.id)}
                      disabled={runningOcr === doc.id || uploading}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      {runningOcr === doc.id ? 'Processando...' : 'Executar OCR'}
                    </button>
                  )}

                  {eSocialStatus === 'nao_enviado' && doc.ocr_status === 'concluido' && (
                    <button
                      onClick={() => handleSendESocial(doc.id)}
                      disabled={sending === doc.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <FiSend className="w-3 h-3" />
                      {sending === doc.id ? 'Enviando...' : t('gestaoTripulantes.aso.sendESocial')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
