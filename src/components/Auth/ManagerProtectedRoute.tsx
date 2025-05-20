'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import ClientOnly from '@/components/ClientOnly';
import { FiLoader } from 'react-icons/fi';
import { getToken, fetchWithToken } from '@/lib/tokenStorage';
import { supabase } from '@/lib/supabase';

interface ManagerProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Componente de carregamento simples
 */
const LoadingIndicator = () => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-abz-background">
      <FiLoader className="animate-spin h-12 w-12 text-abz-blue mb-4" />
      <p className="text-gray-600">{t('common.loading', 'Carregando...')}</p>
    </div>
  );
};

/**
 * Componente que protege rotas para que apenas gerentes e administradores possam acessá-las.
 * Redireciona usuários não autorizados para a página especificada ou para o dashboard.
 */
const ManagerProtectedRoute: React.FC<ManagerProtectedRouteProps> = ({
  children,
  redirectTo = '/dashboard',
}) => {
  const { user, profile, isLoading, isAdmin: contextIsAdmin, isManager: contextIsManager } = useSupabaseAuth();
  const router = useRouter();
  const { t } = useI18n();

  // Forçar isAdmin e isManager para true se estivermos na rota de avaliação
  const isAvaliacaoRoute = typeof window !== 'undefined' && window.location.pathname.includes('/avaliacao');
  const isAdmin = contextIsAdmin || (isAvaliacaoRoute && process.env.NODE_ENV === 'development');
  const isManager = contextIsManager || (isAvaliacaoRoute && process.env.NODE_ENV === 'development');

  useEffect(() => {
    const checkAuth = async () => {
      // Adicionar logs para depuração
      console.log('ManagerProtectedRoute - Estado atual:', {
        isLoading,
        user: user ? 'Autenticado' : 'Não autenticado',
        profile: profile ? `Role: ${profile.role}` : 'Sem perfil',
        isAdmin,
        isManager
      });

      // Verificar se há um token válido usando o utilitário
      const token = getToken();
      if (!token) {
        console.log('ManagerProtectedRoute - Token não encontrado, redirecionando para login');
        router.push('/login');
        return;
      }

      console.log('ManagerProtectedRoute - Token encontrado, comprimento:', token.length);

      // Se está carregando, aguardar
      if (isLoading) {
        console.log('ManagerProtectedRoute - Carregando dados do usuário...');
        return;
      }

      // Se não houver usuário autenticado, tentar renovar o token antes de redirecionar
      if (!user) {
        console.log('ManagerProtectedRoute - Usuário não autenticado, tentando renovar token...');

        try {
          // Enviar o token atual no corpo da requisição
          const refreshResponse = await fetch('/api/auth/token-refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
          });

          if (refreshResponse.ok) {
            console.log('ManagerProtectedRoute - Token renovado com sucesso, processando resposta...');

            // Processar a resposta para obter o novo token
            const refreshData = await refreshResponse.json();

            if (refreshData.token) {
              console.log('ManagerProtectedRoute - Novo token recebido, atualizando...');

              // Importar e usar o utilitário para salvar o token
              import('@/lib/tokenStorage').then(({ saveToken }) => {
                saveToken(refreshData.token, refreshData.expiresIn || 86400);

                // Verificar se o token foi definido nos cookies
                const tokenInCookie = document.cookie.includes('abzToken=') || document.cookie.includes('token=');
                console.log('ManagerProtectedRoute - Token nos cookies:', tokenInCookie ? 'Presente' : 'Ausente');

                // Recarregar a página para usar o novo token
                window.location.reload();
              });

              return;
            } else {
              console.log('ManagerProtectedRoute - Resposta de renovação não contém token');

              // Verificar se o token foi definido nos cookies mesmo assim
              const tokenInCookie = document.cookie.includes('abzToken=') || document.cookie.includes('token=');
              console.log('ManagerProtectedRoute - Token nos cookies:', tokenInCookie ? 'Presente' : 'Ausente');

              if (tokenInCookie) {
                // Se o token estiver nos cookies, recarregar a página
                window.location.reload();
                return;
              }

              // Continuar aguardando a atualização do contexto
              return;
            }
          } else {
            console.log('ManagerProtectedRoute - Falha ao renovar token, redirecionando para login');
            router.push('/login');
            return;
          }
        } catch (error) {
          console.error('ManagerProtectedRoute - Erro ao renovar token:', error);
          router.push('/login');
          return;
        }
      }

      // Se não houver perfil, aguardar
      if (!profile) {
        console.log('ManagerProtectedRoute - Perfil do usuário não carregado ainda');
        return;
      }

      // Verificar se o usuário tem permissão para acessar a rota
      if (!isAdmin && !isManager) {
        console.log('ManagerProtectedRoute - Usuário não tem permissão para acessar esta rota:', profile.role);
        console.log('ManagerProtectedRoute - Redirecionando para', redirectTo);
        router.push(redirectTo);
        return;
      }

      console.log('ManagerProtectedRoute - Acesso permitido para', profile.role);

      // Verificar se o token ainda é válido fazendo uma chamada à API
      try {
        console.log('ManagerProtectedRoute - Verificando token...');
        const response = await fetchWithToken('/api/auth/verify-token');

        // Tentar obter a resposta como JSON para análise detalhada
        let responseData;
        try {
          responseData = await response.json();
          console.log('ManagerProtectedRoute - Resposta da verificação:', responseData);
        } catch (jsonError) {
          console.error('ManagerProtectedRoute - Erro ao parsear resposta:', jsonError);
        }

        if (!response.ok) {
          console.log('ManagerProtectedRoute - Token inválido, tentando renovar...', response.status);

          // Verificar se o token está expirado
          const isExpired = responseData?.expired ||
                           (responseData?.error && responseData.error.includes('expirado'));

          console.log('ManagerProtectedRoute - Token expirado?', isExpired ? 'Sim' : 'Não');

          // Tentar renovar o token
          console.log('ManagerProtectedRoute - Iniciando renovação de token...');
          try {
            const refreshResponse = await fetch('/api/auth/token-refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ token })
            });

            console.log('ManagerProtectedRoute - Resposta da renovação:', refreshResponse.status);

            if (!refreshResponse.ok) {
              console.log('ManagerProtectedRoute - Falha ao renovar token, redirecionando para login');

              // Usar o utilitário para remover o token
              const { removeToken } = await import('@/lib/tokenStorage');
              removeToken();

              // Redirecionar para login com o caminho atual como redirecionamento
              const currentPath = window.location.pathname;
              router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
              return;
            }

            // Processar a resposta para obter o novo token
            const refreshData = await refreshResponse.json();
            console.log('ManagerProtectedRoute - Dados da renovação:', refreshData);

            if (refreshData.token) {
              console.log('ManagerProtectedRoute - Novo token recebido, atualizando...');

              // Importar e usar o utilitário para salvar o token
              const { saveToken } = await import('@/lib/tokenStorage');
              saveToken(refreshData.token, refreshData.expiresIn || 86400);

              // Verificar se o token foi definido nos cookies
              const tokenInCookie = document.cookie.includes('abzToken=') || document.cookie.includes('token=');
              console.log('ManagerProtectedRoute - Token nos cookies:', tokenInCookie ? 'Presente' : 'Ausente');

              // Se recebemos dados do usuário, verificar permissões
              if (refreshData.user) {
                console.log('ManagerProtectedRoute - Dados do usuário recebidos:', refreshData.user);

                // Verificar se o usuário tem permissão para acessar a rota
                const userRole = refreshData.user.role;
                if (userRole === 'ADMIN' || userRole === 'MANAGER') {
                  console.log('ManagerProtectedRoute - Usuário tem permissão para acessar esta rota:', userRole);
                  // Recarregar a página para atualizar o contexto
                  window.location.reload();
                } else {
                  console.log('ManagerProtectedRoute - Usuário não tem permissão para acessar esta rota:', userRole);
                  router.push(redirectTo);
                }
              } else {
                // Recarregar a página para usar o novo token
                window.location.reload();
              }
            } else {
              console.log('ManagerProtectedRoute - Resposta de renovação não contém token');

              // Verificar se o token foi definido nos cookies mesmo assim
              const tokenInCookie = document.cookie.includes('abzToken=') || document.cookie.includes('token=');
              console.log('ManagerProtectedRoute - Token nos cookies:', tokenInCookie ? 'Presente' : 'Ausente');

              if (tokenInCookie) {
                // Se o token estiver nos cookies, recarregar a página
                window.location.reload();
              } else {
                // Se não houver token nos cookies, redirecionar para login
                const currentPath = window.location.pathname;
                router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
              }
            }
          } catch (refreshError) {
            console.error('ManagerProtectedRoute - Erro ao renovar token:', refreshError);

            // Remover token inválido
            const { removeToken } = await import('@/lib/tokenStorage');
            removeToken();

            // Redirecionar para login
            const currentPath = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
          }
        } else if (responseData?.success) {
          console.log('ManagerProtectedRoute - Token verificado com sucesso');

          // Verificar se o papel do usuário no token corresponde ao perfil
          if (responseData.role && profile && responseData.role !== profile.role) {
            console.log('ManagerProtectedRoute - Papel do usuário no token não corresponde ao perfil, atualizando...');
            console.log('ManagerProtectedRoute - Token:', responseData.role, 'Perfil:', profile.role);

            // Tentar recarregar o perfil do usuário
            try {
              const { data: userData, error } = await supabase
                .from('users_unified')
                .select('*')
                .eq('id', responseData.userId)
                .single();

              if (!error && userData) {
                console.log('ManagerProtectedRoute - Perfil do usuário atualizado com sucesso');
                // Recarregar a página para atualizar o contexto
                window.location.reload();
              } else {
                console.error('ManagerProtectedRoute - Erro ao buscar perfil do usuário:', error);
              }
            } catch (error) {
              console.error('ManagerProtectedRoute - Erro ao atualizar perfil do usuário:', error);
            }
          }
        } else {
          console.error('ManagerProtectedRoute - Resposta inesperada da verificação de token:', responseData);
        }
      } catch (error) {
        console.error('ManagerProtectedRoute - Erro ao verificar token:', error);

        // Verificar se é um erro de rede
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log('ManagerProtectedRoute - Erro de rede, não redirecionando');
          // Não redirecionar em caso de erro de rede, apenas logar
        } else {
          // Para outros tipos de erro, tentar renovar o token
          console.log('ManagerProtectedRoute - Tentando renovar token após erro...');

          try {
            const refreshResponse = await fetch('/api/auth/token-refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ token })
            });

            if (refreshResponse.ok) {
              // Se conseguiu renovar, recarregar a página
              window.location.reload();
            }
          } catch (refreshError) {
            console.error('ManagerProtectedRoute - Erro ao renovar token após erro:', refreshError);
          }
        }
      }
    };

    checkAuth();
  }, [user, profile, isLoading, isAdmin, isManager, router, redirectTo]);

  // Usar ClientOnly para evitar problemas de hidratação
  return (
    <ClientOnly fallback={null}>
      {isLoading || !user || !profile ? (
        <LoadingIndicator />
      ) : !isAdmin && !isManager ? (
        <LoadingIndicator />
      ) : (
        children
      )}
    </ClientOnly>
  );
};

export default ManagerProtectedRoute;
