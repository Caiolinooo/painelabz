'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiUser, FiBookOpen, FiHeart, FiFileText, FiAnchor, FiRepeat, FiUpload, FiBell, FiRefreshCw
} from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';
import SugestaoBackModal from './SugestaoBackModal';
import DadosPessoaisTab from './tabs/DadosPessoaisTab';
import TreinamentosTab from './tabs/TreinamentosTab';
import ASOTab from './tabs/ASOTab';
import PassaportesTab from './tabs/PassaportesTab';
import DocumentosTab from './tabs/DocumentosTab';
import HistoricoEmbarquesTab from './tabs/HistoricoEmbarquesTab';
import SubstituicoesTab from './tabs/SubstituicoesTab';

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
  cargo_nome: string;
  empresa_nome: string;
  embarcacao_nome: string;
  centro_custo_nome: string;
  status_embarque: string;
  standby: boolean;
  data_admissao: string;
  data_proximo_embarque: string;
  foto_url: string;
  qtd_docs_vencidos: number;
  qtd_docs_vencendo: number;
  documentos: Document[];
  embarques: Embarkation[];
  substituicoes: Substitution[];
}

interface CollaboratorModalProps {
  colaboradorId: string;
  onClose: () => void;
}

type TabKey = 'dados' | 'treinamentos' | 'aso' | 'passaportes' | 'documentos' | 'embarques' | 'substituicoes';

const TABS: { key: TabKey; labelKey: string; icon: React.ElementType }[] = [
  { key: 'dados', labelKey: 'gestaoTripulantes.profile.personalData', icon: FiUser },
  { key: 'treinamentos', labelKey: 'gestaoTripulantes.profile.trainings', icon: FiBookOpen },
  { key: 'aso', labelKey: 'gestaoTripulantes.profile.aso', icon: FiHeart },
  { key: 'passaportes', labelKey: 'gestaoTripulantes.profile.passports', icon: FiFileText },
  { key: 'documentos', labelKey: 'gestaoTripulantes.profile.documents', icon: FiFileText },
  { key: 'embarques', labelKey: 'gestaoTripulantes.profile.embarkations', icon: FiAnchor },
  { key: 'substituicoes', labelKey: 'gestaoTripulantes.profile.substitutions', icon: FiRepeat },
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

const STATUS_BG: Record<string, string> = {
  embarcado: 'from-green-600 to-emerald-700',
  standby: 'from-orange-500 to-amber-600',
  folga: 'from-blue-600 to-indigo-700',
  desembarcado: 'from-gray-600 to-slate-700',
  afastado: 'from-red-600 to-rose-700',
  ferias: 'from-purple-600 to-violet-700',
  treinamento: 'from-yellow-500 to-orange-600',
};

export default function CollaboratorModal({ colaboradorId, onClose }: CollaboratorModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('dados');
  const [data, setData] = useState<CollaboratorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackModal, setShowBackModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores/${colaboradorId}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error(err);
      toast.error(t('gestaoTripulantes.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, [colaboradorId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      if (!res.ok) throw new Error('Upload falhou');
      toast.success(t('gestaoTripulantes.upload.success'));
      fetchData();
    } catch {
      toast.error(t('gestaoTripulantes.upload.error'));
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const renderTabContent = () => {
    if (loading) return <SkeletonBlock />;
    if (!data) return <p className="text-gray-400 text-sm p-6">{t('gestaoTripulantes.errors.loadError')}</p>;

    switch (activeTab) {
      case 'dados':
        return <DadosPessoaisTab data={data} onUpdate={(updated) => setData(prev => prev ? { ...prev, ...updated } : prev)} />;
      case 'treinamentos':
        return <TreinamentosTab colaboradorId={data.id} documentos={data.documentos || []} onRefresh={fetchData} />;
      case 'aso':
        return <ASOTab colaboradorId={data.id} documentos={data.documentos || []} esocialAsos={(data as any).esocial_asos || []} onRefresh={fetchData} />;
      case 'passaportes':
        return <PassaportesTab colaboradorId={data.id} documentos={data.documentos || []} onRefresh={fetchData} />;
      case 'documentos':
        return <DocumentosTab colaboradorId={data.id} documentos={data.documentos || []} onRefresh={fetchData} />;
      case 'embarques':
        return <HistoricoEmbarquesTab embarques={data.embarques || []} />;
      case 'substituicoes':
        return <SubstituicoesTab colaboradorId={data.id} substituicoes={data.substituicoes || []} />;
      default:
        return null;
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
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${gradientClass} px-6 py-5`}>
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
                    {loading ? 'Carregando...' : data?.nome_completo}
                  </h2>
                  <p className="text-sm text-white/70 truncate">
                    {data?.cargo_nome}
                    {data?.empresa_nome && ` • ${data.empresa_nome}`}
                    {data?.embarcacao_nome && ` • ${data.embarcacao_nome}`}
                  </p>
                  {/* Doc warning badges */}
                  <div className="flex gap-2 mt-1">
                    {(data?.qtd_docs_vencidos || 0) > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                        {data!.qtd_docs_vencidos} doc(s) vencido(s)
                      </span>
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
          <div className="border-b border-gray-200 bg-gray-50/50 overflow-x-auto">
            <div className="flex min-w-max">
              {TABS.map(tab => {
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
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[62vh] overflow-y-auto">
            {renderTabContent()}
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
