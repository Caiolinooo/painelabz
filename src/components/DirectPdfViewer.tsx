'use client';

import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiExternalLink } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import UniversalPdfViewer from './UniversalPdfViewer';

interface DirectPdfViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
}

const DirectPdfViewer: React.FC<DirectPdfViewerProps> = ({
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

export default DirectPdfViewer;
