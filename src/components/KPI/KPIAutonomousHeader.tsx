// =====================================================
// Component: KPIAutonomousHeader - Control panel header
// =====================================================

'use client';

import React from 'react';
import { FiPlay, FiPause, FiStopCircle, FiSettings, FiBarChart2, FiDownload, FiRefreshCw } from 'react-icons/fi';

interface KPIAutonomousHeaderProps {
  config: any;
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigChange: (config: any) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'xlsx') => void;
  className?: string;
}

export const KPIAutonomousHeader: React.FC<KPIAutonomousHeaderProps> = ({
  config,
  isRunning,
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  onConfigChange,
  onRefresh,
  onExport,
  className = '',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500';
      case 'paused':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`bg-white border-b border-gray-200 sticky top-0 z-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FiBarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Autônomo</h1>
              <p className="text-sm text-gray-500">Monitoramento inteligente de KPIs</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></span>
              <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
            </div>

            {/* Interval selector */}
            <select
              value={config?.interval || 30000}
              onChange={(e) => onConfigChange({ interval: parseInt(e.target.value) })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={120000}>2m</option>
              <option value={300000}>5m</option>
            </select>

            {/* Autonomy level */}
            <select
              value={config?.autonomyLevel || 'medium'}
              onChange={(e) => onConfigChange({ autonomyLevel: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="full">Total</option>
            </select>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* Export buttons */}
            <button
              onClick={() => onExport('xlsx')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              <span className="hidden sm:inline">XLSX</span>
            </button>
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Control buttons */}
            {!isRunning ? (
              <button
                onClick={onStart}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FiPlay className="w-4 h-4" />
                Iniciar
              </button>
            ) : (
              <>
                {status === 'running' ? (
                  <button
                    onClick={onPause}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <FiPause className="w-4 h-4" />
                    Pausar
                  </button>
                ) : (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlay className="w-4 h-4" />
                    Retomar
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FiStopCircle className="w-4 h-4" />
                  Parar
                </button>
              </>
            )}

            {/* Settings */}
            <button
              onClick={() => onConfigChange({ autoRender: !config?.autoRender })}
              className={`p-2 rounded-lg transition-colors ${
                config?.autoRender ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}
              title="Renderização automática"
            >
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
