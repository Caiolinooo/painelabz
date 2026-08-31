'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import CollaboratorModal from '@/components/gestao-tripulantes/CollaboratorModal';
import ModalAprovacaoFechamento from '@/components/gestao-tripulantes/ModalAprovacaoFechamento';
import { toast } from 'react-hot-toast';
import {
  FiUsers, FiCalendar, FiAlertTriangle, FiCheckCircle, FiFileText,
  FiSearch, FiFilter, FiDownload, FiEdit2, FiRefreshCw, FiSend,
  FiPlus, FiChevronRight, FiBriefcase, FiAnchor, FiLayers, FiShield
} from 'react-icons/fi';

interface ColaboradorItem {
  id: string;
  matricula: string | null;
  nome_completo: string;
  cpf: string;
  ativo: boolean;
  status_embarque: string;
  regime_trabalho: string | null;
  escala_embarque: number | null;
  escala_folga: number | null;
  cargo?: { nome: string } | null;
  empresa?: { nome: string } | null;
  embarcacao_atual?: { nome: string } | null;
  centro_custo?: { codigo: string; nome: string } | null;
  qtd_docs_vencidos?: number;
  qtd_docs_vencendo?: number;
}

interface AsoVencimentoItem {
  id: string;
  titulo: string;
  data_validade: string;
  colaborador?: {
    id: string;
    nome_completo: string;
    cpf: string;
    matricula: string;
    cargo?: { nome: string };
    embarcacao_atual?: { nome: string };
  };
}

