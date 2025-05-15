'use client';

import React, { useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface FallbackPdfViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
}

const FallbackPdfViewer: React.FC<FallbackPdfViewerProps> = ({
  title,
  filePath,
  onClose
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Normalizar o caminho do arquivo
  const getNormalizedPath = () => {
    // Se o caminho não começar com http ou https, considerar como caminho relativo
    if (!filePath.startsWith('http://') && !filePath.startsWith('https://')) {
      // Garantir que o caminho comece com /
      let normalizedPath = filePath;
      if (!filePath.startsWith('/')) {
        normalizedPath = `/${filePath}`;
      }

      // Construir URL completa para garantir compatibilidade em todos os navegadores
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${normalizedPath}`;
      }

      return normalizedPath;
    }
    return filePath;
  };

  const normalizedPath = getNormalizedPath();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-abz-blue truncate">{title}</h2>
          <div className="flex items-center space-x-2">
            <a
              href={normalizedPath}
              download
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title={t('viewer.download', 'Baixar documento')}
            >
              <FiDownload className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors"
              title={t('viewer.close', 'Fechar visualizador')}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document viewer */}
        <div className="p-8 bg-gray-100 flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full text-center">
            <h3 className="text-lg font-semibold mb-4">{t('viewer.cannotPreview', 'Não foi possível pré-visualizar o documento')}</h3>
            <p className="text-gray-600 mb-6">
              {t('viewer.downloadToView', 'Por favor, baixe o documento para visualizá-lo em seu dispositivo.')}
            </p>
            <a
              href={normalizedPath}
              download
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FiDownload className="mr-2" />
              {t('viewer.download', 'Baixar documento')}
            </a>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>{t('viewer.filePath', 'Caminho do arquivo')}: {filePath}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallbackPdfViewer;
