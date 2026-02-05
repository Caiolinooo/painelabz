'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useI18n } from '@/contexts/I18nContext';
import GuiaOffshoreContent from '@/components/library/legacy/GuiaOffshoreContent';

export default function GuiaOffshorePage() {
    const { t } = useI18n();

    return (
        <MainLayout>
            <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('guia.title', 'Guia Offshore')}</h1>
            <GuiaOffshoreContent />
        </MainLayout>
    );
}
