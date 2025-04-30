'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ClientHydrationBoundaryProps {
  children: ReactNode;
}

/**
 * Um componente simples que só renderiza seu conteúdo no cliente
 * para evitar problemas de hidratação.
 */
export default function ClientHydrationBoundary({ children }: ClientHydrationBoundaryProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante a renderização no servidor ou a primeira renderização no cliente,
  // renderizamos um div vazio para evitar problemas de hidratação
  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  return <>{children}</>;
}
