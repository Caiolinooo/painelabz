'use client';

import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Erro crítico</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {error.message || 'Ocorreu um erro crítico na aplicação. Por favor, tente novamente.'}
                </p>
                {error.digest && (
                  <p className="mt-1 text-xs text-gray-400">
                    Código de erro: {error.digest}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => reset()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiRefreshCw className="mr-2 -ml-1 h-4 w-4" />
                  Reiniciar aplicação
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
