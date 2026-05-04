'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { IAConfig, IAModel } from '@/types/ia';

export default function IAConfigPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<IAConfig | null>(null);
  const [models, setModels] = useState<IAModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelDefault, setModelDefault] = useState('');
  const [maxTokens, setMaxTokens] = useState(8192);
  const [temperatura, setTemperatura] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');

  const hdrs = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  // Load config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ia/config', { headers: hdrs() });
        const data = await res.json();
        if (data.config) {
          const c = data.config as IAConfig;
          setConfig(c);
          setEndpoint(c.endpoint || '');
          setApiKey(c.api_key || '');
          setModelDefault(c.model_default || '');
          setMaxTokens(c.max_tokens || 8192);
          setTemperatura(c.temperatura || 0.7);
          setSystemPrompt(c.system_prompt || '');
        }
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, [hdrs]);

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ia/models?test=true', { headers: hdrs() });
      const data = await res.json();
      setTestResult(data);
      // Normalize potential shapes of models
      if (data.success) {
        const raw: any = data.models;
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.items)
            ? (raw as any).items
            : [];
        if (items.length > 0) {
          const mapped = items.map((m: any) => {
            if (m && typeof m === 'object' && m.id != null) {
              return { id: String(m.id), object: m.object ?? 'model', owned_by: m.owned_by ?? 'local' };
            }
            return { id: String(m), object: 'model', owned_by: 'local' };
          });
          setModels(mapped as any);
        } else {
          setModels([]);
        }
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Erro de conexão' });
    } finally { setTesting(false); }
  };

  // Load models
  const loadModels = async () => {
    try {
      const res = await fetch('/api/ia/models', { headers: hdrs() });
      const data = await res.json();
      const raw: any = data?.models;
      if (Array.isArray(raw)) {
        const mapped = raw.map((m: any) => {
          if (m && typeof m === 'object' && m.id != null) {
            return { id: String(m.id), object: m.object ?? 'model', owned_by: m.owned_by ?? 'local' };
          }
          return { id: String(m), object: 'model', owned_by: 'local' };
        });
        setModels(mapped as any);
      } else if (raw && Array.isArray(raw?.items)) {
        const mapped = raw.items.map((m: any) => ({
          id: String(m.id ?? m),
          object: m.object ?? 'model',
          owned_by: m.owned_by ?? 'local',
        }));
        setModels(mapped as any);
      } else {
        setModels([]);
      }
    } catch { /* skip */ }
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ia/config', {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({
          endpoint: endpoint.trim(),
          api_key: apiKey.trim(),
          model_default: modelDefault.trim(),
          max_tokens: maxTokens,
          temperatura,
          system_prompt: systemPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Salvo com sucesso!' });
        if (data.config) setConfig(data.config);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🤖</span> Configuração da IA
          </h2>
          <p className="text-blue-100 text-sm mt-1">Configure o endpoint, modelo e parâmetros do assistente</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint LLM</label>
            <div className="flex gap-2">
              <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)}
                placeholder="http://IP:PORT/v1"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
              <button onClick={handleTest} disabled={testing || !endpoint}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {testing ? '...' : '🔌 Testar'}
              </button>
            </div>
            {testResult && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </div>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo Padrão</label>
            <div className="flex gap-2">
              {models.length > 0 ? (
                <select value={modelDefault} onChange={e => setModelDefault(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none">
                  <option value="">Selecione um modelo</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              ) : (
                <input type="text" value={modelDefault} onChange={e => setModelDefault(e.target.value)}
                  placeholder="nome-do-modelo"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
              )}
              <button onClick={loadModels}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
                🔄
              </button>
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                min={256} max={32768} step={256}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperatura: {temperatura.toFixed(1)}
              </label>
              <input type="range" value={temperatura} onChange={e => setTemperatura(Number(e.target.value))}
                min={0} max={2} step={0.1}
                className="w-full mt-2" />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt Adicional</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              rows={4} placeholder="Instruções adicionais para o assistente..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y" />
            <p className="text-xs text-gray-400 mt-1">Será adicionado ao final do system prompt padrão</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`text-sm px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving || !endpoint || !apiKey}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none">
              {saving ? 'Salvando...' : '💾 Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
