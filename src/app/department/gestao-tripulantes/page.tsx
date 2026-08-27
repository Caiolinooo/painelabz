'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useI18n } from '@/contexts/I18nContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import DashboardCards from '@/components/gestao-tripulantes/DashboardCards';
import GTMatrixFilters from '@/components/gestao-tripulantes/GTMatrixFilters';
import GTMatrix from '@/components/gestao-tripulantes/GTMatrix';
import GTMatrixLegend from '@/components/gestao-tripulantes/GTMatrixLegend';
import CollaboratorModal from '@/components/gestao-tripulantes/CollaboratorModal';
import AsoReviewPanel from '@/components/gestao-tripulantes/AsoReviewPanel';

const GTManScheduleTab = dynamic(
  () => import('@/components/gestao-tripulantes/GTManScheduleTab'),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-64 bg-gray-100 rounded-xl" aria-hidden="true" />
    ),
  }
);

interface DashboardData {
  total_colaboradores: number;
  total_embarcados: number;
  total_disponiveis: number;
  total_docs_vencidos: number;
  total_docs_vencendo: number;
  asos_pendentes_revisao: number;
}

interface Collaborator {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  matricula: string;
  foto_url: string;
  cargo_nome: string;
  empresa_nome: string;
  embarcacao_nome: string;
  centro_custo_nome: string;
  status_embarque: string;
  standby: boolean;
  data_proximo_embarque: string;
  qtd_docs_vencidos: number;
  qtd_docs_vencendo: number;
  qtd_docs_validos: number;
}

interface FiltersState {
  search: string;
  empresa: string;
  embarcacao: string;
  cargo: string;
  centro_custo: string;
  status: string;
  apenasStandby: boolean;
  docsVencidos: boolean;
}

export default function GestaoTripulantesPage() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<'matrix' | 'schedule'>('matrix');
  const [scheduleMounted, setScheduleMounted] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [colaboradores, setColaboradores] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColaborador, setSelectedColaborador] = useState<Collaborator | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    search: '', empresa: '', embarcacao: '', cargo: '', centro_custo: '', status: '',
    apenasStandby: false, docsVencidos: false
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetchWithToken('/api/gestao-tripulantes/dashboard');
      if (!res.ok) throw new Error('Erro ao carregar dashboard');
      const json = await res.json();
      setDashboard(json.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchColaboradores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.empresa) params.set('empresa', filters.empresa);
      if (filters.embarcacao) params.set('embarcacao', filters.embarcacao);
      if (filters.cargo) params.set('cargo', filters.cargo);
      if (filters.centro_custo) params.set('centro_custo', filters.centro_custo);
      if (filters.status) params.set('status', filters.status);
      if (filters.apenasStandby) params.set('standby', 'true');
      if (filters.docsVencidos) params.set('onlyVencidos', 'true');
      params.set('limit', '100');

      const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar colaboradores');
      const json = await res.json();
      setColaboradores(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user, fetchDashboard]);

  useEffect(() => {
    if (!user) return;
    const delay = filters.search ? 300 : 0;
    const timer = setTimeout(() => {
      fetchColaboradores();
    }, delay);
    return () => clearTimeout(timer);
  }, [user, filters, fetchColaboradores]);

  const handleFilterChange = useCallback((partial: Partial<FiltersState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const handleRowClick = useCallback((colaborador: Collaborator) => {
    setSelectedColaborador(colaborador);
    setShowModal(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{t('gestaoTripulantes.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('gestaoTripulantes.subtitle')}</p>
        </div>
        <a href="/department/gestao-tripulantes/novo"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm font-semibold self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Novo Colaborador
        </a>
      </div>

      {/* Tabs Seletor */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 -mb-px">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Matriz de Conformidade
          </button>
          <button
            onClick={() => {
              setActiveTab('schedule');
              setScheduleMounted(true);
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Man Schedule (Escala MIO)
          </button>
        </nav>
      </div>

      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <AsoReviewPanel compact />
          <DashboardCards data={dashboard} />
          <GTMatrixFilters filters={filters} onChange={handleFilterChange} colaboradores={colaboradores} />
          <GTMatrix
            colaboradores={colaboradores}
            loading={loading}
            onRowClick={handleRowClick}
          />
          <GTMatrixLegend />
        </div>
      )}

      {scheduleMounted && (
        <div className={activeTab === 'schedule' ? 'pt-2' : 'hidden'}>
          <GTManScheduleTab onColabClick={handleRowClick} />
        </div>
      )}

      {showModal && selectedColaborador && (
        <CollaboratorModal
          colaboradorId={selectedColaborador.id}
          onClose={() => { setShowModal(false); setSelectedColaborador(null); }}
        />
      )}
    </div>
  );
}
