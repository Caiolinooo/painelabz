'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiUser, FiBookOpen, FiHeart, FiFileText, FiAnchor, FiRepeat, FiUpload, FiBell, FiRefreshCw, FiLayers, FiShield
} from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { QHSE_MODULE_KEY } from '@/lib/document-catalog/permissions';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';
import { enviarOcrDocumento } from '@/components/gestao-tripulantes/ocr-client';
import SugestaoBackModal from './SugestaoBackModal';
import DadosPessoaisTab from './tabs/DadosPessoaisTab';
import TreinamentosTab from './tabs/TreinamentosTab';
import ASOTab from './tabs/ASOTab';
import PassaportesTab from './tabs/PassaportesTab';
import DocumentosTab from './tabs/DocumentosTab';
import QhseTab from './tabs/QhseTab';
import HistoricoEmbarquesTab from './tabs/HistoricoEmbarquesTab';
import SubstituicoesTab from './tabs/SubstituicoesTab';
import FichaUnificadaTab from './tabs/FichaUnificadaTab';
import type { DocumentoAlertaUI } from './DocsAlertasPanel';

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
  aso_data?: any;
}

interface Embarkation {
  id: string;
  embarcacao_nome: string;
  tipo: string;
  data_embarque: string;
  data_desembarque: string;
  data_prevista_desembarque: string;
  local_embarque: string;
  local_desembarque: string;
  voo_ida: string;
  voo_volta: string;
  observacoes: string;
  substituindo_id: string;
}

interface Substitution {
  id: string;
  substituto_nome: string;
  substituido_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  cargo_nome: string;
  embarcacao_nome: string;
}

interface CollaboratorDetail {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  nacionalidade: string;
  naturalidade: string;
  nome_mae: string;
  nome_pai: string;
  estado_civil: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  matricula: string;
  cargo_id?: string | null;
  cargo_nome: string;
  empresa_id?: string | null;
  empresa_nome: string;
  embarcacao_atual_id?: string | null;
  embarcacao_nome: string;
  centro_custo_id?: string | null;
  centro_custo_nome: string;
  status_embarque: string;
  standby: boolean;
  regime_trabalho?: string | null;
  escala_embarque?: number | string | null;
  escala_folga?: number | string | null;
  data_admissao: string;
  data_ultimo_embarque?: string | null;
  data_ultimo_desembarque?: string | null;
  data_proximo_embarque: string;
  foto_url: string;
  qtd_docs_vencidos: number;
  qtd_docs_vencendo: number;
  documentos: Document[];
  documentos_alertas?: DocumentoAlertaUI[];
  embarques: Embarkation[];
  substituicoes: Substitution[];
}

export type TabKey = 'dados' | 'ficha' | 'treinamentos' | 'aso' | 'passaportes' | 'documentos' | 'qhse' | 'embarques' | 'substituicoes';

interface CollaboratorModalProps {
  colaboradorId: string;
  onClose: () => void;
  initialTab?: TabKey;
  highlightDocId?: string | null;
}

const TABS: { key: TabKey; label: string; labelKey?: string; icon: React.ElementType }[] = [
  { key: 'dados', labelKey: 'gestaoTripulantes.profile.personalData', label: 'Dados', icon: FiUser },
  { key: 'ficha', label: 'Ficha unificada', icon: FiLayers },
  { key: 'treinamentos', labelKey: 'gestaoTripulantes.profile.trainings', label: 'Treinamentos', icon: FiBookOpen },
  { key: 'aso', labelKey: 'gestaoTripulantes.profile.aso', label: 'ASO', icon: FiHeart },
  { key: 'passaportes', labelKey: 'gestaoTripulantes.profile.passports', label: 'Passaportes', icon: FiFileText },
  { key: 'documentos', labelKey: 'gestaoTripulantes.profile.documents', label: 'Documentos', icon: FiFileText },
  { key: 'qhse', labelKey: 'gestaoTripulantes.profile.qhse', label: 'QHSE / EPI', icon: FiShield },
  { key: 'embarques', labelKey: 'gestaoTripulantes.profile.embarkations', label: 'Embarques', icon: FiAnchor },
  { key: 'substituicoes', labelKey: 'gestaoTripulantes.profile.substitutions', label: 'Substituições', icon: FiRepeat },
];

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" />
      ))}
    </div>
  );
}

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.error('CollaboratorModal tab crash', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-sm text-red-600 p-6">
          Erro ao renderizar esta aba. Feche e abra o perfil novamente, ou troque de aba.
        </p>
      );
    }
    return this.props.children;
  }
}

