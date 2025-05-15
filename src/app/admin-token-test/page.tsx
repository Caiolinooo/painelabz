'use client';

import { useState, useEffect } from 'react';
import { FiKey, FiUser, FiCheck, FiX, FiCopy } from 'react-icons/fi';

export default function AdminTokenTest() {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  
  useEffect(() => {
    // Verificar se há um token no localStorage
    const storedToken = localStorage.getItem('token') || localStorage.getItem('abzToken');
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    }
    
    // Verificar se há um token no arquivo .token
    fetch('/.token')
      .then(response => {
        if (response.ok) {
          return response.text();
        }
        throw new Error('Token não encontrado');
      })
      .then(fileToken => {
        if (fileToken && (!storedToken || fileToken !== storedToken)) {
          setToken(fileToken);
          localStorage.setItem('token', fileToken);
          verifyToken(fileToken);
        }
      })
      .catch(err => {
        console.log('Token não encontrado no arquivo:', err);
      });
  }, []);
  
  const verifyToken = async (tokenToVerify: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Token válido! Usuário autenticado com sucesso.');
        setUserData(data.user);
      } else {
        setError(`Erro ao verificar token: ${data.error || 'Erro desconhecido'}`);
        setUserData(null);
      }
    } catch (err) {
      setError(`Erro ao verificar token: ${err instanceof Error ? err.message : String(err)}`);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };
  
  const generateToken = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Executar o script para gerar o token
      const response = await fetch('/api/admin/generate-token', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setSuccess('Token gerado com sucesso!');
        verifyToken(data.token);
      } else {
        setError(`Erro ao gerar token: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      setError(`Erro ao gerar token: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setSuccess('Token copiado para a área de transferência!');
    setTimeout(() => setSuccess(null), 3000);
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <FiKey className="mr-2" /> Teste de Token de Administrador
      </h1>
      
      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={generateToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
            disabled={loading}
          >
            <FiKey className="mr-2" />
            Gerar Token de Administrador
          </button>
        </div>
        
        {token && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Token JWT</h2>
              <button
                onClick={copyToken}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Copiar token"
              >
                <FiCopy />
              </button>
            </div>
            <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
              <code className="text-sm break-all">{token}</code>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <FiX className="mr-2" /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <FiCheck className="mr-2" /> {success}
          </div>
        )}
        
        {userData && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h2 className="text-lg font-medium mb-2 flex items-center">
              <FiUser className="mr-2" /> Informações do Usuário
            </h2>
            <div className="bg-white p-4 rounded-md">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
