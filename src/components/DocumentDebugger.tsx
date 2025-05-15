'use client';

import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';

interface DocumentDebuggerProps {
  filePath: string;
}

const DocumentDebugger: React.FC<DocumentDebuggerProps> = ({ filePath }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkDocument = async () => {
      try {
        const response = await fetch(filePath, { method: 'HEAD' });
        
        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(`Status: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage(`Erro: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    checkDocument();
  }, [filePath]);

  return (
    <div className="p-4 border rounded-md mb-4">
      <h3 className="font-semibold mb-2">Verificação de Documento</h3>
      <p className="text-sm mb-2">Caminho: {filePath}</p>
      
      <div className="flex items-center">
        {status === 'loading' && (
          <>
            <FiLoader className="animate-spin mr-2 text-blue-500" />
            <span>Verificando documento...</span>
          </>
        )}
        
        {status === 'success' && (
          <>
            <FiCheckCircle className="mr-2 text-green-500" />
            <span className="text-green-700">Documento disponível</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <FiAlertCircle className="mr-2 text-red-500" />
            <span className="text-red-700">Erro ao acessar documento: {errorMessage}</span>
          </>
        )}
      </div>
      
      {status === 'success' && (
        <div className="mt-4">
          <p className="text-sm mb-2">Teste de visualização:</p>
          <iframe 
            src={filePath} 
            className="w-full h-40 border"
            title="Teste de documento"
          />
        </div>
      )}
    </div>
  );
};

export default DocumentDebugger;
