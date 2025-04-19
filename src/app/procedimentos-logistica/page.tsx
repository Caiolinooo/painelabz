'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiClipboard, FiDownload, FiEye } from 'react-icons/fi';
import DocumentViewer from '@/components/DocumentViewer';
import { useI18n } from '@/contexts/I18nContext';

const PROCEDIMENTO_PDF_URL = '/documentos/Revisão de procedimento de logistica.pdf';

// Simplified data structure - will be populated with translations
const getProcedimentoDoc = (t: (key: string) => string) => ({
    id: 'procedimento-logistica',
    title: t('procedures.title'),
    description: t('procedures.description'),
    file: PROCEDIMENTO_PDF_URL
});

export default function ProcedimentosLogisticaPage() {
  const [showViewer, setShowViewer] = useState(false);
  const { t } = useI18n();

  // Get translated procedure document
  const procedimentoDoc = getProcedimentoDoc(t);

  const openViewer = () => setShowViewer(true);
  const closeViewer = () => setShowViewer(false);

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('procedures.title')}</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
         <h2 className="text-2xl font-semibold text-abz-text-black mb-6">{t('procedures.mainDocument', 'Documento Principal')}</h2>
        {/* List structure similar to /politicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              key={procedimentoDoc.id}
              className="bg-white rounded-lg shadow-md p-5 transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start mb-3">
                <div className={`bg-abz-light-blue p-3 rounded-full mr-3`}>
                    <FiClipboard className="text-abz-blue w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-abz-text-black">{procedimentoDoc.title}</h3>
                </div>
              </div>

              <p className="text-sm text-abz-text-dark mb-4">
                {procedimentoDoc.description}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={openViewer} // Opens modal
                  className="inline-flex items-center px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark transition-colors text-sm font-medium shadow-sm"
                  title="Visualizar o procedimento"
                >
                  <FiEye className="mr-1.5" />
                  {t('procedures.view')}
                </button>
                <a
                  href={procedimentoDoc.file}
                  download={`${t('procedures.title')} - ABZ Group.pdf`}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-abz-text-dark rounded-md hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm"
                >
                  <FiDownload className="mr-1.5" />
                  {t('procedures.download')}
                </a>
              </div>
            </div>
        </div>
      </div>

      {/* Visualizador de documento usando o componente reutilizável */}
      {showViewer && (
        <DocumentViewer
          title={procedimentoDoc.title}
          filePath={procedimentoDoc.file}
          onClose={closeViewer}
          accentColor="text-abz-green"
        />
      )}
    </MainLayout>
  );
}