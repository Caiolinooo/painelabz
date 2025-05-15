'use client';

import { useState, useEffect } from 'react';
import { formatDateSafe } from '@/lib/safeHydration';

interface SafeFormattedDateProps {
  date: Date | string | number;
  format?: Intl.DateTimeFormatOptions;
  locale?: string;
  className?: string;
}

/**
 * Componente para renderizar datas formatadas de forma segura,
 * evitando erros de hidratação entre servidor e cliente.
 */
export default function SafeFormattedDate({
  date,
  format,
  locale = 'pt-BR',
  className = '',
}: SafeFormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // Formatar a data apenas no cliente
    setFormattedDate(formatDateSafe(date, format, locale));
  }, [date, format, locale]);

  // Não renderizar nada durante a hidratação inicial
  if (formattedDate === null) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}
