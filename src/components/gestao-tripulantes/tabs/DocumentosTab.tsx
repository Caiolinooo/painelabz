'use client';

import React, { useState } from 'react';
import { FiUpload, FiDownload, FiFile, FiAlertCircle, FiCheckCircle, FiClock, FiTrash2 } from 'react-icons/fi';
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

const STATUS_ICONS: Record<string, React.ElementType> = {
  valido: FiCheckCircle,
  vencendo: FiClock,
  vencido: FiAlertCircle,
  pendente: FiClock,
};

const STATUS_COLORS: Record<string, string> = {
  valido: 'text-green-500',
  vencendo: 'text-orange-400',
  vencido: 'text-red-500',
  pendente: 'text-yellow-500',
};

const TIPO_COLORS: Record<string, string> = {
  visto: 'bg-blue-50 border-blue-200',
  ctm: 'bg-purple-50 border-purple-200',
  habilitacao: 'bg-green-50 border-green-200',
  certificado: 'bg-yellow-50 border-yellow-200',
};

export default function DocumentosTab({ colaboradorId, documentos, onRefresh }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTipo, setNewTipo] = useState('visto');
  const [newTitulo, setNewTitulo] = useState('');

  // All docs except ASO, passaporte, treinamento
  const outros = documentos.filter(d => !['aso', 'passaporte', 'treinamento'].includes(d.tipo_documento));

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newTitulo.trim()) {
      toast.error('Informe o título do documento antes de fazer upload');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('colaborador_id', colaboradorId);
      fd.append('tipo_documento', newTipo);
      fd.append('titulo', newTitulo.trim());

      const res = await fetchWithToken('/api/gestao-tripulantes/documentos/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload falhou');
      toast.success(t('gestaoTripulantes.upload.success'));
      setNewTitulo('');
      onRefresh?.();
    } catch {
      toast.error(t('gestaoTripulantes.upload.error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(t('gestaoTripulantes.documents.confirmDelete'))) return;
    try {
      setDeletingId(docId);
      const res = await fetchWithToken(`/api/gestao-tripulantes/documentos/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      toast.success('Documento excluído');
      onRefresh?.();
    } catch {
      toast.error(t('gestaoTripulantes.errors.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Upload area */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 font-medium mb-1">Tipo do Documento</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={newTipo}
              onChange={e => setNewTipo(e.target.value)}
            >
              <option value="visto">Visto</option>
              <option value="ctm">CTM</option>
              <option value="habilitacao">Habilitação</option>
              <option value="certificado">Certificado</option>
              <option value="declaracao">Declaração</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 font-medium mb-1">Título</label>
            <input
              type="text"
              placeholder="Ex: Visto Americano"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)}
            />
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-800 transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <FiUpload className="w-3.5 h-3.5" />
            {uploading ? t('gestaoTripulantes.upload.uploading') : t('gestaoTripulantes.documents.uploadDocument')}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {outros.length === 0 ? (
        <div className="p-12 text-center">
          <FiFile className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('gestaoTripulantes.common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {outros.map(doc => {
            const StatusIcon = STATUS_ICONS[doc.status_validacao] || FiFile;
            return (
              <div
                key={doc.id}
                className={`border rounded-xl p-4 hover:shadow-md transition-shadow ${TIPO_COLORS[doc.tipo_documento] || 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{doc.tipo_documento}</span>
                  <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[doc.status_validacao] || 'text-gray-400'}`} />
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">{doc.titulo}</p>
                {doc.numero_documento && (
                  <p className="text-xs text-gray-400 mb-2">Nº {doc.numero_documento}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Validade</p>
                    <p className="text-xs font-medium text-gray-700">{formatDate(doc.data_validade)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.arquivo_url && (
                      <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition">
                        <FiDownload className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded transition disabled:opacity-50"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
