'use client';

import { useState, useEffect } from 'react';
import { format, formatDistance } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useI18n } from '@/contexts/I18nContext';

interface SafeDateProps {
  date: Date | string | number;
  formatString?: string;
  relative?: boolean;
}

/**
 * Componente para renderizar datas de forma segura, evitando erros de hidratação.
 * Suporta formatação personalizada e datas relativas.
 */
export default function SafeDate({ date, formatString = 'PPP', relative = false }: SafeDateProps) {
  const [mounted, setMounted] = useState(false);
  const { locale } = useI18n();
  
  // Determinar o locale correto para date-fns
  const dateLocale = locale === 'pt-BR' ? ptBR : enUS;
  
  // Converter a data para objeto Date se for string ou número
  const dateObj = date instanceof Date ? date : new Date(date);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Não renderizar nada durante SSR para evitar erros de hidratação
  if (!mounted) return null;

  if (relative) {
    return formatDistance(dateObj, new Date(), { 
      addSuffix: true,
      locale: dateLocale
    });
  }

  return format(dateObj, formatString, { locale: dateLocale });
}
