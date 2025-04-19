'use client';

import React from 'react';
import { FiX, FiDownload, FiMaximize, FiMinimize } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';

interface DocumentViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
  allowDownload?: boolean;
  accentColor?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  title,
  filePath,
  onClose,
  allowDownload = true,
  accentColor = 'text-abz-blue'
}) => {
  const { t } = useI18n();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'fitH' | 'fitV' | 'fitB'>('fitH');

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle fullscreen change event
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Change view mode
  const changeViewMode = (mode: 'fitH' | 'fitV' | 'fitB') => {
    setViewMode(mode);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full h-[98vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b bg-gray-50">
          <h2 className={`text-xl font-semibold ${accentColor} truncate`}>{title}</h2>
          <div className="flex items-center space-x-2">
            {/* View mode buttons */}
            <div className="hidden sm:flex items-center space-x-1 mr-2">
              <button
                onClick={() => changeViewMode('fitH')}
                className={`px-2 py-1 text-xs rounded ${viewMode === 'fitH' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
                title={t('viewer.fitWidth', 'Ajustar à largura')}
              >
                {t('viewer.width', 'Largura')}
              </button>
              <button
                onClick={() => changeViewMode('fitV')}
                className={`px-2 py-1 text-xs rounded ${viewMode === 'fitV' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
                title={t('viewer.fitHeight', 'Ajustar à altura')}
              >
                {t('viewer.height', 'Altura')}
              </button>
              <button
                onClick={() => changeViewMode('fitB')}
                className={`px-2 py-1 text-xs rounded ${viewMode === 'fitB' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
                title={t('viewer.fitPage', 'Ajustar à página')}
              >
                {t('viewer.page', 'Página')}
              </button>
            </div>

            {/* Action buttons */}
            {allowDownload && (
              <a
                href={filePath}
                download
                className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title={t('viewer.download', 'Baixar documento')}
              >
                <FiDownload className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={toggleFullscreen}
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title={isFullscreen ? t('viewer.exitFullscreen', 'Sair da tela cheia') : t('viewer.fullscreen', 'Tela cheia')}
            >
              {isFullscreen ? <FiMinimize className="h-5 w-5" /> : <FiMaximize className="h-5 w-5" />}
            </button>
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
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={`${filePath}#view=${viewMode}`}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-same-origin allow-scripts allow-forms"
            loading="lazy"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DocumentViewer;
