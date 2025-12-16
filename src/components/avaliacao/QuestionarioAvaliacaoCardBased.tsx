'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiUser, FiUsers } from 'react-icons/fi';
import { QUESTIONARIO_PADRAO, ESCALA_AVALIACAO } from '@/lib/schemas/evaluation-schemas';
import StarRating from '@/components/StarRating';
import { useI18n } from '@/contexts/I18nContext';

interface QuestionarioAvaliacaoCardBasedProps {
  respostas: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  isManager?: boolean;
  readOnly?: boolean;
  isEmployeeLeader?: boolean; // Se o funcionário sendo avaliado é líder
}

export default function QuestionarioAvaliacaoCardBased({
  respostas,
  onChange,
  isManager = false,
  readOnly = false,
  isEmployeeLeader = false
}: QuestionarioAvaliacaoCardBasedProps) {
  const { t } = useI18n();

  // Debug: Log props on render
  console.log('[QUESTIONNAIRE] Rendering with isEmployeeLeader:', isEmployeeLeader, 'isManager:', isManager);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    autoavaliacao: true,
    gerencial: isManager
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Agrupar questões por categoria
  const questionsByCategory = QUESTIONARIO_PADRAO.reduce((acc, question) => {
    if (!acc[question.categoria]) {
      acc[question.categoria] = [];
    }
    acc[question.categoria].push(question);
    return acc;
  }, {} as Record<string, typeof QUESTIONARIO_PADRAO>);

  // Filtrar questões baseado no tipo de usuário e categoria
  const getQuestionsForUser = (categoria: string, forceType?: 'collaborator' | 'manager') => {
    const questions = questionsByCategory[categoria] || [];
    const filtered = questions.filter(q => {
      // Filtrar questões de liderança se o funcionário não é líder
      if (q.apenas_lideres && !isEmployeeLeader) {
        console.log(`[QUESTIONNAIRE] Filtering out question ${q.id} (apenas_lideres=${q.apenas_lideres}, isEmployeeLeader=${isEmployeeLeader})`);
        return false;
      }

      if (forceType) {
        return q.tipo === forceType;
      }
      if (isManager) {
        return q.tipo === 'manager';
      } else {
        return q.tipo === 'collaborator';
      }
    });

    console.log(`[QUESTIONNAIRE] Category: ${categoria}, isEmployeeLeader: ${isEmployeeLeader}, filtered ${questions.length} -> ${filtered.length} questions`);
    return filtered;
  };

  const renderStarRating = (questionId: string, currentValue: number, isReadOnly: boolean = readOnly) => {
    const resposta = respostas[questionId];

    return (
      <StarRating
        maxRating={5}
        initialRating={currentValue}
        onChange={(newRating) => onChange(questionId, {
          ...resposta,
          nota: newRating
        })}
        size="lg"
        readOnly={isReadOnly}
        showLabel={true}
        showTooltip={!isReadOnly}
      />
    );
  };

  const renderQuestion = (question: typeof QUESTIONARIO_PADRAO[0], isReadOnly: boolean = readOnly) => {
    const resposta = respostas[question.id];
    const isCollaboratorQuestion = question.tipo === 'collaborator';

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md p-6"
      >
        {/* Cabeçalho da pergunta */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {question.pergunta}
          </h3>
          {question.descricao && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {question.descricao}
            </p>
          )}
        </div>

        {/* Rating - Apenas para avaliações do gerente (Q15, Q16, Q17) */}
        {question.tipo === 'manager' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                {t('evaluation.rating')}:
              </label>
              {resposta?.nota && (
                <span className={`text-lg font-bold ${resposta.nota >= 4 ? 'text-green-600' :
                  resposta.nota >= 3 ? 'text-blue-600' :
                    resposta.nota >= 2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {resposta.nota} / 5
                </span>
              )}
            </div>
            <div className="mb-4">
              {renderStarRating(question.id, resposta?.nota || 0, isReadOnly)}
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>1</strong> - {t('evaluation.ratingScale.level1')}</p>
              <p><strong>2</strong> - {t('evaluation.ratingScale.level2')}</p>
              <p><strong>3</strong> - {t('evaluation.ratingScale.level3')}</p>
              <p><strong>4</strong> - {t('evaluation.ratingScale.level4')}</p>
              <p><strong>5</strong> - {t('evaluation.ratingScale.level5')}</p>
            </div>
          </div>
        )}

        {/* Comentário */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('evaluation.commentsLabel')}:
          </label>
          <textarea
            value={resposta?.comentario || ''}
            onChange={e => onChange(question.id, {
              ...resposta,
              comentario: e.target.value
            })}
            readOnly={isReadOnly}
            placeholder={t('evaluation.commentsPlaceholder')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-2">
            {question.obrigatorio ? t('evaluation.requiredField') : t('evaluation.optionalField')}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Seção de Autoavaliação */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl overflow-hidden border-2 border-blue-200">
        <button
          onClick={() => toggleSection('autoavaliacao')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiUser className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('evaluation.selfEvaluationSection')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('evaluation.selfEvaluationDesc')}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expandedSections.autoavaliacao ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <FiChevronDown className="w-6 h-6 text-gray-600" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expandedSections.autoavaliacao && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="px-6 pb-6"
            >
              <div className="space-y-6">
                {getQuestionsForUser('Autoavaliação', 'collaborator').map(q => renderQuestion(q, isManager))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Seção Gerencial (se aplicável) */}
      {isManager && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl overflow-hidden border-2 border-purple-200">
          <button
            onClick={() => toggleSection('gerencial')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <FiUsers className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('evaluation.managerEvaluationSection')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('evaluation.managerEvaluationDesc')}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: expandedSections.gerencial ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <FiChevronDown className="w-6 h-6 text-gray-600" />
            </motion.div>
          </button>

          <AnimatePresence>
            {expandedSections.gerencial && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6"
              >
                <div className="space-y-6">
                  {getQuestionsForUser('Avaliação do Gerente', 'manager').map(q => renderQuestion(q, false))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
