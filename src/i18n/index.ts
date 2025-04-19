import enUS from './locales/en-US';
import ptBR from './locales/pt-BR';
import { getCacheValue, setCacheValue } from '@/lib/cache';

export type Locale = 'en-US' | 'pt-BR';

export const locales: Record<Locale, any> = {
  'en-US': enUS,
  'pt-BR': ptBR,
};

export const defaultLocale: Locale = 'pt-BR';

export function getTranslation(locale: Locale, key: string, defaultValue?: string): string {
  // Check cache first
  const cacheKey = `i18n:${locale}:${key}`;
  const cachedValue = getCacheValue<string>(cacheKey);

  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const keys = key.split('.');
  let translation: any = locales[locale];
  let found = true;

  // Try to find the translation in the current locale
  for (const k of keys) {
    if (!translation || !translation[k]) {
      found = false;
      break;
    }
    translation = translation[k];
  }

  // If found in current locale, cache and return it
  if (found) {
    setCacheValue(cacheKey, translation);
    return translation;
  }

  // Try to find in default locale if not found in current locale
  if (locale !== defaultLocale) {
    translation = locales[defaultLocale];
    found = true;

    for (const k of keys) {
      if (!translation || !translation[k]) {
        found = false;
        break;
      }
      translation = translation[k];
    }

    if (found) {
      setCacheValue(cacheKey, translation);
      return translation;
    }
  }

  // Cache and return default value or key if not found in any locale
  const result = defaultValue || key;
  setCacheValue(cacheKey, result);
  return result;
}

export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const browserLocale = navigator.language;

  if (browserLocale.startsWith('pt')) {
    return 'pt-BR';
  }

  return 'en-US';
}

export function getLocalStorageLocale(): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedLocale = localStorage.getItem('locale') as Locale;

  if (storedLocale && Object.keys(locales).includes(storedLocale)) {
    return storedLocale;
  }

  return null;
}

export function setLocalStorageLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('locale', locale);
}

export function getInitialLocale(): Locale {
  // First check localStorage
  const localStorageLocale = getLocalStorageLocale();
  if (localStorageLocale) {
    return localStorageLocale;
  }

  // Then check browser locale
  const browserLocale = getBrowserLocale();
  if (browserLocale) {
    return browserLocale;
  }

  // Fallback to default locale
  return defaultLocale;
}
