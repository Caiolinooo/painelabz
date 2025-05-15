'use client';

import React, { useState } from 'react';
import { FiX, FiDownload, FiAlertCircle, FiLoader } from 'react-icons/fi';
import PdfJsViewer from './PdfJsViewer';
import { useI18n } from '@/contexts/I18nContext';
import UniversalPdfViewer from './UniversalPdfViewer';

interface SimplePdfViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
}

const SimplePdfViewer: React.FC<SimplePdfViewerProps> = ({
  title,
  filePath,
  onClose
}) => {
  // Usar o visualizador universal para todos os casos
  return (
    <UniversalPdfViewer
      title={title}
      filePath={filePath}
      onClose={onClose}
      allowDownload={true}
    />
  );
};

export default SimplePdfViewer;
