'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle } from 'react-icons/fi';

export default function AdminNotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a página principal do admin após 3 segundos
    const timer = setTimeout(() => {
      router.replace('/admin/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <FiAlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Página não encontrada</h1>
      <p className="text-gray-600 mb-4">A página que você está procurando não existe.</p>
      <p className="text-gray-500">Redirecionando para o painel administrativo...</p>
    </div>
  );
}
