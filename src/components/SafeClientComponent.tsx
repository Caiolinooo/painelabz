'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useSafeLayoutEffect } from './ClientSideOnly';

interface SafeClientComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that safely renders client-side components with useLayoutEffect
 * This component ensures that components using useLayoutEffect are only rendered
 * on the client side, avoiding the "useLayoutEffect does nothing on the server" warning
 */
export default function SafeClientComponent({
  children,
  fallback = <div className="min-h-[20px]"></div>
}: SafeClientComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Use the safe version of useLayoutEffect that doesn't cause SSR warnings
  useSafeLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallback;
  }

  return <>{children}</>;
}
