'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import type { IADashboardData, IADashboardKPI, IADashboardPendency } from '@/types/ia';

function KPICard({ kpi }: { kpi: IADashboardKPI }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{kpi.label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{kpi.value}</p>
        </div>
        <span className="text-2xl">{kpi.icon || '📈'}</span>
      </div>
      {kpi.trend && (
        <div className={`mt-2 text-xs font-medium ${
          kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}{' '}
          {kpi.change ? `${kpi.change}%` : 'Estável'}
        </div>
      )}
    </div>
  );
}

function PendencyCard({ pendency }: { pendency: IADashboardPendency }) {
  const priorityStyles = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-blue-500 bg-blue-50',
  };
  const priorityLabels = { high: 'Alta', medium: 'Média', low: 'Baixa' };

  return (
    <div className={`rounded-lg border-l-4 p-4 ${priorityStyles[pendency.priority]} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm text-gray-800">{pendency.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{pendency.description}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          pendency.priority === 'high' ? 'bg-red-100 text-red-700'
            : pendency.priority === 'medium' ? 'bg-yellow-100 text-yellow-700'
              : 'bg-blue-100 text-blue-700'
        }`}>
          {priorityLabels[pendency.priority]}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-gray-400">{pendency.module}</span>
        {pendency.deadline && (
          <span className="text-xs text-gray-400">📅 {new Date(pendency.deadline).toLocaleDateString('pt-BR')}</span>
        )}
      </div>
    </div>
  );
}

export default function IADashboardPage() {
  const [data, setData] = useState<IADashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const getToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [n, v] = c.trim().split('=');
      if (n === 'abzToken' || n === 'token') return decodeURIComponent(v);
    }
    return null;
  };

  const loadDashboard = useCallback(async (refresh = false) => {
    const token = getToken();
    if (!token) { window.location.href = '/login?redirect=/ia/dashboard'; return; }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/ia/dashboard${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro');
      setData(result.data);
      setCached(result.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard Inteligente</h1>
            <p className="text-sm text-gray-500 mt-1">Visão geral gerada por IA com base nos seus dados</p>
          </div>
          <div className="flex items-center gap-3">
            {cached && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Cache</span>}
            <button onClick={() => loadDashboard(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
            <a href="/ia" className="text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-shadow">
              💬 Chat IA
            </a>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Carregando dashboard...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">❌ {error}</p>
            <button onClick={() => loadDashboard()} className="mt-3 text-sm text-blue-600 hover:underline">Tentar novamente</button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-6 lg:p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-3">{data.summary.greeting}</h2>
              <ul className="space-y-1.5">
                {data.summary.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-blue-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

            {/* KPIs */}
            {data.kpis.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">📊 Indicadores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
                </div>
              </div>
            )}

            {/* Pendencies */}
            {data.pendencies.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">⚠️ Pendências</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {data.pendencies.map((p, i) => <PendencyCard key={i} pendency={p} />)}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-gray-400 text-center">
              Gerado em {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
