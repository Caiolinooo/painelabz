'use client';

import React from 'react';
import { FiX, FiDownload, FiMaximize, FiMinimize } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import PdfJsViewer from './PdfJsViewer';
import UniversalPdfViewer from './UniversalPdfViewer';

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
  // Usar o visualizador universal para todos os casos
  return (
    <UniversalPdfViewer
      title={title}
      filePath={filePath}
      onClose={onClose}
      allowDownload={allowDownload}
    />
  );
};

export default DocumentViewer;
