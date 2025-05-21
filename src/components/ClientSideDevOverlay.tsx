'use client';

import React, { useEffect, useState } from 'react';

/**
 * Componente que envolve overlays de desenvolvimento para evitar avisos de useLayoutEffect
 * Este componente garante que os overlays de desenvolvimento só sejam renderizados no cliente
 */
export default function ClientSideDevOverlay({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}
