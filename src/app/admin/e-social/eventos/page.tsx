'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { ESocialEvento } from '@/types/e-social';
import EventosList from '@/components/e-social/EventosList';
import EventoRevisao from '@/components/e-social/EventoRevisao';
import NovoEventoModal from '@/components/e-social/NovoEventoModal';
import { toast } from 'react-hot-toast';
import { FiPlus, FiSearch, FiRefreshCw } from 'react-icons/fi';

const PAGE_SIZE = 20;

export default function ESocialEventosPage() {
  const { isAdmin, isLoading: authLoading } = useSupabaseAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [eventos, setEventos] = useState<ESocialEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCpf, setFiltroCpf] = useState('');
  const [reviewEvento, setReviewEvento] = useState<ESocialEvento | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [consultLoading, setConsultLoading] = useState<string | null>(null);
  const [batchConsultLoading, setBatchConsultLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  const loadEventos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (filtroCodigo) params.set('codigo', filtroCodigo);
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroCpf) params.set('cpf', filtroCpf);

      const res = await fetchWithToken(`/api/e-social/eventos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data.eventos || []);
        setTotalCount(data.total || 0);

        // F12 debug logging for events with errors
        const errorEvents = (data.eventos || []).filter((e: any) => e.status === 'erro');
        if (errorEvents.length > 0) {
          console.warn('[e-Social] Eventos carregados contendo erros de processamento:', errorEvents.map((e: any) => ({
            id: e.id,
            evento: e.evento_codigo,
            cpf: e.cpf_trabalhador,
            ultimo_erro: e.ultimo_erro,
            erros_processamento: e.erros_processamento,
            retorno_completo: e.retorno_completo
          })));
        }
      } else {
        toast.error(t('eSocial.errors.loadError'));
      }
    } catch {
      toast.error(t('eSocial.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, filtroCodigo, filtroStatus, filtroCpf, t]);

  useEffect(() => {
    if (isAdmin) loadEventos();
  }, [isAdmin, loadEventos]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDelete = async (evento: ESocialEvento) => {
    if (!confirm(t('eSocial.eventosList.delete') + '?')) return;
    try {
      const res = await fetchWithToken(`/api/e-social/eventos/${evento.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Evento excluído');
        loadEventos();
      } else {
        toast.error('Erro ao excluir');
      }
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleApprove = async (eventoId: string, comentario?: string) => {
    setReviewLoading(true);
    try {
      const res = await fetchWithToken(`/api/e-social/eventos/${eventoId}/revisar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED*** aprovado: true, comentario }),
      });
      if (res.ok) {
        toast.success(t('eSocial.revisao.approved'));
        setReviewEvento(null);
        loadEventos();
      } else {
        toast.error(t('eSocial.errors.sendError'));
      }
    } catch {
      toast.error(t('eSocial.errors.sendError'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async (eventoId: string, comentario?: string) => {
    setReviewLoading(true);
    try {
      const res = await fetchWithToken(`/api/e-social/eventos/${eventoId}/revisar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED*** aprovado: false, comentario }),
      });
      if (res.ok) {
        toast.success(t('eSocial.revisao.rejected'));
        setReviewEvento(null);
        loadEventos();
      } else {
        toast.error(t('eSocial.errors.sendError'));
      }
    } catch {
      toast.error(t('eSocial.errors.sendError'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSend = async (evento: ESocialEvento, force = false) => {
    try {
      const url = `/api/e-social/eventos/${evento.id}/enviar${force ? '?force=true' : ''}`;
      const res = await fetchWithToken(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        toast.success(t('eSocial.envio.sentSuccess'));
        loadEventos();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('[e-Social] Erro ao enviar evento:', errData); // F12 debug log
        if (res.status === 400 && errData.code === 'HAS_PROTOCOL') {
          if (confirm('Este evento já possui um protocolo de envio e pode ter sido transmitido. Deseja ignorar o protocolo existente e forçar um novo envio?')) {
            handleSend(evento, true);
          }
        } else if (res.status === 409) {
          toast.error(`⚠️ ${errData.error}`);
        } else {
          toast.error(errData.error || t('eSocial.envio.sendError'));
        }
      }
    } catch {
      toast.error(t('eSocial.envio.sendError'));
    }
  };

  const handleConsult = async (evento: ESocialEvento) => {
    setConsultLoading(evento.id);
    try {
      const res = await fetchWithToken(`/api/e-social/eventos/${evento.id}/consultar`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Protocolo ${evento.protocolo_envio}: ${data.resultado?.situacao || 'desconhecida'}`);
        loadEventos();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[e-Social] Erro ao consultar protocolo:', err); // F12 debug log
        toast.error(err.error || 'Erro ao consultar protocolo');
      }
    } catch {
      toast.error('Erro ao consultar e-Social');
    } finally {
      setConsultLoading(null);
    }
  };

  const handleBatchConsult = async () => {
    setBatchConsultLoading(true);
    try {
      const res = await fetchWithToken('/api/e-social/consultar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED***}),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.atualizados} de ${data.total} eventos atualizados`);
        loadEventos();
      } else {
        toast.error('Erro ao consultar lote');
      }
    } catch {
      toast.error('Erro ao consultar lote');
    } finally {
      setBatchConsultLoading(false);
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('eSocial.eventos')}</h1>
            <p className="text-sm text-gray-500">{t('eSocial.eventosList.title')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBatchConsult}
              disabled={batchConsultLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all disabled:opacity-50"
            >
              <FiRefreshCw size={15} className={batchConsultLoading ? 'animate-spin' : ''} />
              Consultar Todos
            </button>
            <button
              onClick={() => setIsNewEventModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark"
            >
              <FiPlus size={16} />
              {t('eSocial.eventosList.newEvent')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={t('eSocial.eventosList.code')}
                value={filtroCodigo}
                onChange={(e) => { setFiltroCodigo(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="CPF"
                value={filtroCpf}
                onChange={(e) => { setFiltroCpf(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
            >
              <option value="">{t('eSocial.eventosList.status')}</option>
              <option value="rascunho">Rascunho</option>
              <option value="pendente_revisao">Pendente Revisão</option>
              <option value="fila_envio">Fila de Envio</option>
              <option value="enviado">Enviado</option>
              <option value="processado">Processado</option>
              <option value="erro">Erro</option>
            </select>
          </div>
        </div>

        <EventosList
          eventos={eventos}
          loading={loading}
          onView={(e) => setReviewEvento(e)}
          onEdit={(e) => setReviewEvento(e)}
          onSend={handleSend}
          onDelete={handleDelete}
          onConsult={handleConsult}
          consultLoading={consultLoading}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {totalCount} eventos
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {reviewEvento && (
        <EventoRevisao
          evento={reviewEvento}
          open={!!reviewEvento}
          onClose={() => setReviewEvento(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={reviewLoading}
        />
      )}

      <NovoEventoModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        onSuccess={loadEventos}
      />
    </div>
  );
}
