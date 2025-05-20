'use client';

import React, { useEffect, useState, ReactNode } from 'react';

interface ClientSideOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that ensures its children are only rendered on the client side.
 * This prevents "useLayoutEffect does nothing on the server" warnings and hydration mismatches.
 * 
 * @param children The components to render only on the client side
 * @param fallback Optional content to show during server-side rendering
 */
export default function ClientSideOnly({ 
  children, 
  fallback = null 
}: ClientSideOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * A higher-order component (HOC) that wraps a component to ensure it only renders on the client side.
 * This is useful for components that use browser-only APIs or hooks like useLayoutEffect.
 * 
 * @param Component The component to wrap
 * @param fallback Optional fallback component to render during server-side rendering
 */
export function withClientSideOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = null
): React.FC<P> {
  return function WithClientSideOnly(props: P) {
    return (
      <ClientSideOnly fallback={fallback}>
        <Component {...props} />
      </ClientSideOnly>
    );
  };
}

/**
 * A hook that safely wraps useLayoutEffect to prevent SSR warnings.
 * It uses useLayoutEffect on the client and useEffect on the server.
 */
export const useSafeLayoutEffect = typeof window !== 'undefined' 
  ? React.useLayoutEffect 
  : React.useEffect;
