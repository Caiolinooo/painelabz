'use client';

import React, { useState } from 'react';
import { FiUpload, FiDownload, FiAlertCircle, FiCheckCircle, FiClock, FiBookOpen } from 'react-icons/fi';
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
}

interface Props {
  colaboradorId: string;
  documentos: Document[];
  onRefresh?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    valido: { cls: 'bg-green-100 text-green-700', icon: FiCheckCircle },
    vencendo: { cls: 'bg-orange-100 text-orange-700', icon: FiClock },
    vencido: { cls: 'bg-red-100 text-red-700', icon: FiAlertCircle },
    pendente: { cls: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  };
  const cfg = map[status] || { cls: 'bg-gray-100 text-gray-500', icon: FiClock };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

function DaysToExpiry({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-xs text-red-600 font-semibold">Vencido há {Math.abs(diff)} dias</span>;
  if (diff <= 30) return <span className="text-xs text-orange-500 font-semibold">Vence em {diff} dias</span>;
  return <span className="text-xs text-gray-400">{new Date(dateStr).toLocaleDateString('pt-BR')}</span>;
}

export default function TreinamentosTab({ colaboradorId, documentos, onRefresh }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [runningOcr, setRunningOcr] = useState<string | null>(null);

  const treinamentos = documentos.filter(d => d.tipo_documento === 'treinamento');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('colaborador_id', colaboradorId);
      fd.append('tipo_documento', 'treinamento');
      fd.append('titulo', file.name.replace(/\.[^.]+$/, ''));

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

  const handleRunOcr = async (docId: string) => {
    try {
      setRunningOcr(docId);
      const res = await fetchWithToken(`/api/gestao-tripulantes/documentos/${docId}/ocr`, { method: 'POST' });
      if (!res.ok) throw new Error('OCR falhou');
      toast.success(t('gestaoTripulantes.ocr.completed'));
      onRefresh?.();
    } catch {
      toast.error(t('gestaoTripulantes.ocr.error'));
    } finally {
      setRunningOcr(null);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Upload bar */}
      <div className="p-4 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiBookOpen className="text-blue-500" />
          <span>{treinamentos.length} {t('gestaoTripulantes.trainings.title').toLowerCase()} cadastrado(s)</span>
        </div>
        <label className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <FiUpload className="w-3.5 h-3.5" />
          {uploading ? t('gestaoTripulantes.upload.uploading') : t('gestaoTripulantes.trainings.uploadCertificate')}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {treinamentos.length === 0 ? (
        <div className="p-12 text-center">
          <FiBookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('gestaoTripulantes.trainings.noTrainings')}</p>
        </div>
      ) : (
        treinamentos.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{doc.titulo}</p>
              <div className="flex items-center gap-3 mt-1">
                {doc.numero_documento && <span className="text-xs text-gray-400">Nº {doc.numero_documento}</span>}
                {doc.orgao_emissor && <span className="text-xs text-gray-400">• {doc.orgao_emissor}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <DaysToExpiry dateStr={doc.data_validade} />
              <StatusBadge status={doc.status_validacao} />
              {doc.arquivo_url && doc.ocr_status !== 'nao_aplicavel' && (
                <button
                  onClick={() => handleRunOcr(doc.id)}
                  disabled={runningOcr === doc.id || doc.ocr_status === 'processando'}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {runningOcr === doc.id ? 'OCR...' : t('gestaoTripulantes.ocr.runOcr')}
                </button>
              )}
              {doc.arquivo_url && (
                <a
                  href={doc.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                >
                  <FiDownload className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
