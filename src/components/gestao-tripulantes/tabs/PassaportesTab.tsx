'use client';

import React, { useState } from 'react';
import { FiUpload, FiDownload, FiGlobe } from 'react-icons/fi';
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

function DaysToExpiry({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-xs text-red-600 font-semibold">Vencido há {Math.abs(diff)} dias</span>;
  if (diff <= 90) return <span className="text-xs text-orange-500 font-semibold">Vence em {diff} dias</span>;
  return <span className="text-xs text-gray-400">{new Date(dateStr).toLocaleDateString('pt-BR')}</span>;
}

export default function PassaportesTab({ colaboradorId, documentos, onRefresh }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);

  const passaportes = documentos.filter(d => d.tipo_documento === 'passaporte');

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
      fd.append('tipo_documento', 'passaporte');
      fd.append('titulo', 'Passaporte');

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

  return (
    <div className="divide-y divide-gray-100">
      {/* Upload bar */}
      <div className="p-4 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiGlobe className="text-indigo-500" />
          <span>{passaportes.length} passaporte(s) cadastrado(s)</span>
        </div>
        <label className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-700 transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <FiUpload className="w-3.5 h-3.5" />
          {uploading ? t('gestaoTripulantes.upload.uploading') : t('gestaoTripulantes.passports.uploadPassport')}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {passaportes.length === 0 ? (
        <div className="p-12 text-center">
          <FiGlobe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('gestaoTripulantes.passports.noPassports')}</p>
        </div>
      ) : (
        passaportes.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            {/* Passport icon area */}
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FiGlobe className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{doc.titulo}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-500">Nº {doc.numero_documento || '—'}</span>
                {doc.orgao_emissor && <span className="text-xs text-gray-400">• {doc.orgao_emissor}</span>}
                <span className="text-xs text-gray-400">Emissão: {formatDate(doc.data_emissao)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <DaysToExpiry dateStr={doc.data_validade} />
              <StatusBadge status={doc.status_validacao} />
              {doc.arquivo_url && (
                <a
                  href={doc.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition"
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
