'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';

export default function Loading() {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center min-h-screen bg-abz-background">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abz-blue"></div>
        <p className="mt-4 text-abz-blue font-medium">{t('common.loading', 'Carregando...')}</p>
      </div>
    </div>
  );
}
