'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useI18n } from '@/contexts/I18nContext';
import ProcedimentosContent from '@/components/library/legacy/ProcedimentosContent';

export default function ProcedimentosPage() {
  const { t } = useI18n();

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('menu.procedimentosGerais')}</h1>
      <ProcedimentosContent />
    </MainLayout>
  );
}
