'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipo para usuário
export interface User {
  _id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string;
  avatar?: string;
  department?: string;
  passwordLastChanged?: Date;
  active: boolean;
  accessPermissions?: {
    modules?: {
      [key: string]: boolean;
    };
    features?: {
      [key: string]: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Tipo para credenciais de login por telefone
export interface PhoneCredentials {
  phoneNumber: string;
  verificationCode?: string;
}

// Tipo para atualização de senha
export interface PasswordUpdateData {
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  passwordExpired: boolean;
  loginStep: 'phone' | 'verification' | 'password' | 'complete' | 'unauthorized' | 'pending';
  hasPassword: boolean;
  authStatus?: string;
  initiateLogin: (phoneNumber: string, email?: string, inviteCode?: string) => Promise<boolean>;
  loginWithPassword: (identifier: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  verifyCode: (phoneNumber: string, code: string, email?: string, inviteCode?: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  checkPasswordStatus: () => Promise<boolean>;
  hasAccess: (module: string) => boolean;
  hasFeature: (feature: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordExpired, setPasswordExpired] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'verification' | 'password' | 'complete' | 'unauthorized' | 'pending'>('phone');
  const [hasPassword, setHasPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | undefined>(undefined);

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('abzAuth');
        const storedToken = localStorage.getItem('abzToken');

        if (storedAuth === 'true' && storedToken) {
          // Verificar o token com a API
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          console.log('Verificando token com a API:', response.status, response.ok);
          if (response.ok) {
            const data = await response.json();
            console.log('Dados do usuário recebidos:', data.user);
            console.log('Papel do usuário:', data.user?.role);
            setUser(data.user);
          } else {
            console.log('Token inválido, fazendo logout');
            // Token inválido, fazer logout
            logout();
          }
        } else {
          // Sem token, verificar se há usuário armazenado
          const storedUser = localStorage.getItem('abzUser');
          console.log('Verificando usuário armazenado:', storedUser ? 'Existe' : 'Não existe');
          if (storedAuth === 'true' && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            console.log('Usuário armazenado:', parsedUser);
            console.log('Papel do usuário armazenado:', parsedUser?.role);
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Função para iniciar o login com número de telefone ou email
  const initiateLogin = async (phoneNumber: string, email?: string, inviteCode?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, email, inviteCode }),
      });

      const data = await response.json();

      console.log('Resposta do login:', data);

      if (data.success) {
        // Verificar se o usuário tem senha
        if (data.hasPassword) {
          console.log('Usuário tem senha, mudando para etapa de senha');
          setHasPassword(true);
          setLoginStep('password');
        } else {
          // Verificar se o usuário está autorizado a receber código
          if (!data.authorized && data.authStatus === 'unauthorized') {
            console.log('Usuário não autorizado a receber código');
            setAuthStatus('unauthorized');
            setLoginStep('unauthorized');
            return false;
          }

          console.log('Usuário autorizado, mudando para etapa de verificação');
          setLoginStep('verification');
        }
        return true;
      } else if (data.authStatus) {
        // Verificar status de autorização
        console.log('Status de autorização:', data.authStatus);
        setAuthStatus(data.authStatus);
        if (data.authStatus === 'pending') {
          setLoginStep('pending');
        } else if (data.authStatus === 'unauthorized') {
          setLoginStep('unauthorized');
        } else if (data.authStatus === 'inactive') {
          // Conta desativada
          setLoginStep('unauthorized'); // Usando o mesmo estado para simplificar
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao iniciar login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para login com senha
  const loginWithPassword = async (identifier: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    setIsLoading(true);
    try {
      const isEmail = identifier.includes('@');
      console.log('Tentando login com senha no frontend:', {
        [isEmail ? 'email' : 'phoneNumber']: identifier,
        password: password.substring(0, 3) + '...',
        rememberMe
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [isEmail ? 'email' : 'phoneNumber']: identifier,
          password,
          rememberMe
        }),
      });

      console.log('Resposta do servidor:', { status: response.status, ok: response.ok });

      const data = await response.json();
      console.log('Dados da resposta:', data);

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('abzAuth', 'true');
        localStorage.setItem('abzToken', data.token);
        localStorage.setItem('abzUser', JSON.stringify(data.user));

        // Se a opção "lembrar-me" estiver marcada, definir um cookie de longa duração
        if (rememberMe) {
          // Armazenar a preferência de "lembrar-me"
          localStorage.setItem('abzRememberMe', 'true');
        }

        setLoginStep('complete');

        // Verificar status da senha
        await checkPasswordStatus();

        return true;
      }

      // Verificar status de autorização
      if (data.authStatus) {
        setAuthStatus(data.authStatus);
        if (data.authStatus === 'inactive') {
          // Conta desativada
          setLoginStep('unauthorized');
        }
      }

      // Mostrar mensagem de erro
      if (data.error) {
        console.error('Erro de login:', data.error);
      }

      return false;
    } catch (error) {
      console.error('Erro ao fazer login com senha:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar o código e completar o login
  const verifyCode = async (phoneNumber: string, code: string, email?: string, inviteCode?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, verificationCode: code, email, inviteCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('abzAuth', 'true');
        localStorage.setItem('abzToken', data.token);
        localStorage.setItem('abzUser', JSON.stringify(data.user));
        setLoginStep('complete');
        setAuthStatus(undefined);

        // Verificar status da senha
        await checkPasswordStatus();

        return true;
      } else {
        // Verificar status de autorização
        if (data.authStatus) {
          setAuthStatus(data.authStatus);
          if (data.authStatus === 'pending') {
            setLoginStep('pending');
          } else if (data.authStatus === 'unauthorized') {
            setLoginStep('unauthorized');
          } else if (data.authStatus === 'inactive') {
            // Conta desativada
            setLoginStep('unauthorized'); // Usando o mesmo estado para simplificar
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar a senha
  const updatePassword = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('abzToken');

      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setPasswordExpired(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar o status da senha
  const checkPasswordStatus = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('abzToken');

      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/password-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordExpired(data.expired);
        return data.expired;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar status da senha:', error);
      return false;
    }
  };

  // Função para fazer logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('abzAuth');
    localStorage.removeItem('abzToken');
    localStorage.removeItem('abzUser');
    localStorage.removeItem('abzRememberMe');
  };

  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user;

  // Verificar papéis do usuário
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  // Adicionar logs para depuração
  console.log('AuthContext - Verificando papel do usuário:', { isAdmin, isManager, role: user?.role });
  console.log('AuthContext - Usuário completo:', user);

  // Verificar status da senha ao carregar
  useEffect(() => {
    if (isAuthenticated) {
      checkPasswordStatus();
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isManager,
        passwordExpired,
        loginStep,
        hasPassword,
        authStatus,
        initiateLogin,
        loginWithPassword,
        verifyCode,
        updatePassword,
        checkPasswordStatus,
        hasAccess: (module: string) => {
          // Administradores têm acesso a tudo
          if (isAdmin) return true;

          // Gerentes têm acesso a tudo, exceto à área de administração
          if (isManager && module !== 'admin') return true;

          // Verificar permissões de módulo
          return !!user?.accessPermissions?.modules?.[module];
        },
        hasFeature: (feature: string) => {
          // Administradores têm acesso a todas as funcionalidades
          if (isAdmin) return true;

          // Gerentes têm acesso a todas as funcionalidades, exceto as administrativas
          if (isManager && !feature.startsWith('admin.')) return true;

          // Verificar permissões de funcionalidade
          return !!user?.accessPermissions?.features?.[feature];
        },
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
