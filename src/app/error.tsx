'use client';

import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="dropdown" />
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <FiAlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900">{t('errors.errorOccurred', 'Ocorreu um erro')}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {error.message || t('errors.somethingWentWrong', 'Algo deu errado. Por favor, tente novamente.')}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-gray-400">
                {t('errors.errorCode', 'Código de erro')}: {error.digest}
              </p>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
            >
              <FiRefreshCw className="mr-2 -ml-1 h-4 w-4" />
              {t('common.tryAgain', 'Tentar novamente')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
