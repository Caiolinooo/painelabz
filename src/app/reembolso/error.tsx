'use client';

import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReembolsoErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Log the error to help with debugging
  React.useEffect(() => {
    console.error('Reimbursement page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <FiAlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🇧🇷 Ocorreu um erro
          </h1>
          
          <p className="text-gray-600 mb-6">
            Desculpe, ocorreu um erro ao carregar a página de reembolso. Nossa equipe foi notificada.
          </p>
          
          {error.message && (
            <div className="w-full bg-gray-100 p-4 rounded mb-6 text-left overflow-auto max-h-32">
              <p className="text-sm font-mono text-gray-700">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FiRefreshCw className="mr-2" />
              Tentar novamente
            </button>
            
            <Link
              href="/"
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FiHome className="mr-2" />
              Página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
