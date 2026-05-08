'use client';

import React, { useState, useEffect } from 'react';
import { FiToggleLeft, FiToggleRight, FiShield, FiCpu, FiMail, FiCalendar, FiDatabase, FiAlertCircle, FiSave } from 'react-icons/fi';

interface FeatureToggle {
  feature_key: string;
  is_enabled: boolean;
  description: string;
  category: string;
  min_role: string;
}

export default function IAFeatureTogglesPanel({ token }: { token: string }) {
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchToggles();
  }, []);

  const fetchToggles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ia/feature-toggles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Normalize possible API shapes to always an array
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : Array.isArray((data as any)?.toggles)
                ? (data as any).toggles
                : [];
        setToggles(normalized as any);
      }
    } catch (err) {
      console.error('[Toggles] Error:', err);
    }
    setLoading(false);
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    // Atualização UI rápida (interface responsiva)
    setToggles(prev => Array.isArray(prev) ? prev.map(t => t.feature_key === key ? { ...t, is_enabled: enabled } : t) : prev);
    
    setSaving(true);
    try {
      const res = await fetch('/api/ia/feature-toggles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: ***REMOVED*** feature_key: key, is_enabled: enabled }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = {}; }

      if (res.ok) {
        // Re-fetch toggles to align UI with backend state
        await fetchToggles();
        setMessage({ type: 'success', text: `Ferramenta ${key} ${enabled ? 'ativada' : 'desativada'}.` });
      } else {
        const errMsg = (data as any)?.error || (data as any)?.message || 'Erro ao salvar alteração';
        // Debug adicional para entender a falha quando o backend retornar 4xx/5xx
        console.error('Falha ao salvar toggle IA', { key, enabled, status: res.status, response: data });
        setMessage({ type: 'error', text: `Erro ao salvar: ${errMsg}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'microsoft': return <FiMail className="text-blue-500" />;
      case 'agent': return <FiCpu className="text-purple-500" />;
      case 'admin': return <FiShield className="text-red-500" />;
      default: return <FiDatabase className="text-gray-500" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando toggles...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Controle de Ferramentas IA</h2>
          <p className="text-sm text-gray-500">Habilite ou desabilite funções específicas do agente autonomamente.</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-fade-in ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            <FiAlertCircle />
            {message.text}
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {toggles.map((toggle) => (
          <div key={toggle.feature_key} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                {getIcon(toggle.category)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{toggle.feature_key}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {toggle.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{toggle.description}</p>
              </div>
            </div>

            <button
              onClick={() => handleToggle(toggle.feature_key, !toggle.is_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                toggle.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  toggle.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 bg-blue-50 border-t border-blue-100">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 leading-relaxed">
            <strong>Nota:</strong> Desativar uma ferramenta aqui impedirá que a IA a utilize em qualquer chat, 
            mesmo que o usuário tenha permissão no módulo. Use para desativações de emergência ou manutenção.
          </p>
        </div>
      </div>
    </div>
  );
}
