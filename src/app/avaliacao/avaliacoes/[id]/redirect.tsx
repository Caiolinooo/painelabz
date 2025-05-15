'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Componente de redirecionamento para manter a compatibilidade com links existentes
 */
export default function AvaliacaoDetailRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;

  useEffect(() => {
    // Redirecionar para a nova rota
    router.replace(`/avaliacao/${id}`);
  }, [router, id]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecionando para a página de detalhes da avaliação...</p>
      </div>
    </div>
  );
}
