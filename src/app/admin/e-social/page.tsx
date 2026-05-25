'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { ESocialDashboardResumo, ESocialEvento } from '@/types/e-social';
import DashboardESocial from '@/components/e-social/DashboardESocial';
import EventosList from '@/components/e-social/EventosList';
import EventoRevisao from '@/components/e-social/EventoRevisao';
import { toast } from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';

export default function ESocialDashboardPage() {
  const { isAdmin, isLoading: authLoading } = useSupabaseAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [resumo, setResumo] = useState<ESocialDashboardResumo | null>(null);
  const [recentes, setRecentes] = useState<ESocialEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewEvento, setViewEvento] = useState<ESocialEvento | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithToken('/api/e-social/eventos?limit=10');
      if (res.ok) {
        const data = await res.json();
        setResumo(data.resumo || null);
        setRecentes(data.eventos || []);
      } else {
        toast.error(t('eSocial.errors.loadError'));
      }
    } catch {
      toast.error(t('eSocial.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  if (authLoading || !isAdmin) return null;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('eSocial.title')}</h1>
            <p className="text-sm text-gray-500">{t('eSocial.subtitle')}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border rounded-md hover:bg-gray-50"
          >
            <FiRefreshCw size={15} />
            Atualizar
          </button>
        </div>

        <DashboardESocial data={resumo} loading={loading} />

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('eSocial.eventosList.title')}</h2>
          <EventosList
            eventos={recentes}
            loading={loading}
            onView={(e) => setViewEvento(e)}
            onDelete={async (e) => {
              if (!confirm('Excluir evento?')) return;
              try {
                const res = await fetchWithToken(`/api/e-social/eventos?id=${e.id}`, { method: 'DELETE' });
                if (res.ok) {
                  toast.success('Evento excluído');
                  loadData();
                }
              } catch {
                toast.error('Erro ao excluir');
              }
            }}
          />
        </div>
      </div>

      {viewEvento && (
        <EventoRevisao
          evento={viewEvento}
          open={!!viewEvento}
          onClose={() => setViewEvento(null)}
          onApprove={() => {}}
          onReject={() => {}}
        />
      )}
    </div>
  );
}
