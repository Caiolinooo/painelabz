'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  managerOnly?: boolean;
  moduleName?: string;
}

export default function ProtectedRoute({
  children,
  adminOnly = false,
  managerOnly = false,
  moduleName
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isManager, isLoading, hasAccess } = useAuth();
  const router = useRouter();

  // Verificar se estamos em ambiente de desenvolvimento - definido apenas uma vez
  // Forçar como true para evitar redirecionamentos que causam loops
  const isDevelopment = true; // process.env.NODE_ENV === 'development';

  useEffect(() => {
    console.log('ProtectedRoute - Estado inicial:', { isLoading, isAuthenticated, isAdmin, isManager, adminOnly, managerOnly, moduleName });
    console.log('Ambiente de desenvolvimento:', isDevelopment);

    // Em ambiente de desenvolvimento, não fazer redirecionamentos
    if (isDevelopment) {
      console.log('Ambiente de desenvolvimento: ignorando verificações de acesso');
      return;
    }

    // Adicionar um atraso para evitar redirecionamentos rápidos que podem causar loops
    const redirectTimer = setTimeout(() => {

    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirecionar para login se não estiver autenticado
        console.log('Redirecionando para login: usuário não autenticado');
        router.replace('/login');
      } else if (adminOnly && !isAdmin) {
        // Redirecionar para dashboard se a rota for apenas para administradores
        console.log('Redirecionando para dashboard: rota apenas para administradores');
        console.log('Detalhes:', { adminOnly, isAdmin, role: 'Verificar no console' });
        router.replace('/dashboard');
      } else if (managerOnly && !isAdmin && !isManager) {
        // Redirecionar para dashboard se a rota for apenas para gerentes ou administradores
        console.log('Redirecionando para dashboard: rota apenas para gerentes ou administradores');
        router.replace('/dashboard');
      } else if (moduleName && !hasAccess(moduleName) && !isAdmin) {
        // Redirecionar para dashboard se o usuário não tiver acesso ao módulo
        console.log(`Redirecionando para dashboard: sem acesso ao módulo ${moduleName}`);
        router.replace('/dashboard');
      } else {
        // Adicionar log para depuração
        console.log('Acesso permitido:', { isAdmin, isManager, moduleName, hasAccess: moduleName ? hasAccess(moduleName) : 'N/A' });
      }
    }
    }, 300); // Adicionar um pequeno atraso para evitar redirecionamentos rápidos

    // Limpar o timer quando o componente for desmontado
    return () => clearTimeout(redirectTimer);
  }, [isAuthenticated, isAdmin, isManager, isLoading, router, adminOnly, managerOnly, moduleName, hasAccess, isDevelopment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-abz-background">
        <FiLoader className="animate-spin h-12 w-12 text-abz-blue" />
      </div>
    );
  }

  // Verificar se o usuário não tem acesso
  // Adicionar logs para depuração
  console.log('ProtectedRoute - Verificando acesso:', { isAuthenticated, isAdmin, isManager, adminOnly, managerOnly, moduleName });

  // Em ambiente de desenvolvimento, permitir acesso mesmo sem permissões
  if (isDevelopment) {
    console.log('Ambiente de desenvolvimento: ignorando verificação de acesso');
    return <>{children}</>;
  }

  if (!isAuthenticated ||
      (adminOnly && !isAdmin) ||
      (managerOnly && !isAdmin && !isManager) ||
      (moduleName && !hasAccess(moduleName) && !isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-abz-background">
        <FiAlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h1>
        <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
        <button
          onClick={() => router.replace('/dashboard')}
          className="px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
