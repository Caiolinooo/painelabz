'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { IAConfig, IAModel } from '@/types/ia';

export default function IAConfigPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<IAConfig | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Form state
  const [provider, setProvider] = useState<'lmstudio' | 'llamacpp'>('lmstudio');
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Config Geral
      const resC = await fetch('/api/ia/config', { headers: hdrs() });
      const dataC = await resC.json();
      if (dataC.config) {
        const c = dataC.config as IAConfig;
        setConfig(c);
        
        const activeProv = c.provider || 'lmstudio';
        setProvider(activeProv);
        
        if (c.provider_settings && c.provider_settings[activeProv]) {
          const settings = c.provider_settings[activeProv];
          setEndpoint(settings.endpoint || c.endpoint || '');
          setApiKey(settings.api_key || c.api_key || '');
          setModelDefault(settings.model_default || c.model_default || '');
        } else {
          setEndpoint(c.endpoint || '');
          setApiKey(c.api_key || '');
          setModelDefault(c.model_default || '');
        }

        setMaxTokens(c.max_tokens || 8192);
        setTemperatura(c.temperatura || 0.7);
        setSystemPrompt(c.system_prompt || '');
      }

    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [hdrs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProviderSwitch = (newProvider: 'lmstudio' | 'llamacpp') => {
    setProvider(newProvider);
    if (config?.provider_settings?.[newProvider]) {
      const settings = config.provider_settings[newProvider];
      setEndpoint(settings.endpoint || '');
      setApiKey(settings.api_key || '');
      setModelDefault(settings.model_default || '');
    } else {
      setEndpoint('');
      setApiKey('');
      setModelDefault('');
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ia/config', {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({
          provider,
          endpoint: endpoint.trim(),
          api_key: apiKey.trim(),
          model_default: modelDefault.trim(),
          provider_settings: {
            ...config?.provider_settings,
            [provider]: {
              endpoint: endpoint.trim(),
              api_key: apiKey.trim(),
              model_default: modelDefault.trim()
            }
          },
          max_tokens: maxTokens,
          temperatura,
          system_prompt: systemPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuração salva!' });
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
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🤖</span> Configuração da IA
          </h2>
          <p className="text-blue-100 text-sm mt-1">Defina qual provedor usar e os parâmetros base</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Switch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Provedor Ativo</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleProviderSwitch('lmstudio')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  provider === 'lmstudio' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-2xl">🏫</span>
                <span className="font-bold text-gray-900">LM Studio</span>
                <span className="text-xs text-gray-500">Externo / UI Própria</span>
              </button>
              <button 
                onClick={() => handleProviderSwitch('llamacpp')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  provider === 'llamacpp' ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-2xl">🦙</span>
                <span className="font-bold text-gray-900">llama.cpp</span>
                <span className="text-xs text-gray-500">Endpoint Externo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint API</label>
              <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)}
                placeholder="http://127.0.0.1:8080/v1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Dica: LlamaCPP local geralmente é http://127.0.0.1:8080/v1</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Se necessário"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo Padrão</label>
            <input type="text" value={modelDefault} onChange={e => setModelDefault(e.target.value)}
              placeholder="Ex: meta-llama-3-8b"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura: {temperatura}</label>
              <input type="range" value={temperatura} onChange={e => setTemperatura(Number(e.target.value))}
                min={0} max={2} step={0.1} className="w-full mt-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSaveConfig} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
