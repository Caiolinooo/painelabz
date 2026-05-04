'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiDownload, FiRefreshCw, FiFilter, FiActivity, FiCheckCircle, FiAlertTriangle, FiClock, FiUsers, FiBarChart2, FiFileText, FiSettings } from 'react-icons/fi';

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

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('abz_token') : null;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiBarChart2 className="w-7 h-7 text-blue-600" />
                Dashboard de KPIs
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Performance e Soluções — ABZ Group
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchKPIs}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                XLSX
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiFileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            {/* Category Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-white text-blue-700 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Period Selector */}
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredKpis.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FiBarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum KPI configurado</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Configure metas de KPI nas configurações do módulo IA ou peça ao assistente:
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-sm mt-2 inline-block">
                &quot;Configure um KPI de avaliações com meta de 80%&quot;
              </code>
            </p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
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

            {/* Agent Activity Section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FiActivity className="w-5 h-5 text-purple-600" />
                Atividade do Agente IA
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {agentActions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FiClock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Nenhuma ação recente do agente</p>
                    <p className="text-sm mt-1">O agente IA começará a registrar ações aqui quando executar tarefas agendadas.</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
