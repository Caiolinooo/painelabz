'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Componente de redirecionamento para manter a compatibilidade com links existentes
 * Usando window.location.href para garantir um redirecionamento completo
 */
export default function NovaAvaliacaoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Adicionar timestamp para evitar cache
    const timestamp = Date.now();
    
    // Usar window.location para garantir um redirecionamento completo
    window.location.href = `/avaliacao/nova?t=${timestamp}`;
  }, []);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecionando para a página de criação de avaliação...</p>
      </div>
    </div>
  );
}
