'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, locales, getInitialLocale, setLocalStorageLocale, getTranslation } from '@/i18n';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, defaultValue?: string) => string;
  locales: Record<Locale, any>;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale());
  const [mounted, setMounted] = useState(false);

  // Set mounted state when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to set locale and save to localStorage
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocalStorageLocale(newLocale);
    document.documentElement.lang = newLocale;
  };

  // Set initial locale on mount
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [mounted, locale]);

  // Translation function
  const t = (key: string, defaultValue?: string) => {
    return getTranslation(locale, key, defaultValue);
  };

  // Get available locales
  const availableLocales = Object.keys(locales) as Locale[];

  // Only render children when mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales,
        availableLocales,
      }}
    >
      {children}
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
