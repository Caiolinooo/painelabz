'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { IAConfig, IAProviderType } from '@/types/ia';

const PROVIDER_PRESETS: Record<IAProviderType, {
  name: string;
  icon: string;
  badge: string;
  defaultEndpoint: string;
  defaultModel: string;
  hint: string;
  presetModels: string[];
}> = {
  gemini: {
    name: 'Google Gemini',
    icon: '🔮',
    badge: 'Recomendado / Nuvem',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    hint: 'Insira sua API Key do Google AI Studio (aizasy...). O endpoint usa a API compatível com OpenAI do Gemini.',
    presetModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ],
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    icon: '🟢',
    badge: 'Oficial / Nuvem',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    hint: 'Insira sua API Key da OpenAI (sk-...).',
    presetModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
  },
  lmstudio: {
    name: 'LM Studio',
    icon: '🏫',
    badge: 'Local / Servidor',
    defaultEndpoint: 'http://127.0.0.1:1234/v1',
    defaultModel: 'meta-llama-3-8b',
    hint: 'Inicie a API Server no LM Studio e informe o IP/Porta local ou da rede.',
    presetModels: ['meta-llama-3-8b', 'mistral-7b-instruct', 'qwen-2.5-7b'],
  },
  llamacpp: {
    name: 'llama.cpp',
    icon: '🦙',
    badge: 'Local / Docker',
    defaultEndpoint: 'http://127.0.0.1:8080/v1',
    defaultModel: 'llama-3-8b',
    hint: 'Inicie o servidor llama-server / llama.cpp no endpoint /v1.',
    presetModels: ['llama-3-8b', 'llama-3-70b', 'phi-3-mini'],
  },
  custom: {
    name: 'Outros Provedores',
    icon: '⚙️',
    badge: 'Custom / OpenRouter / Groq',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-r1',
    hint: 'Qualquer API compatível com OpenAI (OpenRouter, Groq, DeepSeek, Ollama).',
    presetModels: ['deepseek/deepseek-r1', 'groq/llama-3.3-70b', 'ollama/llama3'],
  },
};

