import enUS from './locales/en-US';
import ptBR from './locales/pt-BR';

export type Locale = 'en-US' | 'pt-BR';

export const locales: Record<Locale, any> = {
  'en-US': enUS,
  'pt-BR': ptBR,
};

export const defaultLocale: Locale = 'pt-BR';

export function getTranslation(locale: Locale, key: string, defaultValue?: string, params?: Record<string, string | number>): string {
  // Validate inputs
  if (!key || typeof key !== 'string') {
    return defaultValue || key || '';
  }

  if (!locale || !Object.keys(locales).includes(locale)) {
    locale = defaultLocale;
  }

  // Try to find the translation in the current locale
  const keys = key.split('.');
  let translation: any = locales[locale];

  for (const k of keys) {
    if (!translation || typeof translation !== 'object' || !translation[k]) {
      translation = null;
      break;
    }
    translation = translation[k];
  }

  // If found and is a string, return it
  let result = '';
  if (translation && typeof translation === 'string') {
    result = translation;
  } else if (locale !== defaultLocale) {
    // Try fallback to default locale if current locale is not default
    let fallbackTranslation: any = locales[defaultLocale];

    for (const k of keys) {
      if (!fallbackTranslation || typeof fallbackTranslation !== 'object' || !fallbackTranslation[k]) {
        fallbackTranslation = null;
        break;
      }
      fallbackTranslation = fallbackTranslation[k];
    }

    if (fallbackTranslation && typeof fallbackTranslation === 'string') {
      result = fallbackTranslation;
    }
  }

  // If we have a result and params, perform interpolation
  if (result && params) {
    Object.keys(params).forEach(paramKey => {
      const value = String(params[paramKey]);
      // Replace {{key}}
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), value);
      // Replace {key} (alternative syntax)
      result = result.replace(new RegExp(`{${paramKey}}`, 'g'), value);
    });
    return result;
  }

  return result || defaultValue || key;
}
