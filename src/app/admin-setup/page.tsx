'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiUser, FiMail, FiPhone, FiLock, FiCheck, FiAlertTriangle, FiLoader } from 'react-icons/fi';

export default function AdminSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar se já existe um usuário administrador
    const checkAdmin = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/create-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (response.ok) {
          setIsSuccess(true);
          setAdminInfo(data.user);
          
          // Redirecionar para a página de login após 3 segundos
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setError(data.error || 'Erro ao configurar usuário administrador');
        }
      } catch (error) {
        setError('Erro ao conectar com o servidor');
        console.error('Erro:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/LC1_Azul.png"
            alt="ABZ Group Logo"
            width={180}
            height={60}
            className="h-auto"
            priority
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Configuração do Administrador
        </h1>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FiLoader className="w-12 h-12 text-abz-blue animate-spin mb-4" />
            <p className="text-gray-600">Configurando usuário administrador...</p>
          </div>
        ) : isSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">Configuração Concluída!</h2>
            <p className="text-green-700 mb-4">
              O usuário administrador foi configurado com sucesso.
            </p>
            
            {adminInfo && (
              <div className="bg-white rounded-lg border border-green-100 p-4 text-left mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <FiUser className="text-gray-500 mr-2" />
                    <span className="text-gray-600">Nome:</span>
                  </div>
                  <div className="font-medium">{adminInfo.firstName} {adminInfo.lastName}</div>
                  
                  <div className="flex items-center">
                    <FiMail className="text-gray-500 mr-2" />
                    <span className="text-gray-600">Email:</span>
                  </div>
                  <div className="font-medium">{adminInfo.email}</div>
                  
                  <div className="flex items-center">
                    <FiPhone className="text-gray-500 mr-2" />
                    <span className="text-gray-600">Telefone:</span>
                  </div>
                  <div className="font-medium">{adminInfo.phoneNumber}</div>
                  
                  <div className="flex items-center">
                    <FiLock className="text-gray-500 mr-2" />
                    <span className="text-gray-600">Senha:</span>
                  </div>
                  <div className="font-medium">Definida nas variáveis de ambiente</div>
                </div>
              </div>
            )}
            
            <p className="text-gray-600 text-sm">
              Você será redirecionado para a página de login em instantes...
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Erro na Configuração</h2>
            <p className="text-red-700 mb-4">
              {error || 'Ocorreu um erro ao configurar o usuário administrador.'}
            </p>
            <p className="text-gray-600 text-sm">
              Verifique as variáveis de ambiente e tente novamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-abz-blue text-white px-4 py-2 rounded-md hover:bg-abz-blue-dark transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
