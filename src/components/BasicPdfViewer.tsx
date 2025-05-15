'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiDownload } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { getAvailableLocalizedDocumentPath } from '@/lib/documentUtils';

interface BasicPdfViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
  allowDownload?: boolean;
}

const BasicPdfViewer: React.FC<BasicPdfViewerProps> = ({
  title,
  filePath,
  onClose,
  allowDownload = true
}) => {
  const { t, locale } = useI18n();
  const [localizedFilePath, setLocalizedFilePath] = useState<string>(filePath);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Função para normalizar o caminho do arquivo
  const getNormalizedPath = (path: string) => {
    // Se já for uma URL completa, retornar como está
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Caso contrário, construir URL completa
    const baseUrl = window.location.origin;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  };

  // Obter o caminho do documento traduzido
  useEffect(() => {
    const getLocalizedPath = async () => {
      setIsLoading(true);
      try {
        // Obter o caminho do documento traduzido
        const localizedPath = await getAvailableLocalizedDocumentPath(filePath, locale);
        setLocalizedFilePath(localizedPath);

        // Abrir o PDF em uma nova aba
        const pdfUrl = getNormalizedPath(localizedPath);
        window.open(pdfUrl, '_blank');
      } catch (error) {
        console.error('Erro ao obter caminho do documento traduzido:', error);
        // Em caso de erro, usar o caminho original
        const pdfUrl = getNormalizedPath(filePath);
        window.open(pdfUrl, '_blank');
      } finally {
        setIsLoading(false);
      }
    };

    getLocalizedPath();
  }, [filePath, locale]);

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
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-600">
                {t('viewer.checkingTranslations', 'Verificando traduções disponíveis...')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-2">
                {t('viewer.openedInNewTab', 'O documento foi aberto em uma nova aba.')}
              </p>

              {localizedFilePath !== filePath ? (
                <p className="text-green-600 text-sm mb-6">
                  {t('viewer.translatedDocument', 'Documento traduzido disponível para o seu idioma.')}
                </p>
              ) : locale !== 'pt-BR' ? (
                <p className="text-amber-600 text-sm mb-6">
                  {t('viewer.noTranslation', 'Este documento está disponível apenas em português.')}
                </p>
              ) : (
                <p className="text-gray-500 text-sm mb-6">
                  {t('viewer.originalDocument', 'Documento original em português.')}
                </p>
              )}
            </>
          )}

          <div className="flex flex-col space-y-3">
            {allowDownload && (
              <a
                href={getNormalizedPath(localizedFilePath)}
                download
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <FiDownload className="w-5 h-5 mr-2" />
                {t('viewer.download', 'Baixar documento')}
              </a>
            )}

            <button
              onClick={onClose}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              <FiX className="w-5 h-5 mr-2" />
              {t('viewer.close', 'Fechar')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BasicPdfViewer;
