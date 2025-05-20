'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SetPasswordModal } from './SetPasswordModal';
import { fetchWrapper } from '@/lib/fetch-wrapper';

interface PasswordRequiredGuardProps {
  children: React.ReactNode;
}

export function PasswordRequiredGuard({ children }: PasswordRequiredGuardProps) {
  const { user, isAuthenticated, isLoading, requiresPassword } = useAuth();
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);
  const router = useRouter();

  // Verificar se o usuário tem senha definida
  useEffect(() => {
    const checkUserPassword = async () => {
      if (!isAuthenticated || !user) {
        setIsCheckingPassword(false);
        return;
      }

      try {
        // Verificar se o usuário tem senha definida
        const response = await fetchWrapper.get('/api/auth/check-has-password');
        
        if (response.hasPassword) {
          setHasPassword(true);
        } else {
          setHasPassword(false);
          setShowSetPasswordModal(true);
        }
      } catch (error) {
        console.error('Erro ao verificar senha do usuário:', error);
      } finally {
        setIsCheckingPassword(false);
      }
    };

    checkUserPassword();
  }, [isAuthenticated, user]);

  // Função para lidar com o sucesso da definição de senha
  const handlePasswordSetSuccess = () => {
    setPasswordSet(true);
  };

  // Função para fechar o modal de definição de senha
  const handleCloseSetPasswordModal = () => {
    if (passwordSet) {
      setShowSetPasswordModal(false);
      setHasPassword(true);
    }
  };

  // Se estiver carregando ou verificando a senha, mostrar indicador de carregamento
  if (isLoading || isCheckingPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-abz-background">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abz-blue"></div>
          <p className="mt-4 text-abz-blue font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, redirecionar para o login
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  return (
    <>
      {/* Modal de definição de senha */}
      <SetPasswordModal
        isOpen={showSetPasswordModal}
        onClose={handleCloseSetPasswordModal}
        onSuccess={handlePasswordSetSuccess}
        isNewUser={false}
      />

      {/* Renderizar os filhos apenas se o usuário tiver senha definida ou o modal estiver aberto */}
      {(hasPassword || showSetPasswordModal) && children}
    </>
  );
}