export default function DepartamentoPessoalPage() {
  const { user, isLoading: authLoading } = useSupabaseAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'colaboradores' | 'fechamento' | 'asos' | 'esocial'>('colaboradores');
  const [colaboradores, setColaboradores] = useState<ColaboradorItem[]>([]);
  const [asosPendentes, setAsosPendentes] = useState<AsoVencimentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);
  const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
  const [isNotifyingAsos, setIsNotifyingAsos] = useState(false);
  const [isConsolidatingEsocial, setIsConsolidatingEsocial] = useState(false);

  // Filtros da Tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEmbarcacao, setFilterEmbarcacao] = useState('');
  const [filterCentroCusto, setFilterCentroCusto] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterEscala, setFilterEscala] = useState('');
  const [filterStatus, setFilterStatus] = useState('ativos');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resColabs, resAsos] = await Promise.all([
        fetchWithToken('/api/gestao-tripulantes/colaboradores?limit=1000'),
        fetchWithToken('/api/gestao-tripulantes/auditoria'),
      ]);

      if (resColabs.ok) {
        const json = await resColabs.json();
        setColaboradores(json.data || json.colaboradores || []);
      }

      if (resAsos.ok) {
        const json = await resAsos.json();
        const docs = json.data?.vencidos || [];
        const docsVencendo = json.data?.vencendo || [];
        setAsosPendentes([...docs, ...docsVencendo]);
      }
    } catch {
      toast.error('Erro ao carregar dados do Departamento Pessoal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Disparar Alertas de ASO
  const handleDispararAlertasAso = async () => {
    try {
      setIsNotifyingAsos(true);
      const res = await fetchWithToken('/api/gestao-tripulantes/aso/notificar-vencimentos', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || 'Alertas de ASO enviados com sucesso!');
      } else {
        toast.error(json.error || 'Erro ao disparar alertas');
      }
    } catch {
      toast.error('Erro de conexão ao disparar alertas');
    } finally {
      setIsNotifyingAsos(false);
    }
  };

  // Consolidar e-Social
  const handleConsolidarEsocial = async () => {
    try {
      setIsConsolidatingEsocial(true);
      const res = await fetchWithToken('/api/e-social/consolidar', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Eventos e-Social consolidados com sucesso!');
      } else {
        toast.error(json.error || 'Erro ao consolidar e-Social');
      }
    } catch {
      toast.error('Erro ao conectar com serviço de e-Social');
    } finally {
      setIsConsolidatingEsocial(false);
    }
  };

  // Filtros aplicados em memória
  const filteredColabs = useMemo(() => {
    return colaboradores.filter((c) => {
      if (filterStatus === 'ativos' && c.ativo === false) return false;
      if (filterStatus === 'inativos' && c.ativo !== false) return false;

      if (filterEmpresa && ((c.empresa as any)?.nome || '') !== filterEmpresa) return false;
      if (filterEmbarcacao && ((c.embarcacao_atual as any)?.nome || '') !== filterEmbarcacao) return false;
      if (filterCargo && ((c.cargo as any)?.nome || '') !== filterCargo) return false;
      if (filterEscala && (c.regime_trabalho || '') !== filterEscala) return false;

      if (filterCentroCusto) {
        const cc = (c.centro_custo as any)?.nome || '';
        const ccCod = (c.centro_custo as any)?.codigo || '';
        if (!cc.includes(filterCentroCusto) && !ccCod.includes(filterCentroCusto)) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nome = (c.nome_completo || '').toLowerCase();
        const cpf = (c.cpf || '').replace(/\D/g, '');
        const mat = (c.matricula || '').toLowerCase();
        return nome.includes(q) || cpf.includes(q.replace(/\D/g, '')) || mat.includes(q);
      }

      return true;
    });
  }, [colaboradores, filterStatus, filterEmpresa, filterEmbarcacao, filterCargo, filterEscala, filterCentroCusto, searchTerm]);

  // Opções para filtros
  const empresasOptions = useMemo(() => {
    const set = new Set<string>();
    colaboradores.forEach((c) => { if ((c.empresa as any)?.nome) set.add((c.empresa as any).nome); });
    return Array.from(set).sort();
  }, [colaboradores]);

  const embarcacoesOptions = useMemo(() => {
    const set = new Set<string>();
    colaboradores.forEach((c) => { if ((c.embarcacao_atual as any)?.nome) set.add((c.embarcacao_atual as any).nome); });
    return Array.from(set).sort();
  }, [colaboradores]);

  const cargosOptions = useMemo(() => {
    const set = new Set<string>();
    colaboradores.forEach((c) => { if ((c.cargo as any)?.nome) set.add((c.cargo as any).nome); });
    return Array.from(set).sort();
  }, [colaboradores]);

  const escalasOptions = useMemo(() => {
    const set = new Set<string>();
    colaboradores.forEach((c) => { if (c.regime_trabalho) set.add(c.regime_trabalho); });
    return Array.from(set).sort();
  }, [colaboradores]);

  if (authLoading || !user) return null;

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header do Módulo DP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-abz-blue rounded-xl">
              <FiBriefcase className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Departamento Pessoal (DP)</h1>
              <p className="text-sm text-gray-500">Gestão unificada de colaboradores, escalas de trabalho, fechamento de folha e e-Social</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDispararAlertasAso}
            disabled={isNotifyingAsos}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition shadow-xs disabled:opacity-50"
            title="Disparar notificações de ASOs vencendo por e-mail e in-app"
          >
            <FiSend className={`w-3.5 h-3.5 ${isNotifyingAsos ? 'animate-spin' : ''}`} />
            Alertas de ASO
          </button>

          <button
            onClick={handleConsolidarEsocial}
            disabled={isConsolidatingEsocial}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition shadow-xs disabled:opacity-50"
            title="Consolidar eventos S-2200, S-2220 e S-2230"
          >
            <FiShield className={`w-3.5 h-3.5 ${isConsolidatingEsocial ? 'animate-spin' : ''}`} />
            Sincronizar e-Social
          </button>

          <button
            onClick={() => setIsFechamentoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-abz-blue hover:bg-blue-700 rounded-xl transition shadow-sm"
          >
            <FiCalendar className="w-3.5 h-3.5" />
            Fechamento Mensal DP
          </button>
        </div>
      </div>

      {/* Cards de Resumo & KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500 uppercase block">Total de Colaboradores</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{colaboradores.length}</span>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {colaboradores.filter(c => c.ativo !== false).length} ativos na folha
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-amber-700 uppercase block">ASOs com Alerta</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block">{asosPendentes.length}</span>
          <span className="text-[11px] text-amber-600 font-semibold">Vencidos ou a vencer em 30d</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-blue-700 uppercase block">Escalas & Fechamento</span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">Diário</span>
          <span className="text-[11px] text-blue-600 font-semibold">Dias ON, DBA, FI e TRE</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-indigo-700 uppercase block">e-Social Integrado</span>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">Ativo</span>
          <span className="text-[11px] text-indigo-600 font-semibold">S-2200, S-2220 e S-2230</span>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 -mb-px">
          <button
            onClick={() => setActiveTab('colaboradores')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'colaboradores'
                ? 'border-abz-blue text-abz-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiUsers className="w-4 h-4" />
            Cadastros & Colaboradores DP ({filteredColabs.length})
          </button>
          <button
            onClick={() => setActiveTab('fechamento')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'fechamento'
                ? 'border-abz-blue text-abz-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiCalendar className="w-4 h-4" />
            Fechamento de Escala & Folha
          </button>
          <button
            onClick={() => setActiveTab('asos')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'asos'
                ? 'border-abz-blue text-abz-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiAlertTriangle className="w-4 h-4 text-amber-500" />
            Vencimentos de ASO ({asosPendentes.length})
          </button>
          <button
            onClick={() => router.push('/department/e-social')}
            className="pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-indigo-600 flex items-center gap-2 transition-all"
          >
            <FiShield className="w-4 h-4 text-indigo-500" />
            Painel e-Social ↗
          </button>
        </nav>
      </div>

      {/* TAB 1: Colaboradores & Cadastros DP */}
      {activeTab === 'colaboradores' && (
        <div className="space-y-4">
          {/* Filtros em Barra */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por Nome, CPF ou Matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-gray-700"
                >
                  <option value="ativos">Status: Apenas Ativos</option>
                  <option value="inativos">Status: Apenas Inativos</option>
                  <option value="todos">Status: Todos</option>
                </select>

                <select
                  value={filterEmpresa}
                  onChange={(e) => setFilterEmpresa(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-gray-700"
                >
                  <option value="">Todas Empresas</option>
                  {empresasOptions.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>

                <select
                  value={filterEmbarcacao}
                  onChange={(e) => setFilterEmbarcacao(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-gray-700"
                >
                  <option value="">Todas Embarcações</option>
                  {embarcacoesOptions.map(emb => <option key={emb} value={emb}>{emb}</option>)}
                </select>

                <select
                  value={filterEscala}
                  onChange={(e) => setFilterEscala(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-gray-700"
                >
                  <option value="">Todas Escalas</option>
                  {escalasOptions.map(esc => <option key={esc} value={esc}>{esc}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Matrícula</th>
                    <th className="px-4 py-3">Colaborador / CPF</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Centro de Custo</th>
                    <th className="px-4 py-3">Empresa / Embarcação</th>
                    <th className="px-4 py-3">Regime de Escala</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        <FiRefreshCw className="animate-spin inline w-5 h-5 mr-2 text-abz-blue" />
                        Carregando quadro de colaboradores...
                      </td>
                    </tr>
                  ) : filteredColabs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Nenhum colaborador encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredColabs.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedColaboradorId(c.id)}
                        className="hover:bg-blue-50/50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.matricula || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{c.nome_completo}</div>
                          <div className="text-[11px] font-mono text-gray-500">{c.cpf}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{c.cargo?.nome || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {c.centro_custo ? `${c.centro_custo.codigo ? `${c.centro_custo.codigo} - ` : ''}${c.centro_custo.nome}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{c.empresa?.nome || 'ABZ'}</div>
                          <div className="text-[11px] font-semibold text-abz-blue">{c.embarcacao_atual?.nome || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded font-mono font-semibold bg-gray-100 text-gray-800 text-[11px]">
                            {c.regime_trabalho || '14x14'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            c.ativo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.ativo !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColaboradorId(c.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            <FiEdit2 className="w-3 h-3" /> Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Fechamento de Escala & Folha */}
      {activeTab === 'fechamento' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Fechamento Mensal de Escalas — DP & Folha</h2>
              <p className="text-xs text-gray-500">Cômputo diário exato de Dias ON, DBA (Dobra), FI (Folga Indenizada) e TRE (Treinamento) com aprovação digital</p>
            </div>
            <button
              onClick={() => setIsFechamentoModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-abz-blue hover:bg-blue-700 rounded-xl transition shadow-xs"
            >
              Abrir Painel de Fechamento & Assinaturas
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
            <p className="font-bold text-slate-900">⚙️ Regras Contábeis do Fechamento DP:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Cômputo Diário</strong>: Cada dia no período selecionado é verificado individualmente.</li>
              <li><strong>Dobras Automáticas</strong>: Calculadas com base no regime de escala do colaborador (ex: `14x14`, `28x28`). Qualquer embarque contínuo que ultrapassar a escala regular é computado como <strong>DBA</strong>.</li>
              <li><strong>Multi-Assinaturas Obrigatórias</strong>: O e-mail oficial para o DP só é despachado quando todos os integrantes configurados realizarem a assinatura digital com hash criptográfico.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: Vencimentos de ASO */}
      {activeTab === 'asos' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Controle de Vencimentos de ASO</h2>
              <p className="text-xs text-gray-500">Atestados de Saúde Ocupacional vencidos ou com vencimento nos próximos 30 dias</p>
            </div>
            <button
              onClick={handleDispararAlertasAso}
              disabled={isNotifyingAsos}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition shadow-xs disabled:opacity-50"
            >
              <FiSend className={`w-3.5 h-3.5 ${isNotifyingAsos ? 'animate-spin' : ''}`} />
              Disparar Alertas Imediatos
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Embarcação</th>
                  <th className="px-4 py-3 text-center">Data Validade</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {asosPendentes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-emerald-700 font-medium">
                      ✓ Todos os ASOs estão em dia e conformes!
                    </td>
                  </tr>
                ) : (
                  asosPendentes.map((a, idx) => {
                    const isV = a.data_validade ? new Date(a.data_validade) < new Date() : false;
                    return (
                      <tr key={a.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-900">{a.colaborador?.nome_completo || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{a.colaborador?.cpf || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{a.colaborador?.cargo?.nome || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{a.colaborador?.embarcacao_atual?.nome || '—'}</td>
                        <td className="px-4 py-3 text-center font-bold font-mono text-gray-900">{a.data_validade || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isV ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isV ? 'VENCIDO' : 'VENCENDO'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes / Edição Completa de Colaborador */}
      {selectedColaboradorId && (
        <CollaboratorModal
          colaboradorId={selectedColaboradorId}
          onClose={() => {
            setSelectedColaboradorId(null);
            loadData();
          }}
        />
      )}

      {/* Modal de Fechamento Mensal DP */}
      {isFechamentoModalOpen && (
        <ModalAprovacaoFechamento
          isOpen={isFechamentoModalOpen}
          filters={{
            empresa: filterEmpresa || undefined,
            embarcacao: filterEmbarcacao || undefined,
            cargo: filterCargo || undefined,
            statusAtivo: (filterStatus as any) || 'ativos',
            busca: searchTerm || undefined,
          }}
          onClose={() => setIsFechamentoModalOpen(false)}
        />
      )}
    </div>
  );
}
