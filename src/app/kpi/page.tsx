'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiDownload, FiRefreshCw, FiFilter, FiActivity, FiCheckCircle, FiAlertTriangle, FiClock, FiUsers, FiBarChart2, FiFileText, FiSettings } from 'react-icons/fi';
import MainLayout from '@/components/Layout/MainLayout';
import { AutonomousKPIRenderer } from '@/components/KPI/AutonomousKPIRenderer';
import { KPIAutonomousHeader } from '@/components/KPI/KPIAutonomousHeader';
import { useKPIAutonomous } from '@/hooks/useKPIAutonomous';
import { useAutonomousConfig } from '@/hooks/useAutonomousConfig';

interface KPICard {
  key: string;
  label: string;
  value: number | string;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change?: number;
  department?: string;
  category: 'performance' | 'solutions' | 'agent';
}

interface AgentAction {
  id: string;
  action_type: string;
  action_description: string;
  channels_used: string[];
  success: boolean;
  created_at: string;
}

export default function KPIDashboardPage() {
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('todos');
  const [period, setPeriod] = useState<string>('month');

  // Autonomous agent hooks
  const { config, updateConfig, resetToDefault } = useAutonomousConfig();
  const { isRunning, status, start, stop, pause, resume, manualOverride } = useKPIAutonomous({
    userId: typeof window !== 'undefined' ? localStorage.getItem('abz_user_id') || '' : '',
    sectorId: typeof window !== 'undefined' ? localStorage.getItem('abz_sector_id') || '' : '',
    config,
    autoStart: false,
  });

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('abzToken') || localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ia/dashboard?type=kpi&period=${period}&department=${selectedDepartment}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Transform dashboard KPIs into our format
        const dashKpis: KPICard[] = (data.data?.kpis || []).map((k: any) => ({
          key: k.label?.toLowerCase().replace(/\s/g, '_') || 'unknown',
          label: k.label,
          value: k.value,
          target: k.target,
          unit: typeof k.value === 'number' && k.value <= 100 ? '%' : '',
          trend: k.trend || 'stable',
          change: k.change,
          category: 'performance',
        }));
        setKpis(dashKpis);
      }
    } catch (err) {
      console.error('[KPI] Error fetching KPIs:', err);
    }
    setLoading(false);
  }, [period, selectedDepartment, getAuthHeaders]);

  const fetchAgentActions = useCallback(async () => {
    try {
      const res = await fetch('/api/ia/knowledge-base?action=stats', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        // We'll also fetch agent actions via the dashboard
      }
    } catch (err) {
      console.error('[KPI] Error fetching agent actions:', err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchKPIs();
    fetchAgentActions();
  }, [fetchKPIs, fetchAgentActions]);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/ia/dashboard?type=kpi&format=${format}&period=${period}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kpi-report-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[KPI] Export error:', err);
    }
    setExporting(false);
  };

  const handleRefresh = useCallback(() => {
    fetchKPIs();
    fetchAgentActions();
  }, [fetchKPIs, fetchAgentActions]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <FiTrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down': return <FiTrendingDown className="w-4 h-4 text-red-500" />;
      default: return <FiMinus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGapColor = (value: number, target?: number) => {
    if (!target) return 'text-gray-700';
    const pct = (typeof value === 'number' ? value : 0) / target;
    if (pct >= 1) return 'text-emerald-600';
    if (pct >= 0.8) return 'text-amber-600';
    return 'text-red-600';
  };

  const getGapBar = (value: number, target?: number) => {
    if (!target) return 100;
    return Math.min((typeof value === 'number' ? value : 0) / target * 100, 100);
  };

  const filteredKpis = kpis.filter(k => {
    if (selectedCategory !== 'todos' && k.category !== selectedCategory) return false;
    return true;
  });

  const categories = [
    { key: 'todos', label: 'Todos', icon: FiBarChart2 },
    { key: 'performance', label: 'Performance', icon: FiActivity },
    { key: 'solutions', label: 'Soluções', icon: FiCheckCircle },
    { key: 'agent', label: 'Agente IA', icon: FiSettings },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Autonomous Agent Header */}
        <KPIAutonomousHeader
          config={config}
          isRunning={isRunning}
          status={status}
          onStart={start}
          onStop={stop}
          onPause={pause}
          onResume={resume}
          onConfigChange={updateConfig}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Autonomous KPI Renderer */}
          <AutonomousKPIRenderer
            userId={typeof window !== 'undefined' ? localStorage.getItem('abz_user_id') || '' : ''}
            sectorId={typeof window !== 'undefined' ? localStorage.getItem('abz_sector_id') || '' : ''}
            config={config}
            showControls={true}
          />

          {/* Legacy KPI Grid (fallback/complementary view) */}
          {kpis.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FiBarChart2 className="w-5 h-5 text-blue-600" />
                KPIs Detalhados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredKpis.map((kpi) => (
                  <div
                    key={kpi.key}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        {kpi.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpi.trend)}
                        {kpi.change !== undefined && (
                          <span className={`text-xs font-medium ${
                            kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {kpi.change > 0 ? '+' : ''}{kpi.change}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-3xl font-bold ${getGapColor(typeof kpi.value === 'number' ? kpi.value : 0, kpi.target)}`}>
                        {typeof kpi.value === 'number' ? kpi.value.toLocaleString('pt-BR') : kpi.value}
                      </span>
                      <span className="text-sm text-gray-400">{kpi.unit}</span>
                    </div>

                    {/* Target */}
                    {kpi.target && (
                      <p className="text-xs text-gray-400 mb-3">
                        Meta: {kpi.target}{kpi.unit}
                      </p>
                    )}

                    {/* Progress Bar */}
                    {kpi.target && typeof kpi.value === 'number' && (
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            getGapBar(kpi.value, kpi.target) >= 100 ? 'bg-emerald-500' :
                            getGapBar(kpi.value, kpi.target) >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${getGapBar(kpi.value, kpi.target)}%` }}
                        ></div>
                      </div>
                    )}

                    {/* Department Badge */}
                    {kpi.department && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                          <FiUsers className="w-3 h-3" />
                          {kpi.department}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Activity Section */}
          {agentActions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FiActivity className="w-5 h-5 text-purple-600" />
                Atividade do Agente IA
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {agentActions.slice(0, 10).map(action => (
                    <div key={action.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {action.success ? (
                          <FiCheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <FiAlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {action.action_description || action.action_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(action.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(action.channels_used || []).map(ch => (
                          <span key={ch} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
