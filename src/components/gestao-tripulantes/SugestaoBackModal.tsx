'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiStar, FiCheckCircle, FiSend } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';

interface Candidate {
  colaborador: {
    id: string;
    nome_completo: string;
    cpf: string;
    cargo_nome: string;
    empresa_nome: string;
    embarcacao_nome: string;
    status_embarque: string;
    standby: boolean;
    avatar: string | null;
  };
  pontuacao: number;
  pontuacao_maxima: number;
  justificativas: string[];
}

interface Props {
  colaboradorId: string;
  colaboradorNome: string;
  onClose: () => void;
  onSelect?: (candidateId: string) => void;
}

export default function SugestaoBackModal({ colaboradorId, colaboradorNome, onClose, onSelect }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores/${colaboradorId}/sugerir-back`);
        if (!res.ok) throw new Error('Erro ao buscar sugestões');
        const json = await res.json();
        setCandidates(json.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar sugestões de back');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [colaboradorId]);

  const handleConfirm = async (candidateId: string) => {
    try {
      setConfirming(candidateId);
      onSelect?.(candidateId);
      toast.success('Substituição registrada com sucesso!');
      onClose();
    } catch {
      toast.error(t('gestaoTripulantes.errors.saveError'));
    } finally {
      setConfirming(null);
    }
  };

  const getScorePercent = (score: number, max: number) =>
    max > 0 ? Math.round((score / max) * 100) : 0;

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return 'text-green-600';
    if (pct >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 70) return 'bg-green-500';
    if (pct >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{t('gestaoTripulantes.back.title')}</h2>
                <p className="text-purple-200 text-sm mt-0.5">
                  {t('gestaoTripulantes.back.subtitle', `Melhores substitutos para ${colaboradorNome}`).replace('{{name}}', colaboradorNome)}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 border border-gray-100 rounded-xl">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-2 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center">
                <FiUser className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">{t('gestaoTripulantes.back.noCandidates')}</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {candidates.map((cand, idx) => {
                  const pct = getScorePercent(cand.pontuacao, cand.pontuacao_maxima);
                  return (
                    <div key={cand.colaborador.id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-purple-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {cand.colaborador.avatar ? (
                            <img src={cand.colaborador.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-purple-600 font-bold text-sm">
                              {cand.colaborador.nome_completo.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{cand.colaborador.nome_completo}</p>
                            {cand.colaborador.standby && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">SB</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {cand.colaborador.cargo_nome} • {cand.colaborador.empresa_nome}
                          </p>

                          {/* Score bar */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold flex-shrink-0 ${getScoreColor(pct)}`}>
                              {pct}%
                            </span>
                          </div>

                          {/* Justifications */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cand.justificativas.slice(0, 4).map((j, i) => (
                              <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                                <FiCheckCircle className="w-3 h-3" /> {j}
                              </span>
                            ))}
                            {cand.justificativas.length > 4 && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full">
                                +{cand.justificativas.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleConfirm(cand.colaborador.id)}
                          disabled={confirming === cand.colaborador.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex-shrink-0"
                        >
                          <FiSend className="w-3 h-3" />
                          {confirming === cand.colaborador.id ? 'Confirmando...' : t('gestaoTripulantes.back.substituteNow')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
