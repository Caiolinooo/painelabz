'use client';

import React, { Suspense, lazy } from 'react';
import { FiLoader } from 'react-icons/fi';

// Lazy load the DocumentViewer component
const DocumentViewer = lazy(() => import('@/components/DocumentViewer'));

interface LazyDocumentViewerProps {
  title: string;
  filePath: string;
  onClose: () => void;
  allowDownload?: boolean;
  accentColor?: string;
}

/**
 * A lazy-loaded wrapper for the DocumentViewer component
 * This reduces the initial bundle size by loading the DocumentViewer only when needed
 */
export default function LazyDocumentViewer(props: LazyDocumentViewerProps) {
  return (
    <Suspense 
      fallback={
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <FiLoader className="animate-spin h-10 w-10 text-abz-blue mb-4" />
            <p className="text-gray-700">Carregando visualizador...</p>
          </div>
        </div>
      }
    >
      <DocumentViewer {...props} />
    </Suspense>
  );
}
