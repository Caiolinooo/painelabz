'use client';

import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalErrorHandler from './GlobalErrorHandler';

// Import providers directly in the client component
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import MaterialIconProvider from '@/components/MaterialIconProvider';
import IconWrapper from '@/components/IconWrapper';
import IconTransformer from '@/components/IconTransformer';
import LanguageDialog from '@/components/LanguageDialog';
import SiteHead from '@/components/SiteHead';

// Client-side only component to wrap all providers
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Use state to track client-side mounting to prevent hydration mismatches
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set mounted state after hydration
    setIsMounted(true);
  }, []);

  return (
    <>
      <GlobalErrorHandler />
      <SupabaseAuthProvider>
        <AuthProvider>
          <I18nProvider>
            <SiteConfigProvider>
              <MaterialIconProvider>
                <IconWrapper>
                  {/* Garantir que o IconTransformer seja carregado o mais cedo possível */}
                  {isMounted && <IconTransformer key="icon-transformer" />}
                  <SiteHead />
                  {/* Only render components that might cause hydration issues when mounted on client */}
                  {isMounted && <LanguageDialog />}
                  {isMounted && <ToastContainer position="top-right" theme="colored" />}
                  {/* Envolver o conteúdo em um div para garantir que o IconTransformer seja aplicado */}
                  <div className="icon-transformer-wrapper">
                    {children}
                  </div>
                </IconWrapper>
              </MaterialIconProvider>
            </SiteConfigProvider>
          </I18nProvider>
        </AuthProvider>
      </SupabaseAuthProvider>
    </>
  );
}
