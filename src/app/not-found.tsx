'use client';

import React from 'react';
import Link from 'next/link';
import { FiHome, FiArrowLeft } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-abz-background">
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="dropdown" />
      </div>
      <div className="text-center">
        <h1 className="text-9xl font-bold text-abz-blue">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-gray-900">{t('errors.pageNotFound', 'Página não encontrada')}</h2>
        <p className="mt-2 text-lg text-gray-600">
          {t('errors.pageNotFoundMessage', 'A página que você está procurando não existe ou foi movida.')}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-abz-blue hover:bg-abz-blue-dark"
          >
            <FiHome className="mr-2 -ml-1 h-5 w-5" />
            {t('common.backToDashboard', 'Voltar para o Dashboard')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2 -ml-1 h-5 w-5" />
            {t('common.back', 'Voltar')}
          </button>
        </div>
      </div>
    </div>
  );
}
