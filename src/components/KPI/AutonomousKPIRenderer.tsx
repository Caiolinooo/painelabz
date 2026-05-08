// =====================================================
// Component: AutonomousKPIRenderer - Main autonomous dashboard renderer
// =====================================================

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GenerativeDashboard from '@/components/IA/GenerativeDashboard';
import { useKPIAutonomous } from '@/hooks/useKPIAutonomous';
import { AgentStatus } from '@/lib/ia/autonomous-config';
import { FiPlay, FiPause, FiStopCircle, FiSettings, FiBarChart2, FiActivity, FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

interface AutonomousKPIRendererProps {
  userId: string;
  sectorId: string;
  config?: any;
  showControls?: boolean;
  className?: string;
}

export const AutonomousKPIRenderer: React.FC<AutonomousKPIRendererProps> = ({
  userId,
  sectorId,
  config,
  showControls = true,
  className = '',
}) => {
  const {
    isRunning,
    status,
    layouts,
    decisionLog,
    cycleHistory,
    agentInfo,
    start,
    stop,
    pause,
    resume,
    updateConfig,
    isLoading,
    error,
  } = useKPIAutonomous({
    userId,
    sectorId,
    config,
    autoStart: false,
    onLayoutUpdate: (layout) => {
      console.log('[AutonomousKPIRenderer] Layout updated:', layout.id);
    },
    onDecision: (decision) => {
      console.log('[AutonomousKPIRenderer] Decision:', decision.decision);
    },
    onCycleComplete: (cycleData) => {
      console.log('[AutonomousKPIRenderer] Cycle completed:', cycleData.cycleId);
    },
  });

  const [showHistory, setShowHistory] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'text-emerald-500 bg-emerald-50';
      case 'paused':
        return 'text-amber-500 bg-amber-50';
      case 'error':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return <FiPlay className="w-4 h-4" />;
      case 'paused':
        return <FiPause className="w-4 h-4" />;
      case 'error':
        return <FiAlertTriangle className="w-4 h-4" />;
      default:
        return <FiStopCircle className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (!userId || !sectorId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FiAlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Usuário ou setor não especificado</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {showControls && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FiBarChart2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Agente IA Autônomo</h3>
                <p className="text-sm text-gray-500">Monitoramento e otimização contínua de KPIs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="capitalize">{status}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={start}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <FiPlay className="w-4 h-4" />
                    <span className="text-sm font-medium">Iniciar</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={pause}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <FiPause className="w-4 h-4" />
                      <span className="text-sm font-medium">Pausar</span>
                    </button>
                    <button
                      onClick={stop}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <FiStopCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Parar</span>
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => updateConfig({ autoRender: !config?.autoRender })}
                  className={`p-2 rounded-lg transition-colors ${config?.autoRender ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                  title="Alternar renderização automática"
                >
                  <FiSettings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          {agentInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{agentInfo.layoutsCount}</div>
                <div className="text-sm text-gray-500">Layouts gerados</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{agentInfo.decisionsCount}</div>
                <div className="text-sm text-gray-500">Decisões tomadas</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{agentInfo.cyclesCount}</div>
                <div className="text-sm text-gray-500">Ciclos executados</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{config?.interval / 1000}s</div>
                <div className="text-sm text-gray-500">Intervalo</div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <FiAlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">Erro no agente: {error.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Layouts */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {layouts.map((layout, index) => (
            <motion.div
              key={`${layout.id}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GenerativeDashboard layout={layout} />
            </motion.div>
          ))}
        </AnimatePresence>

        {layouts.length === 0 && !isRunning && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FiBarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum dashboard gerado</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Inicie o agente autônomo para começar a gerar dashboards com KPIs dinâmicos
            </p>
            {showControls && (
              <button
                onClick={start}
                disabled={isLoading}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Iniciando...' : 'Iniciar Agente'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Decision History Toggle */}
      {(decisionLog.length > 0 || cycleHistory.length > 0) && showControls && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowDecisions(!showDecisions)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <FiActivity className="w-4 h-4" />
                Histórico de Decisões ({decisionLog.length})
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <FiClock className="w-4 h-4" />
                Histórico de Ciclos ({cycleHistory.length})
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showDecisions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="divide-y divide-gray-100"
              >
                {decisionLog.map((decision, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{decision.decision}</p>
                        <p className="text-xs text-gray-500 mt-1">{decision.reasoning}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-400">
                          {new Date(decision.timestamp).toLocaleString('pt-BR')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          decision.confidence > 80 ? 'bg-emerald-100 text-emerald-700' :
                          decision.confidence > 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {Math.round(decision.confidence)}% confiança
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="divide-y divide-gray-100"
              >
                {cycleHistory.map((cycle, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FiCheckCircle className={`w-4 h-4 ${
                          cycle.errors.length === 0 ? 'text-emerald-500' : 'text-amber-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Ciclo {cycle.cycleId.split('_')[1]?.substr(0, 8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(cycle.endTime - cycle.startTime)} • 
                            {cycle.actions.length} ações • 
                            {cycle.kpisAnalyzed} KPIs
                          </p>
                        </div>
                      </div>
                      {cycle.errors.length > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          {cycle.errors.length} erro(s)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