const STATUS_BG: Record<string, string> = {
  embarcado: 'from-green-600 to-emerald-700',
  standby: 'from-orange-500 to-amber-600',
  folga: 'from-blue-600 to-indigo-700',
  desembarcado: 'from-gray-600 to-slate-700',
  afastado: 'from-red-600 to-rose-700',
  ferias: 'from-purple-600 to-violet-700',
  treinamento: 'from-yellow-500 to-orange-600',
};

/** Shared across React Strict Mode remounts so two effects 1ms apart hit the server once. */
const colaboradorDetailInflight = new Map<string, Promise<CollaboratorDetail>>();

function fetchColaboradorDetail(colaboradorId: string, opts?: { force?: boolean }): Promise<CollaboratorDetail> {
  if (opts?.force) colaboradorDetailInflight.delete(colaboradorId);
  const existing = colaboradorDetailInflight.get(colaboradorId);
  if (existing) return existing;
  const pending = (async () => {
    const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores/${colaboradorId}?include=all`);
    if (!res.ok) throw new Error('Erro ao carregar dados');
    const json = await res.json();
    const payload = json?.data;
    if (!payload || typeof payload !== 'object' || !payload.id) {
      throw new Error('Resposta sem dados do colaborador');
    }
    return payload as CollaboratorDetail;
  })();
  colaboradorDetailInflight.set(colaboradorId, pending);
  void pending.finally(() => {
    if (colaboradorDetailInflight.get(colaboradorId) === pending) {
      colaboradorDetailInflight.delete(colaboradorId);
    }
  });
  return pending;
}

export default function CollaboratorModal({ colaboradorId, onClose, initialTab, highlightDocId }: CollaboratorModalProps) {
  const { t } = useI18n();
  const { hasAccess } = useSupabaseAuth();
  const canSeeQhseTab = hasAccess(QHSE_MODULE_KEY);
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.key !== 'qhse' || canSeeQhseTab),
    [canSeeQhseTab]
  );
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'dados');
  const [focusDocId, setFocusDocId] = useState<string | null>(highlightDocId || null);
  const [data, setData] = useState<CollaboratorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackModal, setShowBackModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const payload = await fetchColaboradorDetail(colaboradorId, { force: Boolean(opts?.silent) });
      setData(payload);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
      toast.error(t('gestaoTripulantes.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, [colaboradorId, t]);

  const silentRefresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (highlightDocId) setFocusDocId(highlightDocId);
  }, [initialTab, highlightDocId]);

  useEffect(() => {
    if (!focusDocId || loading) return;
    const el = document.getElementById(`gt-doc-${focusDocId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusDocId, activeTab, loading, data]);

  useEffect(() => {
    if (activeTab === 'qhse' && !canSeeQhseTab) setActiveTab('documentos');
  }, [activeTab, canSeeQhseTab]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    try {
      setUploadingDoc(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('colaborador_id', data.id);
      fd.append('tipo_documento', 'outro');
      fd.append('titulo', file.name.replace(/\.[^.]+$/, ''));

      const res = await fetchWithToken('/api/gestao-tripulantes/documentos/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload falhou');
      toast.success(t('gestaoTripulantes.upload.success'));
      await silentRefresh();
      const docId = json.data?.id as string | undefined;
      if (docId) {
        void enviarOcrDocumento(docId, json.data?.arquivo_url).then(() => silentRefresh());
      }
    } catch {
      toast.error(t('gestaoTripulantes.upload.error'));
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const renderTabContent = () => {
    if (loading && !data) return <SkeletonBlock />;
    if (!data) return <p className="text-gray-400 text-sm p-6">{t('gestaoTripulantes.errors.loadError')}</p>;

    switch (activeTab) {
      case 'dados':
        return (
          <>
            {(data.documentos_alertas || []).length > 0 && (
              <div className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50/70 p-3 space-y-2">
                <p className="text-xs font-bold text-red-800">Documentos com validade vencida ou a vencer</p>
                {data.documentos_alertas!.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(a.aba);
                      setFocusDocId(a.id);
                    }}
                    className="block w-full text-left text-xs text-red-900 hover:underline"
                  >
                    {a.titulo} · {a.tipo_documento} · {a.data_validade} · {a.papel} · abrir {a.aba}
                    {a.status_stale ? ' (status no banco desatualizado)' : ''}
                  </button>
                ))}
              </div>
            )}
            <DadosPessoaisTab
              data={data}
              onUpdate={(updated) => setData(prev => prev ? { ...prev, ...updated } : prev)}
              onRefresh={silentRefresh}
            />
          </>
        );
      case 'ficha':
        return (
          <FichaUnificadaTab
            colaboradorId={data.id}
            onOpenTab={(tab, docId) => {
              setActiveTab(tab as TabKey);
              if (docId) setFocusDocId(docId);
            }}
          />
        );
      case 'treinamentos':
        return <TreinamentosTab colaboradorId={data.id} colaborador={data} documentos={data.documentos || []} onRefresh={silentRefresh} highlightDocId={focusDocId} />;
      case 'aso':
        return (
          <ASOTab
            colaboradorId={data.id}
            colaboradorCpf={data.cpf}
            documentos={data.documentos || []}
            esocialAsos={(data as any).esocial_asos || []}
            onRefresh={silentRefresh}
            highlightDocId={focusDocId}
          />
        );
      case 'passaportes':
        return <PassaportesTab colaboradorId={data.id} documentos={data.documentos || []} onRefresh={silentRefresh} highlightDocId={focusDocId} />;
      case 'documentos':
        return <DocumentosTab colaboradorId={data.id} documentos={data.documentos || []} onRefresh={silentRefresh} highlightDocId={focusDocId} />;
      case 'qhse':
        return <QhseTab colaboradorId={data.id} />;
      case 'embarques':
        return <HistoricoEmbarquesTab embarques={data.embarques || []} />;
      case 'substituicoes':
        return <SubstituicoesTab colaboradorId={data.id} substituicoes={data.substituicoes || []} />;
      default: {
        const _exhaustive: never = activeTab;
        void _exhaustive;
        return null;
      }
    }
  };

  const gradientClass = STATUS_BG[data?.status_embarque || ''] || 'from-blue-600 to-indigo-700';

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${gradientClass} px-6 py-5 shrink-0`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30 flex-shrink-0">
                  {data?.foto_url ? (
                    <img src={data.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {data?.nome_completo?.charAt(0) || '?'}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">
                    {loading && !data ? 'Carregando...' : data?.nome_completo}
                  </h2>
                  <p className="text-sm text-white/70 truncate">
                    {data?.cargo_nome}
                    {data?.empresa_nome && ` • ${data.empresa_nome}`}
                    {data?.embarcacao_nome && ` • ${data.embarcacao_nome}`}
                  </p>
                  {/* Doc warning badges */}
                  <div className="flex gap-2 mt-1">
                    {(data?.qtd_docs_vencidos || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('ficha')}
                        className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium hover:bg-red-600"
                      >
                        {data!.qtd_docs_vencidos} doc(s) vencido(s) — ver ficha
                      </button>
                    )}
                    {(data?.qtd_docs_vencendo || 0) > 0 && (
                      <span className="px-2 py-0.5 bg-orange-400 text-white text-xs rounded-full font-medium">
                        {data!.qtd_docs_vencendo} vencendo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={fetchData}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Atualizar"
                >
                  <FiRefreshCw className="w-4 h-4 text-white" />
                </button>

                <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors cursor-pointer ${uploadingDoc ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FiUpload className="w-3.5 h-3.5" />
                  {uploadingDoc ? 'Enviando...' : t('gestaoTripulantes.profile.uploadDocument')}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleQuickUpload} />
                </label>

                <button
                  onClick={() => setShowBackModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors"
                >
                  <FiRepeat className="w-3.5 h-3.5" />
                  {t('gestaoTripulantes.profile.suggestBack')}
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-1"
                >
                  <FiX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50/50 overflow-x-auto shrink-0">
            <div className="flex min-w-max">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? 'text-blue-600 border-blue-600 bg-white'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.labelKey ? t(tab.labelKey) : tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <TabErrorBoundary key={activeTab}>
              {renderTabContent()}
            </TabErrorBoundary>
          </div>
        </motion.div>
      </motion.div>

      {/* Back modal */}
      {showBackModal && data && (
        <SugestaoBackModal
          colaboradorId={data.id}
          colaboradorNome={data.nome_completo}
          onClose={() => setShowBackModal(false)}
          onSelect={(candidateId) => {
            console.log('Substituto selecionado:', candidateId);
            fetchData();
          }}
        />
      )}
    </AnimatePresence>
  );
}