export default function IAConfigPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<IAConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [provider, setProvider] = useState<IAProviderType>('gemini');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelDefault, setModelDefault] = useState('');
  const [maxTokens, setMaxTokens] = useState(8192);
  const [temperatura, setTemperatura] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Available models dynamically fetched from endpoint
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  const hdrs = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const resC = await fetch('/api/ia/config', { headers: hdrs() });
      const dataC = await resC.json();

      if (dataC.config) {
        const c = dataC.config as IAConfig;
        setConfig(c);

        const activeProv = (c.provider || 'gemini') as IAProviderType;
        setProvider(activeProv);

        const settings = c.provider_settings?.[activeProv];
        if (settings) {
          setEndpoint(settings.endpoint || c.endpoint || PROVIDER_PRESETS[activeProv].defaultEndpoint);
          setApiKey(settings.api_key || c.api_key || '');
          setModelDefault(settings.model_default || c.model_default || PROVIDER_PRESETS[activeProv].defaultModel);
        } else {
          setEndpoint(c.endpoint || PROVIDER_PRESETS[activeProv].defaultEndpoint);
          setApiKey(c.api_key || '');
          setModelDefault(c.model_default || PROVIDER_PRESETS[activeProv].defaultModel);
        }

        setMaxTokens(c.max_tokens || 8192);
        setTemperatura(c.temperatura || 0.7);
        setSystemPrompt(c.system_prompt || '');
      } else {
        // Preset defaults for new config
        setProvider('gemini');
        setEndpoint(PROVIDER_PRESETS.gemini.defaultEndpoint);
        setModelDefault(PROVIDER_PRESETS.gemini.defaultModel);
      }
    } catch (err) {
      console.error('[IAConfigPanel] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [hdrs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProviderSwitch = (newProvider: IAProviderType) => {
    setProvider(newProvider);
    setConnectionTestResult(null);

    const preset = PROVIDER_PRESETS[newProvider];
    const existing = config?.provider_settings?.[newProvider];

    if (existing) {
      setEndpoint(existing.endpoint || preset.defaultEndpoint);
      setApiKey(existing.api_key || '');
      setModelDefault(existing.model_default || preset.defaultModel);
    } else {
      setEndpoint(preset.defaultEndpoint);
      setApiKey('');
      setModelDefault(preset.defaultModel);
    }
    setFetchedModels([]);
  };

  // Consultar modelos do endpoint atual
  const handleFetchModels = async () => {
    setFetchingModels(true);
    setMessage(null);
    try {
      const url = new URL('/api/ia/models', window.location.origin);
      if (endpoint.trim()) url.searchParams.set('endpoint', endpoint.trim());
      if (apiKey.trim()) url.searchParams.set('api_key', apiKey.trim());

      const res = await fetch(url.toString(), { headers: hdrs() });
      const data = await res.json();

      if (res.ok && Array.isArray(data.models) && data.models.length > 0) {
        const modelList = data.models.map((m: any) => typeof m === 'string' ? m : m.id);
        setFetchedModels(modelList);
        setMessage({
          type: 'success',
          text: `Sucesso! ${modelList.length} modelo(s) encontrado(s) no servidor. Escolha um na lista abaixo.`
        });
        if (!modelDefault && modelList.length > 0) {
          setModelDefault(modelList[0]);
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Nenhum modelo foi retornado pelo servidor. Verifique a API Key e o Endpoint.'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao consultar modelos do endpoint: ' + (err.message || 'Erro de conexão') });
    } finally {
      setFetchingModels(false);
    }
  };

  // Testar conexão
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const url = new URL('/api/ia/models', window.location.origin);
      url.searchParams.set('test', 'true');
      if (endpoint.trim()) url.searchParams.set('endpoint', endpoint.trim());
      if (apiKey.trim()) url.searchParams.set('api_key', apiKey.trim());

      const res = await fetch(url.toString(), { headers: hdrs() });
      const data = await res.json();

      if (data.success) {
        setConnectionTestResult(`✅ ${data.message}`);
        if (Array.isArray(data.models) && data.models.length > 0) {
          setFetchedModels(data.models);
        }
      } else {
        setConnectionTestResult(`❌ ${data.message || 'Falha ao conectar'}`);
      }
    } catch (err: any) {
      setConnectionTestResult(`❌ Erro ao conectar: ${err.message || 'Erro de rede'}`);
    } finally {
      setTestingConnection(false);
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
              model_default: modelDefault.trim(),
            },
          },
          max_tokens: maxTokens,
          temperatura,
          system_prompt: systemPrompt.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações de IA salvas com sucesso!' });
        if (data.config) setConfig(data.config);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const activePreset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  // Combine preset models + fetched models without duplicates
  const allAvailableModels = Array.from(new Set([...fetchedModels, ...activePreset.presetModels]));

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🤖</span> Configuração do Provedor de IA
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Selecione o provedor (Google Gemini, OpenAI, LM Studio, etc.) e configure o modelo ativo.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection Cards */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Selecione o Provedor de IA</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(Object.keys(PROVIDER_PRESETS) as IAProviderType[]).map((pKey) => {
                const p = PROVIDER_PRESETS[pKey];
                const isSelected = provider === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleProviderSwitch(pKey)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-bold text-xs text-gray-900 leading-tight">{p.name}</span>
                    <span className="text-[10px] text-blue-600 font-medium">{p.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint alert */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div>
              <p className="font-semibold">{activePreset.name}</p>
              <p className="mt-0.5">{activePreset.hint}</p>
            </div>
          </div>

          {/* Endpoint and API Key */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do Endpoint API</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">Endpoint compatível com OpenAI (termina em /v1 ou /openai)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Token</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'Chave do Google AI Studio (AIzaSy...)' : 'Sua API Key'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {provider === 'gemini' ? 'Obtenha gratuitamente em: aistudio.google.com' : 'Sua chave de acesso ao servidor'}
              </p>
            </div>
          </div>

          {/* Connection Test / Fetch Models Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={fetchingModels}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
            >
              {fetchingModels ? '🔍 Consultando...' : '🔍 Buscar Modelos Disponíveis no Servidor'}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
            >
              {testingConnection ? '⚡ Testando...' : '⚡ Testar Conexão'}
            </button>

            {connectionTestResult && (
              <span className="text-xs font-medium px-3 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700">
                {connectionTestResult}
              </span>
            )}
          </div>

          {/* Model Selection Dropdown & Text Input */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-800">
                Modelo Padrão da IA
              </label>
              {fetchedModels.length > 0 && (
                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded font-medium">
                  {fetchedModels.length} modelo(s) extraído(s) do endpoint
                </span>
              )}
            </div>

            {/* Select Dropdown */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Selecione na lista de modelos disponíveis:</label>
              <select
                value={modelDefault}
                onChange={(e) => setModelDefault(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none font-medium text-gray-800"
              >
                {allAvailableModels.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod} {fetchedModels.includes(mod) ? ' (Detectado no Servidor ✨)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Edit Input */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ou digite manualmente o nome do modelo:</label>
              <input
                type="text"
                value={modelDefault}
                onChange={(e) => setModelDefault(e.target.value)}
                placeholder="Ex: gemini-2.5-flash ou gpt-4o"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite Máximo de Tokens (max_tokens)</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">Recomendado: 8192 para Gemini / GPT-4o</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">Temperatura</label>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{temperatura}</span>
              </div>
              <input
                type="range"
                value={temperatura}
                onChange={(e) => setTemperatura(Number(e.target.value))}
                min={0}
                max={2}
                step={0.1}
                className="w-full mt-2 accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0 (Preciso / Fatos)</span>
                <span>0.7 (Equilibrado)</span>
                <span>2.0 (Criativo)</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instruções do Sistema (System Prompt)</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="Instruções comportamentais do assistente..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`p-3.5 rounded-xl text-sm font-medium ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-md transition-all disabled:opacity-50 text-sm"
            >
              {saving ? 'Salvando Configuração...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
