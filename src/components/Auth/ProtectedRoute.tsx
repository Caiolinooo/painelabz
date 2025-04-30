'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLoader, FiAlertCircle, FiTool } from 'react-icons/fi';
import Link from 'next/link';

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
  const { isAuthenticated, isAdmin, isManager, isLoading, hasAccess, user } = useAuth();
  const router = useRouter();
  const [showAdminFix, setShowAdminFix] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // Verificar se estamos em ambiente de desenvolvimento - definido apenas uma vez
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Verificar se o usuário deveria ser administrador
  const shouldBeAdmin = user?.email === 'caio.correia@groupabz.com' || user?.phoneNumber === '+5522997847289';

  useEffect(() => {
    console.log('ProtectedRoute - Estado inicial:', {
      isLoading,
      isAuthenticated,
      isAdmin,
      isManager,
      adminOnly,
      managerOnly,
      moduleName,
      userEmail: user?.email,
      userPhone: user?.phoneNumber,
      shouldBeAdmin
    });

    // Verificar se o usuário deveria ser administrador mas não está marcado como tal
    if (isAuthenticated && shouldBeAdmin && !isAdmin && !checkingAdmin) {
      console.log('Usuário deveria ser administrador mas não está marcado como tal');
      setShowAdminFix(true);
    }

    // Em ambiente de desenvolvimento, não fazer redirecionamentos
    if (isDevelopment) {
      console.log('Ambiente de desenvolvimento: redirecionamentos serão mais permissivos');

      // Mesmo em desenvolvimento, se for uma rota de admin e o usuário não for admin,
      // mostrar a opção de corrigir as permissões
      if (adminOnly && isAuthenticated && shouldBeAdmin && !isAdmin) {
        setShowAdminFix(true);
        return;
      }

      // Em desenvolvimento, permitir acesso a rotas protegidas se estiver autenticado
      if (isAuthenticated) {
        return;
      }
    }

    // Adicionar um atraso para evitar redirecionamentos rápidos que podem causar loops
    const redirectTimer = setTimeout(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Redirecionar para login se não estiver autenticado
          console.log('Redirecionando para login: usuário não autenticado');
          router.replace('/login');
        } else if (adminOnly && !isAdmin) {
          // Se o usuário deveria ser admin mas não está marcado como tal, mostrar opção de correção
          if (shouldBeAdmin) {
            console.log('Usuário deveria ser administrador mas não está marcado como tal');
            setShowAdminFix(true);
          } else {
            // Redirecionar para dashboard se a rota for apenas para administradores
            console.log('Redirecionando para dashboard: rota apenas para administradores');
            router.replace('/dashboard');
          }
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
  }, [isAuthenticated, isAdmin, isManager, isLoading, router, adminOnly, managerOnly, moduleName, hasAccess, isDevelopment, user, shouldBeAdmin, checkingAdmin]);

  // Função para corrigir as permissões de administrador
  const fixAdminPermissions = () => {
    setCheckingAdmin(true);
    router.push('/admin-fix');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-abz-background">
        <FiLoader className="animate-spin h-12 w-12 text-abz-blue" />
      </div>
    );
  }

  // Mostrar opção de correção de permissões de administrador
  if (showAdminFix) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-abz-background">
        <FiTool className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Correção de Permissões Necessária</h1>
        <p className="text-gray-600 mb-2">Você deveria ter permissões de administrador, mas elas não estão configuradas corretamente.</p>
        <p className="text-gray-600 mb-4">Clique no botão abaixo para corrigir este problema.</p>
        <div className="flex space-x-4">
          <button
            onClick={fixAdminPermissions}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            disabled={checkingAdmin}
          >
            {checkingAdmin ? (
              <span className="flex items-center">
                <FiLoader className="animate-spin mr-2" />
                Corrigindo...
              </span>
            ) : (
              'Corrigir Permissões'
            )}
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Verificar acesso em ambiente de produção
  if (!isDevelopment && (
    !isAuthenticated ||
    (adminOnly && !isAdmin) ||
    (managerOnly && !isAdmin && !isManager) ||
    (moduleName && !hasAccess(moduleName) && !isAdmin)
  )) {
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

  // Em desenvolvimento, permitir acesso se estiver autenticado
  return <>{children}</>;
}
