'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useI18n } from '@/contexts/I18nContext';
import ManualContent from '@/components/library/legacy/ManualContent';

export default function ManualPage() {
  const { t } = useI18n();

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('manual.title', 'Manual do Colaborador')}</h1>
      <ManualContent />
    </MainLayout>
  );
}

