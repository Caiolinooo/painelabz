'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiBookOpen, FiDownload, FiEye } from 'react-icons/fi';
import LazyDocumentViewer from '@/components/LazyLoad/LazyDocumentViewer';
import { useI18n } from '@/contexts/I18nContext';
import { measure } from '@/lib/performance';

const MANUAL_PDF_URL = '/documentos/manuais/Manual de logística.pdf';

// Simplified data structure for consistency - will be populated with translations
const getManualDoc = (t: (key: string) => string) => ({
    id: 'manual-logistica',
    title: t('manual.title'),
    description: t('manual.description'),
    file: MANUAL_PDF_URL
});

export default function ManualPage() {
  const [showViewer, setShowViewer] = useState(false);
  const { t } = useI18n();

  // Get translated manual document with performance measurement
  const manualDoc = measure('getManualDoc', () => getManualDoc(t), { locale: t('locale.code', 'pt-BR') });

  const openViewer = () => setShowViewer(true);
  const closeViewer = () => setShowViewer(false);

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('manual.title')}</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
         <h2 className="text-2xl font-semibold text-abz-text-black mb-6">{t('manual.mainDocument', 'Documento Principal')}</h2>
        {/* List structure similar to /politicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              key={manualDoc.id}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start mb-3">
                <div className={`bg-abz-light-blue p-3 rounded-full mr-3`}>
                    <FiBookOpen className="text-abz-blue w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-abz-text-black">{manualDoc.title}</h3>
                </div>
              </div>

              <p className="text-sm text-abz-text-dark mb-4">
                {manualDoc.description}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={openViewer} // Opens modal
                  className="inline-flex items-center px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark transition-colors text-sm font-medium shadow-sm"
                  title="Visualizar o manual"
                >
                  <FiEye className="mr-1.5" />
                  {t('manual.view')}
                </button>
                <a
                  href={manualDoc.file}
                  download={`${t('manual.title')} - ABZ Group.pdf`}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-abz-text-dark rounded-md hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm"
                >
                  <FiDownload className="mr-1.5" />
                  {t('manual.download')}
                </a>
              </div>
            </div>
          {/* Can add more documents here if needed in the future */}
        </div>
      </div>

      {/* Visualizador de documento usando o componente lazy-loaded */}
      {showViewer && (
        <LazyDocumentViewer
          title={manualDoc.title}
          filePath={manualDoc.file}
          onClose={closeViewer}
          accentColor="text-abz-blue"
        />
      )}
    </MainLayout>
  );
}