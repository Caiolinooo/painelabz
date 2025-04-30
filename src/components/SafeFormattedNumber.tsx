'use client';

import { useState, useEffect } from 'react';
import { formatNumberSafe } from '@/lib/safeHydration';

interface SafeFormattedNumberProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  className?: string;
}

/**
 * Componente para renderizar números formatados de forma segura,
 * evitando erros de hidratação entre servidor e cliente.
 */
export default function SafeFormattedNumber({
  value,
  format,
  locale = 'pt-BR',
  className = '',
}: SafeFormattedNumberProps) {
  const [formattedNumber, setFormattedNumber] = useState<string | null>(null);

  useEffect(() => {
    // Formatar o número apenas no cliente
    setFormattedNumber(formatNumberSafe(value, format, locale));
  }, [value, format, locale]);

  // Não renderizar nada durante a hidratação inicial
  if (formattedNumber === null) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{formattedNumber}</span>;
}
