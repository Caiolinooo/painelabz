'use client';

import { FiLoader } from 'react-icons/fi';

interface LoadingIndicatorProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingIndicator({ message = 'Carregando...', fullScreen = true }: LoadingIndicatorProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-10'} bg-gray-50`}>
      <FiLoader className="animate-spin h-10 w-10 text-blue-600 mb-4" />
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  );
}
