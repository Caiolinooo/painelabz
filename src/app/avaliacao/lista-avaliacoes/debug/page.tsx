'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Importar o componente de debug dinamicamente
const DebugComponent = dynamic(() => import('../../avaliacoes/debug/page'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
    </div>
  )
});

export default function ListaAvaliacoesDebugPage() {
  return <DebugComponent />;
}
