'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

export default function AdminFixPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Verificando configuração de administrador...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [steps, setSteps] = useState<{id: string; name: string; status: 'pending' | 'loading' | 'success' | 'error'; message?: string}[]>([
    { id: 'admin', name: 'Verificar usuário administrador', status: 'pending' },
    { id: 'token', name: 'Verificar token de autenticação', status: 'pending' },
    { id: 'permissions', name: 'Verificar permissões', status: 'pending' },
    { id: 'redirect', name: 'Redirecionar para o painel', status: 'pending' }
  ]);
  const router = useRouter();

  // Função para atualizar o status de uma etapa
  const updateStepStatus = (id: string, status: 'pending' | 'loading' | 'success' | 'error', message?: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === id ? { ...step, status, message } : step
      )
    );
  };

  useEffect(() => {
    const fixAdminConfig = async () => {
      try {
        // Etapa 1: Verificar e corrigir o usuário administrador
        updateStepStatus('admin', 'loading');
        setMessage('Verificando usuário administrador...');

        console.log('Iniciando correção do usuário administrador');
        const adminResponse = await fetch('/api/admin/fix-admin');
        console.log('Resposta da API fix-admin:', adminResponse.status, adminResponse.statusText);

        if (!adminResponse.ok) {
          const errorData = await adminResponse.json();
          console.error('Erro na API fix-admin:', errorData);
          updateStepStatus('admin', 'error', errorData.message || 'Erro ao verificar usuário administrador');
          throw new Error(errorData.message || 'Erro ao verificar usuário administrador');
        }

        const adminData = await adminResponse.json();
        updateStepStatus('admin', 'success', adminData.message);
        setMessage(`${adminData.message}. Verificando token...`);

        // Etapa 2: Verificar e corrigir o token
        updateStepStatus('token', 'loading');
        const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

        if (!token) {
          updateStepStatus('token', 'error', 'Token não encontrado. Você precisará fazer login novamente.');
          setMessage('Token não encontrado. Você precisará fazer login novamente.');

          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            router.push('/login');
          }, 3000);

          return;
        }

        console.log('Iniciando verificação do token');
        const tokenResponse = await fetch('/api/auth/fix-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Resposta da API fix-token:', tokenResponse.status, tokenResponse.statusText);

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('Erro na API fix-token:', errorData);
          updateStepStatus('token', 'error', errorData.message || 'Erro ao verificar token');
          throw new Error(errorData.message || 'Erro ao verificar token');
        }

        const tokenData = await tokenResponse.json();

        if (tokenData.token) {
          // Atualizar o token no localStorage
          localStorage.setItem('token', tokenData.token);
          localStorage.setItem('abzUser', JSON.stringify(tokenData.user));
          updateStepStatus('token', 'success', 'Token atualizado com sucesso');
        } else {
          updateStepStatus('token', 'success', 'Token verificado');
        }

        // Etapa 3: Verificar e corrigir permissões
        updateStepStatus('permissions', 'loading');
        setMessage('Verificando permissões de administrador...');

        console.log('Iniciando verificação de permissões');
        const currentToken = localStorage.getItem('token') || localStorage.getItem('abzToken') || token;
        console.log('Token usado para verificação de permissões:', currentToken ? 'Token presente' : 'Token ausente');

        const permissionsResponse = await fetch('/api/admin/fix-permissions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });
        console.log('Resposta da API fix-permissions:', permissionsResponse.status, permissionsResponse.statusText);

        if (!permissionsResponse.ok) {
          const errorData = await permissionsResponse.json();
          console.error('Erro na API fix-permissions:', errorData);
          updateStepStatus('permissions', 'error', errorData.message || 'Erro ao verificar permissões');
          throw new Error(errorData.message || 'Erro ao verificar permissões');
        }

        const permissionsData = await permissionsResponse.json();
        updateStepStatus('permissions', 'success', permissionsData.message);
        setMessage(`${permissionsData.message}. Redirecionando...`);

        // Etapa 4: Redirecionar para o painel de administração
        updateStepStatus('redirect', 'loading');
        setSuccess(true);

        // Redirecionar após 3 segundos
        setTimeout(() => {
          updateStepStatus('redirect', 'success', 'Redirecionando para o painel de administração');
          router.push('/admin/user-management');
        }, 3000);
      } catch (error) {
        console.error('Erro ao corrigir configuração de administrador:', error);

        // Exibir mensagem de erro mais detalhada
        let errorMessage = 'Erro desconhecido';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }

        setError(`Erro ao corrigir configuração: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fixAdminConfig();
  }, [router]);

  // Função para tentar novamente
  const retryFix = () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setMessage('Verificando configuração de administrador...');
    setSteps(steps.map(step => ({ ...step, status: 'pending', message: undefined })));

    // Recarregar a página para tentar novamente
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Correção de Configuração de Administrador</h1>

        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center">
              {step.status === 'pending' && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0"></div>
              )}
              {step.status === 'loading' && (
                <FiLoader className="w-6 h-6 text-blue-500 animate-spin flex-shrink-0" />
              )}
              {step.status === 'success' && (
                <FiCheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              )}
              {step.status === 'error' && (
                <FiAlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              )}

              <div className="ml-3 flex-1">
                <p className={`font-medium ${
                  step.status === 'success' ? 'text-green-700' :
                  step.status === 'error' ? 'text-red-700' :
                  step.status === 'loading' ? 'text-blue-700' :
                  'text-gray-700'
                }`}>
                  {step.name}
                </p>
                {step.message && (
                  <p className="text-sm text-gray-500">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center mt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 text-center">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={retryFix}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FiRefreshCw className="mr-2" />
                Tentar Novamente
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Ir para Login
              </button>
            </div>
          </div>
        )}

        {success && !loading && !error && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Sucesso</p>
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
