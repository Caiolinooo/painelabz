'use client';

import React from 'react';
import MultiPdfViewer from '@/components/MultiPdfViewer';

interface LazyDocumentViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
  allowDownload?: boolean;
  accentColor?: string;
}

/**
 * A wrapper for the PDF viewer component
 * Using a simpler implementation to avoid SSR issues
 */
export default function LazyDocumentViewer(props: LazyDocumentViewerProps) {
  // Registrar o caminho do arquivo para debug
  console.log('LazyDocumentViewer - Caminho do arquivo:', props.filePath);

  return <MultiPdfViewer title={props.title} filePath={props.filePath} onClose={props.onClose} />;
}
