'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que renderiza seu conteúdo apenas no lado do cliente,
 * evitando erros de hidratação causados por diferenças entre servidor e cliente.
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // No primeiro render, isClient será false (servidor ou hidratação inicial)
  // Depois do useEffect executar, isClient será true (apenas no cliente)
  return isClient ? children : fallback;
}
