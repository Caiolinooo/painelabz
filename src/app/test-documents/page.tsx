'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import DocumentDebugger from '@/components/DocumentDebugger';

export default function TestDocumentsPage() {
  // Lista de documentos para testar
  const documents = [
    {
      id: 'hse-pt',
      title: 'Política de HSE',
      file: '/documentos/politicas/PL-HSE-R0 - Política de HSE_ABZ Group-PORT.pdf'
    },
    {
      id: 'qua-pt',
      title: 'Política da Qualidade',
      file: '/documentos/politicas/PL-QUA-R8 - Politica da Qualidade_ABZ Group-PORT.pdf'
    },
    {
      id: 'qua-en',
      title: 'Quality Policy',
      file: '/documentos/politicas/PL-QUA-a-R8 - Quality Policy_ABZ Group-ENG.pdf'
    },
    {
      id: 'manual-logistica',
      title: 'Manual de Logística',
      file: '/documentos/manuais/Manual de logística.pdf'
    },
    {
      id: 'manual-ponto',
      title: 'Manual de Uso Ponto Ahgora',
      file: '/documentos/manuais/Manual de Uso Ponto Ahgora.pdf'
    }
  ];

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">Teste de Visualização de Documentos</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold text-abz-text-black mb-4">Diagnóstico de Documentos</h2>
        <p className="mb-4">Esta página verifica se os documentos estão acessíveis e podem ser visualizados corretamente.</p>

        <div className="space-y-4">
          {documents.map(doc => (
            <div key={doc.id} className="border-b pb-4 last:border-b-0">
              <h3 className="font-semibold text-lg mb-2">{doc.title}</h3>
              <DocumentDebugger filePath={doc.file} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-abz-text-black mb-4">Informações de Depuração</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Navegador:</h3>
            <p className="text-sm" id="browser-info">Carregando...</p>
          </div>

          <div>
            <h3 className="font-semibold">Suporte a PDF:</h3>
            <p className="text-sm" id="pdf-support">Verificando...</p>
          </div>
        </div>
      </div>

      {/* Script para detectar informações do navegador */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            // Detectar navegador
            const browserInfo = document.getElementById('browser-info');
            const userAgent = navigator.userAgent;
            browserInfo.textContent = userAgent;

            // Verificar suporte a PDF
            const pdfSupport = document.getElementById('pdf-support');

            // Tenta criar um objeto de plugin PDF
            const isPdfSupported =
              navigator.mimeTypes &&
              navigator.mimeTypes['application/pdf'] ?
              'Suportado nativamente' : 'Não suportado nativamente';

            pdfSupport.textContent = isPdfSupported;
          });
        `
      }} />
    </MainLayout>
  );
}
