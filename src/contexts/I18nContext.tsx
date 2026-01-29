'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, locales, getTranslation } from '@/i18n';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number> | string, defaultValue?: string) => string;
  locales: Record<Locale, any>;
  availableLocales: Locale[];
  version: number;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  // Initialize with default locale to avoid hydration mismatch
  const [locale, setLocaleState] = useState<Locale>('pt-BR');
  const [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState(0);

  // Override locales with state to support dynamic updates
  const [dynamicLocales, setDynamicLocales] = useState(locales);
  const { getToken, user } = useSupabaseAuth(); // Need auth for sync

  // Set mounted state and initialize locale on client side
  useEffect(() => {
    setMounted(true);

    // Get locale from localStorage on client side
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale') as Locale;
      if (savedLocale && Object.keys(locales).includes(savedLocale)) {
        console.log('🌐 Locale carregado do localStorage:', savedLocale);
        setLocaleState(savedLocale);
      } else {
        // If no saved locale, detect from browser
        const browserLang = navigator.language || navigator.languages?.[0] || 'pt-BR';
        console.log('🌐 Detectado idioma do navegador:', browserLang);

        // Normalize browser language to our supported locales
        let detectedLocale: Locale = 'pt-BR';
        if (browserLang.toLowerCase().startsWith('en')) {
          detectedLocale = 'en-US';
        } else if (browserLang.toLowerCase().startsWith('pt')) {
          detectedLocale = 'pt-BR';
        }

        console.log('🌐 Usando locale detectado:', detectedLocale);
        setLocaleState(detectedLocale);
        localStorage.setItem('locale', detectedLocale);
      }
    }
  }, []);

  // Load dynamic translations from DB
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch('/api/i18n/translations');
        if (res.ok) {
          const { data } = await res.json();
          if (data && Array.isArray(data)) {
            // Update dynamicLocales
            setDynamicLocales(prev => {
              const newLocales = JSON.parse(JSON.stringify(prev)); // Deep copy
              data.forEach((item: any) => {
                const { key, locale, value } = item;
                if (newLocales[locale]) {
                  // Support nested keys like 'cards.wkradar' => newLocales[pt-BR]['cards']['wkradar']
                  const parts = key.split('.');
                  let current = newLocales[locale];
                  for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                  }
                  current[parts[parts.length - 1]] = value;
                }
              });
              return newLocales;
            });
          }
        }
      } catch (e) {
        console.error('Failed to load dynamic translations', e);
      }
    };

    loadTranslations();
  }, []);

  // Update document language when locale changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Auto-Sync for Admins (The "Self-Updating" Feature)
  useEffect(() => {
    const syncSystem = async () => {
      if (user?.role === 'ADMIN') {
        const token = getToken();
        if (token) {
          // Fire and forget sync
          fetch('/api/i18n/translations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(d => {
            if (d.added > 0) {
              console.log('🔄 System Auto-Updated Translations:', d.message);
              // Reload to apply new keys immediately
              window.location.reload();
            }
          }).catch(err => console.error('Auto-sync failed', err));
        }
      }
    };

    if (mounted && user) {
      syncSystem();
    }
  }, [mounted, user, getToken]);

  // Function to set locale and save to localStorage
  const setLocale = (newLocale: Locale) => {
    console.log('🌐 Alterando idioma para:', newLocale);

    if (!Object.keys(locales).includes(newLocale)) {
      console.error('🌐 Idioma inválido:', newLocale);
      return;
    }

    // Update state
    setLocaleState(newLocale);
    setVersion(v => v + 1); // Incrementar versão para forçar re-render

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);

      window.dispatchEvent(new CustomEvent('localeChanged', {
        detail: { locale: newLocale }
      }));
    }

    console.log('🌐 Idioma alterado com sucesso para:', newLocale);
  };

  // Translation function
  const t = (key: string, arg2?: Record<string, string | number> | string, arg3?: string) => {
    let params: Record<string, string | number> | undefined;
    let defaultValue: string | undefined;

    if (typeof arg2 === 'string') {
      defaultValue = arg2;
    } else if (typeof arg2 === 'object') {
      params = arg2;
      defaultValue = arg3;
    }

    // Use dynamicLocales instead of static imports
    // Re-implement simplified getTranslation logic locally because we modified the source
    const getDynamicTranslation = (locale: Locale, key: string, defaultVal?: string, params?: Record<string, any>) => {
      const keys = key.split('.');
      let value: any = dynamicLocales[locale];

      for (const k of keys) {
        if (value === undefined || value === null) break;
        value = value[k];
      }

      if (value === undefined || value === null) {
        return defaultVal || key;
      }

      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = String(value).replace(`{{${k}}}`, String(v));
        });
      }
      return String(value);
    };

    return getDynamicTranslation(locale, key, defaultValue, params);
  };

  // Get available locales
  const availableLocales = Object.keys(locales) as Locale[];

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales: dynamicLocales,
        availableLocales,
        version,
      }}
    >
      {mounted ? children : <div style={{ display: 'none' }} />}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// HOC to wrap components with I18nProvider
export function withI18n<P extends object>(Component: React.ComponentType<P>) {
  return function WithI18n(props: P) {
    return (
      <I18nProvider>
        <Component {...props} />
      </I18nProvider>
    );
  };
}
