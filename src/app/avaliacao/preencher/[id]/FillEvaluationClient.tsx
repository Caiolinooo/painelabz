'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiSave, FiSend, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import QuestionarioAvaliacaoCardBased from '@/components/avaliacao/QuestionarioAvaliacaoCardBased';
import { Evaluation } from '@/types';
import { QUESTIONARIO_PADRAO } from '@/lib/schemas/evaluation-schemas';
import { useI18n } from '@/contexts/I18nContext';
import { useAlert } from '@/contexts/AlertContext';
import { fetchWithToken } from '@/lib/tokenStorage';

interface FillEvaluationClientProps {
  evaluation: Evaluation;
  isManager: boolean;
  userId: string;
}

export default function FillEvaluationClient({
  evaluation,
  isManager,
  userId
}: FillEvaluationClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { showAlert } = useAlert();
  const [respostas, setRespostas] = useState<Record<string, any>>(
    evaluation.respostas || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Verificar se avaliação está concluída e bloquear edição
  useEffect(() => {
    if (evaluation.status === 'concluida') {
      showAlert({
        type: 'warning',
        title: t('evaluation.completed'),
        message: t('evaluation.alreadyCompleted'),
        onConfirm: () => router.push(`/avaliacao/ver/${evaluation.id}`)
      });
    }
  }, [evaluation.status, evaluation.id, router, t, showAlert]);

  // Bloquear renderização se avaliação estiver concluída
  if (evaluation.status === 'concluida') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-yellow-200 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <FiAlertCircle className="w-8 h-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('evaluation.completed')}</h2>
          </div>
          <p className="text-gray-700 mb-6">
            {t('evaluation.alreadyCompletedMessage')}
          </p>
          <button
            onClick={() => router.push(`/avaliacao/ver/${evaluation.id}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('evaluation.viewEvaluation')}
          </button>
        </div>
      </div>
    );
  }

  // Verificar se o funcionário é líder (baseado no role ou cargo)
  const isEmployeeLeader = evaluation.funcionario?.role === 'MANAGER' ||
    evaluation.funcionario?.role === 'ADMIN' ||
    evaluation.funcionario?.cargo?.toLowerCase().includes('gerente') ||
    evaluation.funcionario?.cargo?.toLowerCase().includes('líder') ||
    evaluation.funcionario?.cargo?.toLowerCase().includes('coordenador');

  const handleChange = (questionId: string, value: any) => {
    setRespostas(prev => ({
      ...prev,
      [questionId]: value
    }));
    setError(null);
  };

  const validateRespostas = (): boolean => {
    // Verificar se há pelo menos uma resposta preenchida
    const hasAnyResponse = Object.values(respostas).some(r =>
      (r?.comentario && r.comentario.trim().length > 0) || (r?.nota && r.nota > 0)
    );

    if (!hasAnyResponse) {
      setError(t('evaluation.fillAtLeastOne'));
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    // Verificação adicional antes de salvar
    if (evaluation.status === 'concluida') {
      setError(t('evaluation.alreadyCompleted'));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/avaliacao/${evaluation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          respostas,
          status: evaluation.status // Mantém o status atual
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('evaluation.errorSavingDraft'));
      }

      setSuccessMessage(t('evaluation.draftSaved'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('evaluation.errorSavingDraft'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitClick = () => {
    // Verificação adicional antes de mostrar modal
    if (evaluation.status === 'concluida') {
      setError(t('evaluation.alreadyCompleted'));
      return;
    }

    if (!validateRespostas()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);

    try {
      setIsSaving(true);
      setError(null);

      if (isManager) {
        // Gerente aprova a avaliação e salva suas respostas (Q15-Q24)
        const approveResponse = await fetchWithToken(`/api/avaliacao-desempenho/avaliacoes/${evaluation.id}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comentario_avaliador: respostas['Q15']?.comentario || '',
            respostas: respostas  // Enviar respostas completas (Q15-Q24)
          }),
        });

        if (!approveResponse.ok) {
          const data = await approveResponse.json();
          throw new Error(data.error || t('evaluation.errorApproving'));
        }

        showAlert({
          type: 'success',
          title: t('common.success'),
          message: t('evaluation.approvedSuccess'),
          onConfirm: () => {
            router.push('/avaliacao');
            router.refresh();
          }
        });
      } else {
        // Colaborador submete para revisão
        const submitResponse = await fetchWithToken(`/api/avaliacao-desempenho/avaliacoes/${evaluation.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            respostas
          }),
        });

        if (!submitResponse.ok) {
          const data = await submitResponse.json();
          throw new Error(data.error || t('evaluation.errorSubmitting'));
        }

        showAlert({
          type: 'success',
          title: t('common.success'),
          message: t('evaluation.sentForApproval'),
          onConfirm: () => {
            router.push('/avaliacao');
            router.refresh();
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('evaluation.errorSubmitting'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            {t('common.back')}
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isManager ? t('evaluation.managerialEvaluation') : t('evaluation.selfEvaluation')}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold">{t('evaluation.period')}:</span> {evaluation.periodo?.nome || evaluation.periodo || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">{t('evaluation.employee')}:</span> {evaluation.funcionario?.name || 'N/A'}
              </div>
              {isManager && (
                <div>
                  <span className="font-semibold">{t('evaluation.yourRole')}:</span> {t('evaluation.managerEvaluator')}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mensagens de feedback */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6"
          >
            <p className="text-red-800 font-medium">{error}</p>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6"
          >
            <p className="text-green-800 font-medium">{successMessage}</p>
          </motion.div>
        )}

        {/* Instruções */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            📋 {t('evaluation.instructions')}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {isManager ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionManager1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionManager2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionManager3')}
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionEmployee1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionEmployee2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {t('evaluation.instructionEmployee3')}
                </li>
              </>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              {t('evaluation.canSaveDraft')}
            </li>
          </ul>
        </motion.div>

        {/* Questionário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <QuestionarioAvaliacaoCardBased
            respostas={respostas}
            onChange={handleChange}
            isManager={isManager}
            readOnly={false}
            isEmployeeLeader={isEmployeeLeader}
          />
        </motion.div>

        {/* Botões de ação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200"
        >
          <div className="flex flex-wrap gap-4 justify-end">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              {isSaving ? t('evaluation.saving') : t('evaluation.saveDraft')}
            </button>

            <button
              onClick={handleSubmitClick}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend className="w-5 h-5" />
              {isSaving ? t('evaluation.sending') : isManager ? t('evaluation.finalize') : t('evaluation.sendForApproval')}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-right mt-4">
            {isManager
              ? t('evaluation.finalizeNote')
              : t('evaluation.sendNote')
            }
          </p>
        </motion.div>

        {/* Modal de Confirmação */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiAlertCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isManager ? t('evaluation.confirmFinalizeTitle') : t('evaluation.confirmSubmitTitle')}
                </h3>
              </div>

              <p className="text-gray-700 mb-6">
                {isManager ? t('evaluation.confirmFinalizeMessage') : t('evaluation.confirmSubmitMessage')}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  {t('evaluation.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {t('evaluation.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
