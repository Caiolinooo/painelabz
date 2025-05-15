'use client';

import React, { useState, useEffect } from 'react';

export default function TestUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Obter token do localStorage
        const abzToken = localStorage.getItem('token') || localStorage.getItem('abzToken');
        setToken(abzToken);

        if (!abzToken) {
          setError('Token não encontrado. Faça login primeiro.');
          setLoading(false);
          return;
        }

        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/test-users-unified?_=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${abzToken}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        setData(responseData);
      } catch (error) {
        console.error('Erro ao testar API:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Teste de API de Usuários</h1>

      {loading && (
        <div className="bg-blue-50 p-4 rounded-md mb-4">
          <p className="text-blue-700">Carregando...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <p className="text-red-700 font-bold">Erro:</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {token && (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <p className="font-bold">Token:</p>
          <p className="text-sm break-all">{token}</p>
        </div>
      )}

      {data && (
        <div className="bg-green-50 p-4 rounded-md mb-4">
          <p className="text-green-700 font-bold">Sucesso!</p>
          <p className="mb-2">Mensagem: {data.message}</p>
          <p className="mb-2">Quantidade de usuários: {data.count}</p>
          <p className="mb-2">Campos disponíveis: {data.fields?.join(', ')}</p>

          {data.sample && data.sample.length > 0 && (
            <div className="mt-4">
              <p className="font-bold mb-2">Amostra de usuários:</p>
              <pre className="bg-white p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(data.sample, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Testar Novamente
        </button>
      </div>
    </div>
  );
}
