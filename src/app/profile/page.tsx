'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiPhone, FiSettings } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';
import ServerUserReimbursementSettings from '@/components/admin/ServerUserReimbursementSettings';

export default function ProfilePage() {
  const { user, profile, isLoading } = useSupabaseAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showReimbursementSettings, setShowReimbursementSettings] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user || !profile) {
    return (
      <MainLayout>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Não autenticado</h1>
            <p className="mb-4">Você precisa estar logado para acessar esta página.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark"
            >
              Fazer login
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-abz-blue mb-6 flex items-center">
          <FiUser className="mr-2" /> Meu Perfil
        </h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações pessoais */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome completo</p>
                    <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center">
                      <FiMail className="mr-2 text-gray-400" />
                      {profile.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium flex items-center">
                      <FiPhone className="mr-2 text-gray-400" />
                      {profile.phone_number || 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações profissionais */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Profissionais</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Cargo</p>
                    <p className="font-medium">{profile.position || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Departamento</p>
                    <p className="font-medium">{profile.department || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Função no sistema</p>
                    <p className="font-medium">
                      {profile.role === 'ADMIN' ? 'Administrador' :
                       profile.role === 'MANAGER' ? 'Gerente' : 'Usuário'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações adicionais */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações</h2>

              <div className="space-y-4">
                <button
                  onClick={() => setShowReimbursementSettings(true)}
                  className="flex items-center text-abz-blue hover:text-abz-blue-dark"
                >
                  <FiSettings className="mr-2" />
                  <span>Configurações de Email de Reembolso</span>
                </button>
              </div>

              {showReimbursementSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="max-w-2xl w-full">
                    <ServerUserReimbursementSettings
                      email={profile.email}
                      onClose={() => setShowReimbursementSettings(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
