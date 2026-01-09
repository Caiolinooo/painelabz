'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiExternalLink } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

export default function ContrachequePage() {
  const { t } = useI18n();

  return (
    <MainLayout>
      <h1 className="text-3xl font-extrabold text-abz-blue-dark mb-6">{t('contracheque.pageTitle')}</h1>

      <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-abz-text-black mb-3">{t('contracheque.accessSystem')}</h2>
          <p className="text-abz-text-dark mb-4">
            {t('contracheque.systemDescription')}
          </p>
          <p className="text-abz-text-dark mb-6">
            Para garantir sua segurança e acesso total às funcionalidades, o sistema de contracheque será aberto em uma nova janela.
          </p>
          <a
            href="http://wk.groupabz.com/radarwebnet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-abz-blue text-white rounded-lg font-bold hover:bg-abz-blue-dark transition duration-200 shadow-md text-base"
          >
            <FiExternalLink className="mr-3 text-white w-5 h-5" />
            {t('contracheque.accessSystem')}
          </a>
        </div>
      </div>
    </MainLayout>
  );
}

