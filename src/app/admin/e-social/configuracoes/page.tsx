'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { ESocialConfigGeral, ESocialConfigWS } from '@/types/e-social';
import { toast } from 'react-hot-toast';
import { FiSave, FiRefreshCw } from 'react-icons/fi';

export default function ESocialConfiguracoesPage() {
  const { isAdmin, isLoading: authLoading } = useSupabaseAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configGeral, setConfigGeral] = useState<ESocialConfigGeral>({
    ambiente: 'homologacao',
    autonomia_envio: false,
    consultar_automatico: false,
  });
  const [configWS, setConfigWS] = useState<ESocialConfigWS>({
    url_homologacao: '',
    url_producao: '',
    timeout_segundos: 30,
    tentativas_maximas: 3,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [geralRes, wsRes] = await Promise.all([
        fetchWithToken('/api/e-social/config/geral'),
        fetchWithToken('/api/e-social/config/ws'),
      ]);
      if (geralRes.ok) {
        const data = await geralRes.json();
        if (data.config) setConfigGeral(data.config);
      }
      if (wsRes.ok) {
        const data = await wsRes.json();
        if (data.config) setConfigWS(data.config);
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadConfig();
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [geralRes, wsRes] = await Promise.all([
        fetchWithToken('/api/e-social/config/geral', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configGeral),
        }),
        fetchWithToken('/api/e-social/config/ws', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configWS),
        }),
      ]);
      if (geralRes.ok && wsRes.ok) {
        toast.success(t('eSocial.config.saved'));
      } else {
        toast.error(t('eSocial.config.saveError'));
      }
    } catch {
      toast.error(t('eSocial.config.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isAdmin) return null;

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('eSocial.configuracoes')}</h1>
            <p className="text-sm text-gray-500">{t('eSocial.config.title')}</p>
          </div>
          <button
            onClick={loadConfig}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border rounded-md hover:bg-gray-50"
          >
            <FiRefreshCw size={15} />
            Atualizar
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">{t('eSocial.config.ambiente')}</h2>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ambiente"
                value="homologacao"
                checked={configGeral.ambiente === 'homologacao'}
                onChange={() => setConfigGeral({ ...configGeral, ambiente: 'homologacao' })}
                className="text-abz-blue"
              />
              <span className="text-sm text-gray-700">{t('eSocial.config.homologacao')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ambiente"
                value="producao"
                checked={configGeral.ambiente === 'producao'}
                onChange={() => setConfigGeral({ ...configGeral, ambiente: 'producao' })}
                className="text-abz-blue"
              />
              <span className="text-sm text-gray-700">{t('eSocial.config.producao')}</span>
            </label>
          </div>

          <hr className="border-gray-200" />

          <h2 className="text-lg font-semibold text-gray-800">{t('eSocial.config.autonomiaEnvio')}</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('eSocial.config.autonomiaEnvio')}</p>
                <p className="text-xs text-gray-500">{t('eSocial.config.autonomiaEnvioDesc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={configGeral.autonomia_envio}
                onClick={() => setConfigGeral({ ...configGeral, autonomia_envio: !configGeral.autonomia_envio })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${configGeral.autonomia_envio ? 'bg-abz-blue' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${configGeral.autonomia_envio ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('eSocial.config.consultarAutomatico')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={configGeral.consultar_automatico}
                onClick={() => setConfigGeral({ ...configGeral, consultar_automatico: !configGeral.consultar_automatico })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${configGeral.consultar_automatico ? 'bg-abz-blue' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${configGeral.consultar_automatico ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>

          <hr className="border-gray-200" />

          <h2 className="text-lg font-semibold text-gray-800">Webservice</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eSocial.config.urlHomologacao')}
              </label>
              <input
                type="text"
                value={configWS.url_homologacao}
                onChange={(e) => setConfigWS({ ...configWS, url_homologacao: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eSocial.config.urlProducao')}
              </label>
              <input
                type="text"
                value={configWS.url_producao}
                onChange={(e) => setConfigWS({ ...configWS, url_producao: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eSocial.config.timeout')}
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={configWS.timeout_segundos}
                onChange={(e) => setConfigWS({ ...configWS, timeout_segundos: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eSocial.config.maxTentativas')}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={configWS.tentativas_maximas}
                onChange={(e) => setConfigWS({ ...configWS, tentativas_maximas: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-abz-blue focus:border-abz-blue"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
