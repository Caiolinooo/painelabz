'use client';

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useI18n();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        <FiAlertCircle className="text-red-600 w-6 h-6 mt-1 mr-4 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800">
            {t('error.title', 'Something went wrong')}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-red-700">
              {error.message || t('error.defaultMessage', 'An unexpected error occurred.')}
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              {t('error.tryAgain', 'Try again')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, onReset, fallback }: ErrorBoundaryProps) {
  // Criar um componente de fallback que pode ser usado como FallbackComponent
  const FallbackComponent = fallback
    ? () => <>{fallback}</>
    : ErrorFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
