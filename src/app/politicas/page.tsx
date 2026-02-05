'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useI18n } from '@/contexts/I18nContext';
import PoliticasContent from '@/components/library/legacy/PoliticasContent';

export default function PoliticasPage() {
  const { t } = useI18n();

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('policies.title')}</h1>
      <PoliticasContent />
    </MainLayout>
  );
}