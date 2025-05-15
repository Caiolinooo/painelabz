'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiDownload, FiExternalLink } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface GoogleDocsViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
  allowDownload?: boolean;
}

const GoogleDocsViewer: React.FC<GoogleDocsViewerProps> = ({
  title,
  filePath,
  onClose,
  allowDownload = true
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  // Função para normalizar o caminho do arquivo
  const getNormalizedPath = () => {
    // Se já for uma URL completa, retornar como está
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Caso contrário, construir URL completa
    const baseUrl = window.location.origin;
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  };

  // Construir a URL do Google Docs Viewer
  const getGoogleDocsViewerUrl = () => {
    const fileUrl = encodeURIComponent(getNormalizedPath());
    return `https://docs.google.com/viewer?url=${fileUrl}&embedded=true`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center space-x-2">
            {allowDownload && (
              <a
                href={getNormalizedPath()}
                download
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                title={t('viewer.download', 'Baixar documento')}
              >
                <FiDownload className="w-5 h-5" />
              </a>
            )}
            <a
              href={getNormalizedPath()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              title={t('viewer.openInNewTab', 'Abrir em nova aba')}
            >
              <FiExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              title={t('viewer.close', 'Fechar')}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          <iframe
            src={getGoogleDocsViewerUrl()}
            className="w-full h-full border-0"
            title={t('viewer.documentViewer', 'Visualizador de documento')}
            onLoad={() => setLoading(false)}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GoogleDocsViewer;
