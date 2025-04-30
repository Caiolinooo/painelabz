'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Tables } from '@/types/supabase';

// Tipo para usuário
export interface UserProfile extends Tables<'users'> {
  accessPermissions?: {
    modules?: {
      [key: string]: boolean;
    };
    features?: {
      [key: string]: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  passwordExpired: boolean;
  loginStep: 'phone' | 'verification' | 'password' | 'complete' | 'unauthorized' | 'pending';
  hasPassword: boolean;
  authStatus?: string;
  setLoginStep: (step: 'phone' | 'verification' | 'password' | 'complete' | 'unauthorized' | 'pending') => void;
  initiateLogin: (phoneNumber: string, email?: string, inviteCode?: string) => Promise<boolean>;
  loginWithPassword: (identifier: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  loginWithOtp: (identifier: string, checkOnly?: boolean) => Promise<{ success: boolean; hasPassword: boolean; status?: string }>;
  verifyOtp: (identifier: string, code: string) => Promise<{ success: boolean; status?: string }>;
  verifyCode: (phoneNumber: string, code: string, email?: string, inviteCode?: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  checkPasswordStatus: () => Promise<boolean>;
  hasAccess: (module: string) => boolean;
  hasFeature: (feature: string) => boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordExpired, setPasswordExpired] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'verification' | 'password' | 'complete' | 'unauthorized' | 'pending'>('phone');
  const [hasPassword, setHasPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | undefined>(undefined);
  const router = useRouter();

  // Função para renovar o token JWT personalizado
  const refreshCustomToken = async () => {
    try {
      // Obter o token JWT personalizado do localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Nenhum token personalizado encontrado para renovar');
        return false;
      }

      console.log('Tentando renovar token personalizado...');
      const refreshResponse = await fetch('/api/auth/token-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('Token personalizado renovado com sucesso');

        if (refreshData.token && refreshData.token !== token) {
          console.log('Atualizando token renovado no localStorage');
          localStorage.setItem('token', refreshData.token);

          // Se recebemos dados do usuário, atualizar o perfil
          if (refreshData.user) {
            console.log('Atualizando dados do usuário após renovação de token');

            // Buscar o perfil completo do usuário no Supabase
            try {
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', refreshData.user.id)
                .single();

              if (!error && data) {
                setProfile(data);
              }
            } catch (profileError) {
              console.error('Erro ao buscar perfil após renovação de token:', profileError);
            }
          }

          return true;
        }
      } else {
        console.log('Falha na renovação do token personalizado, tentando fix-token');

        // Tentar corrigir o token
        try {
          const fixResponse = await fetch('/api/auth/fix-token', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (fixResponse.ok) {
            const fixData = await fixResponse.json();
            console.log('Token personalizado corrigido com sucesso');

            if (fixData.token && fixData.token !== token) {
              console.log('Atualizando token corrigido no localStorage');
              localStorage.setItem('token', fixData.token);
              return true;
            }
          }
        } catch (fixError) {
          console.error('Erro ao tentar corrigir token:', fixError);
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao renovar token personalizado:', error);
      return false;
    }
  };

  // Função para configurar o refresh token
  const setupRefreshToken = async () => {
    // Configurar o listener para atualizar o token antes de expirar
    const refreshInterval = setInterval(async () => {
      try {
        // Primeiro tentar renovar o token Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Verificar se o token está próximo de expirar (menos de 5 minutos)
          const expiresAt = new Date(session.expires_at * 1000);
          const now = new Date();
          const fiveMinutes = 5 * 60 * 1000; // 5 minutos em milissegundos

          if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
            console.log('Token Supabase próximo de expirar, renovando...');
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
              console.error('Erro ao renovar sessão Supabase:', error);
            } else if (data.session) {
              console.log('Sessão Supabase renovada com sucesso');
            }
          }
        }

        // Também renovar o token JWT personalizado
        await refreshCustomToken();
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      }
    }, 60000); // Verificar a cada minuto

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(refreshInterval);
  };

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se há uma sessão ativa
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          // Buscar o perfil do usuário
          let profileData;
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Erro ao buscar perfil do usuário:', error);

              // Verificar se o perfil não existe e criar um perfil básico
              if (error.code === 'PGRST116') {
                console.log('Perfil não encontrado, criando perfil básico para:', session.user.email);

                try {
                  // Extrair informações do usuário da autenticação
                  const email = session.user.email;
                  const phone = session.user.phone;

                  // Verificar se o usuário é o administrador principal
                  const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
                  const isAdmin = email === adminEmail;

                  // Criar um perfil básico
                  const { data: newProfile, error: insertError } = await supabase
                    .from('users')
                    .insert({
                      id: session.user.id,
                      email: email,
                      phone_number: phone,
                      first_name: isAdmin ? 'Caio' : 'Usuário',
                      last_name: isAdmin ? 'Correia' : 'ABZ',
                      role: isAdmin ? 'ADMIN' : 'USER',
                      active: true,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      access_permissions: isAdmin ? { modules: { admin: true } } : {}
                    })
                    .select('*')
                    .single();

                  if (insertError) {
                    console.error('Erro ao criar perfil básico:', insertError);
                  } else {
                    console.log('Perfil básico criado com sucesso:', newProfile);
                    profileData = newProfile;
                  }
                } catch (createError) {
                  console.error('Exceção ao criar perfil básico:', createError);
                }
              }
            } else {
              profileData = data;
            }
          } catch (fetchError) {
            console.error('Exceção ao buscar perfil do usuário:', fetchError);
          }

          if (profileData) {
            // Buscar as permissões do usuário
            const { data: permissionsData, error: permissionsError } = await supabase
              .from('user_permissions')
              .select('*')
              .eq('user_id', session.user.id);

            if (permissionsError) {
              console.error('Erro ao buscar permissões do usuário:', permissionsError);
            } else {
              // Organizar as permissões
              const modules: { [key: string]: boolean } = {};
              const features: { [key: string]: boolean } = {};

              permissionsData.forEach(permission => {
                if (permission.module) {
                  modules[permission.module] = true;
                }
                if (permission.feature) {
                  features[permission.feature] = true;
                }
              });

              // Adicionar as permissões ao perfil
              const userWithPermissions: UserProfile = {
                ...profileData,
                accessPermissions: {
                  modules,
                  features
                }
              };

              setProfile(userWithPermissions);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Configurar o listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);

        // Buscar o perfil do usuário
        let profileData;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Erro ao buscar perfil do usuário:', error);

            // Verificar se o perfil não existe e criar um perfil básico
            if (error.code === 'PGRST116') {
              console.log('Perfil não encontrado, criando perfil básico para:', session.user.email);

              try {
                // Extrair informações do usuário da autenticação
                const email = session.user.email;
                const phone = session.user.phone;

                // Verificar se o usuário é o administrador principal
                const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
                const isAdmin = email === adminEmail;

                // Criar um perfil básico
                const { data: newProfile, error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: email,
                    phone_number: phone,
                    first_name: isAdmin ? 'Caio' : 'Usuário',
                    last_name: isAdmin ? 'Correia' : 'ABZ',
                    role: isAdmin ? 'ADMIN' : 'USER',
                    active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    access_permissions: isAdmin ? { modules: { admin: true } } : {}
                  })
                  .select('*')
                  .single();

                if (insertError) {
                  console.error('Erro ao criar perfil básico:', insertError);
                } else {
                  console.log('Perfil básico criado com sucesso:', newProfile);
                  profileData = newProfile;
                }
              } catch (createError) {
                console.error('Exceção ao criar perfil básico:', createError);
              }
            }
          } else {
            profileData = data;
          }
        } catch (fetchError) {
          console.error('Exceção ao buscar perfil do usuário:', fetchError);
        }

        if (profileData) {
          // Buscar as permissões do usuário
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', session.user.id);

          if (permissionsError) {
            console.error('Erro ao buscar permissões do usuário:', permissionsError);
          } else {
            // Organizar as permissões
            const modules: { [key: string]: boolean } = {};
            const features: { [key: string]: boolean } = {};

            permissionsData.forEach(permission => {
              if (permission.module) {
                modules[permission.module] = true;
              }
              if (permission.feature) {
                features[permission.feature] = true;
              }
            });

            // Adicionar as permissões ao perfil
            const userWithPermissions: UserProfile = {
              ...profileData,
              accessPermissions: {
                modules,
                features
              }
            };

            setProfile(userWithPermissions);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    let cleanupRefresh: (() => void) | undefined;

    const initAuth = async () => {
      await checkAuth();
      cleanupRefresh = await setupRefreshToken();
    };

    initAuth();

    // Limpar o listener e o intervalo de refresh ao desmontar o componente
    return () => {
      subscription.unsubscribe();
      if (cleanupRefresh) cleanupRefresh();
    };
  }, []);

  // Função para iniciar o login com número de telefone ou email
  const initiateLogin = async (phoneNumber: string, email?: string, inviteCode?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (email) {
        // Verificar se o email existe
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError) {
          // Email não encontrado
          setAuthStatus('new_email');
          return false;
        }

        // Verificar se o usuário está ativo
        if (!userData.active) {
          setAuthStatus('inactive');
          return false;
        }

        // Email encontrado, verificar se tem senha
        setHasPassword(true);
        setLoginStep('password');
        return true;
      } else if (phoneNumber) {
        // Verificar se o telefone existe
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('phone_number', phoneNumber)
          .single();

        if (userError) {
          // Telefone não encontrado
          setAuthStatus('new_phone');
          return false;
        }

        // Verificar se o usuário está ativo
        if (!userData.active) {
          setAuthStatus('inactive');
          return false;
        }

        // Telefone encontrado, verificar se tem senha
        setHasPassword(true);
        setLoginStep('password');
        return true;
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
      console.log('Tentando login com senha para:', identifier);
      const isEmail = identifier.includes('@');
      let email;

      // Caso especial para o administrador
      if (identifier === 'caio.correia@groupabz.com' || identifier === '+5522997847289') {
        console.log('Tentativa de login do administrador');
        email = 'caio.correia@groupabz.com';
      }
      // Se for um email, usamos diretamente
      else if (isEmail) {
        email = identifier;
      } else {
        // Se for um telefone, precisamos buscar o email associado
        // Primeiro tentamos buscar pelo telefone
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('phone_number', identifier)
          .single();

        if (userError) {
          // Se não encontrou pelo telefone, tentamos buscar pelo email
          // (caso o usuário tenha digitado o email no campo de telefone)
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('email')
            .eq('email', identifier)
            .single();

          if (emailError) {
            console.error('Usuário não encontrado:', identifier);
            return false;
          }

          email = userByEmail.email;
        } else {
          email = userData.email;
        }
      }

      console.log('Fazendo login com email:', email);

      // Agora fazemos login com o email
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro ao fazer login com senha:', error);

        // Se for o primeiro login do administrador, criar a conta
        if (email === 'caio.correia@groupabz.com' && error.message.includes('Invalid login credentials')) {
          console.log('Tentando criar conta de administrador...');

          // Criar conta de administrador
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'caio.correia@groupabz.com',
            password: 'Caio@2122@', // Usar a senha correta do administrador
          });

          if (signUpError) {
            console.error('Erro ao criar conta de administrador:', signUpError);
            return false;
          }

          console.log('Conta de administrador criada com sucesso');

          // Tentar login novamente
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'caio.correia@groupabz.com',
            password,
          });

          if (loginError) {
            console.error('Erro ao fazer login após criar conta:', loginError);
            return false;
          }

          setUser(loginData.user);
          setLoginStep('complete');

          // Verificar status da senha
          await checkPasswordStatus();

          return true;
        }

        return false;
      }

      setUser(data.user);
      setLoginStep('complete');

      // Verificar status da senha
      await checkPasswordStatus();

      return true;
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
      // Verificar o código
      const { data: codeData, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq(email ? 'email' : 'phone_number', email || phoneNumber)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (codeError) {
        console.error('Erro ao verificar código:', codeError);
        return false;
      }

      // Marcar o código como usado
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', codeData.id);

      // Buscar o usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq(email ? 'email' : 'phone_number', email || phoneNumber)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        return false;
      }

      // Fazer login com o usuário
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: 'temporary-password', // Isso deve ser substituído por um fluxo de redefinição de senha
      });

      if (error) {
        console.error('Erro ao fazer login após verificação de código:', error);
        return false;
      }

      setUser(data.user);
      setLoginStep('complete');

      // Verificar status da senha
      await checkPasswordStatus();

      return true;
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
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        return false;
      }

      // Atualizar a data da última alteração de senha
      if (user) {
        await supabase
          .from('users')
          .update({
            password_last_changed: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      setPasswordExpired(false);
      return true;
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
      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from('users')
        .select('password_last_changed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao verificar status da senha:', error);
        return false;
      }

      // Verificar se a senha nunca foi alterada ou se foi alterada há mais de 90 dias
      const passwordLastChanged = data.password_last_changed ? new Date(data.password_last_changed) : null;
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const expired = !passwordLastChanged || passwordLastChanged < ninetyDaysAgo;
      setPasswordExpired(expired);

      return expired;
    } catch (error) {
      console.error('Erro ao verificar status da senha:', error);
      return false;
    }
  };

  // Função para login com OTP (One-Time Password)
  const loginWithOtp = async (identifier: string, checkOnly: boolean = false): Promise<{ success: boolean; hasPassword: boolean; status?: string }> => {
    setIsLoading(true);
    try {
      const isEmail = identifier.includes('@');
      let userData;

      // Verificar se o usuário existe - primeiro tentamos pelo identificador fornecido
      console.log('Buscando usuário por', isEmail ? 'email' : 'telefone', ':', identifier);

      // Tratar caso especial para o seu número de telefone
      if (identifier === '22997847289' || identifier === '997847289') {
        identifier = '+5522997847289';
      }

      // Verificar se o usuário é o administrador
      if (identifier === 'caio.correia@groupabz.com' || identifier === 'apiabz@groupabz.com' || identifier === '+5522997847289') {
        console.log('Tentativa de login do administrador');

        // Buscar o usuário administrador
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'caio.correia@groupabz.com')
          .single();

        if (!adminError && adminUser) {
          console.log('Administrador encontrado:', adminUser.id);
          userData = adminUser;
        } else {
          console.log('Administrador não encontrado, verificando por telefone');

          // Tentar pelo telefone
          const { data: adminByPhone, error: phoneError } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', '+5522997847289')
            .single();

          if (!phoneError && adminByPhone) {
            console.log('Administrador encontrado pelo telefone:', adminByPhone.id);
            userData = adminByPhone;
          } else {
            console.log('Administrador não encontrado, criando conta...');

            // Criar o usuário administrador na autenticação
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: 'caio.correia@groupabz.com',
              password: 'Caio@2122@', // Senha do administrador
            });

            if (authError) {
              console.error('Erro ao criar conta de administrador:', authError);
              return { success: false, hasPassword: false, status: 'admin_creation_failed' };
            }

            // Criar o perfil do administrador
            if (authData.user) {
              const { data: newAdmin, error: profileError } = await supabase
                .from('users')
                .insert({
                  id: authData.user.id,
                  email: 'caio.correia@groupabz.com',
                  phone_number: '+5522997847289',
                  first_name: 'Caio',
                  last_name: 'Correia',
                  role: 'ADMIN',
                  active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select('*')
                .single();

              if (profileError) {
                console.error('Erro ao criar perfil de administrador:', profileError);
                return { success: false, hasPassword: false, status: 'admin_profile_creation_failed' };
              }

              console.log('Administrador criado com sucesso:', newAdmin);
              userData = newAdmin;
            }
          }
        }
      } else {
        // Busca normal para outros usuários
        const { data: userByIdentifier, error: identifierError } = await supabase
          .from('users')
          .select('*')
          .eq(isEmail ? 'email' : 'phone_number', identifier)
          .single();

        if (identifierError) {
          // Se não encontrou pelo identificador fornecido, tentamos pelo outro tipo
          // Isso permite que um usuário possa entrar com email ou telefone, independente de qual usou para cadastrar
          const { data: userByAlternative, error: alternativeError } = await supabase
            .from('users')
            .select('*')
            .eq(isEmail ? 'phone_number' : 'email', identifier)
            .single();

          if (alternativeError) {
            // Usuário não encontrado em nenhuma das formas
            console.log('Usuário não encontrado em nenhuma das formas');
            return { success: false, hasPassword: false, status: isEmail ? 'new_email' : 'new_phone' };
          }

          userData = userByAlternative;
        } else {
          userData = userByIdentifier;
        }
      }

      // Verificar se o usuário está ativo
      if (!userData.active) {
        return { success: false, hasPassword: false, status: 'inactive' };
      }

      // Se estamos apenas verificando se o usuário existe e tem senha
      if (checkOnly) {
        // Verificar se o usuário tem senha
        const hasPassword = !!userData.password_last_changed;
        return { success: true, hasPassword };
      }

      // Enviar código OTP
      if (isEmail) {
        // Enviar código por email
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier,
        });

        if (error) {
          console.error('Erro ao enviar código OTP por email:', error);
          return { success: false, hasPassword: false };
        }
      } else {
        // Enviar código por SMS
        // Nota: Supabase não suporta OTP por SMS diretamente, então precisamos usar um serviço externo como Twilio
        // Por enquanto, vamos simular o envio de SMS
        console.log('Simulando envio de SMS para', identifier);

        // Aqui você implementaria a integração com Twilio ou outro serviço de SMS
      }

      setLoginStep('verification');
      return { success: true, hasPassword: false };
    } catch (error) {
      console.error('Erro ao iniciar login com OTP:', error);
      return { success: false, hasPassword: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar código OTP
  const verifyOtp = async (identifier: string, code: string): Promise<{ success: boolean; status?: string }> => {
    setIsLoading(true);
    try {
      const isEmail = identifier.includes('@');

      if (isEmail) {
        // Verificar código OTP por email
        const { data, error } = await supabase.auth.verifyOtp({
          email: identifier,
          token: code,
          type: 'email',
        });

        if (error) {
          console.error('Erro ao verificar código OTP por email:', error);
          return { success: false };
        }

        setUser(data.user);
        setLoginStep('complete');

        // Verificar status da senha
        await checkPasswordStatus();

        return { success: true };
      } else {
        // Verificar código OTP por SMS
        // Nota: Supabase não suporta OTP por SMS diretamente, então precisamos usar um serviço externo
        console.log('Verificando SMS para', identifier, 'com código', code);

        // Buscar o usuário pelo telefone
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('phone_number', identifier)
          .single();

        if (userError) {
          console.error('Erro ao buscar usuário pelo telefone:', userError);
          // Tentar buscar pelo email (caso o usuário tenha digitado o email no campo de telefone)
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', identifier)
            .single();

          if (emailError) {
            console.error('Usuário não encontrado:', identifier);
            return { success: false };
          }

          // Usar os dados do usuário encontrado pelo email
          const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
            email: userByEmail.email,
          });

          if (authError) {
            console.error('Erro ao fazer login com OTP por email:', authError);
            return { success: false };
          }

          // Para fins de teste, vamos aceitar qualquer código
          // Isso é apenas para facilitar o desenvolvimento
          if (true) {
            // Buscar o usuário autenticado
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              setUser(sessionData.session.user);
              setLoginStep('complete');
              await checkPasswordStatus();
              return { success: true };
            }
          }

          return { success: false, status: 'invalid_code' };
        }

        // Fazer login com o usuário
        // Para fins de teste, vamos aceitar qualquer código
        // Isso é apenas para facilitar o desenvolvimento
        if (true) {
          // Buscar o email do usuário
          // Tentar login com magic link
          const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
            email: userData.email,
          });

          if (authError) {
            console.error('Erro ao fazer login após verificação de SMS:', authError);
            return { success: false };
          }

          setUser(authData.user);
          setLoginStep('complete');

          // Verificar status da senha
          await checkPasswordStatus();

          return { success: true };
        } else {
          return { success: false, status: 'invalid_code' };
        }
      }
    } catch (error) {
      console.error('Erro ao verificar código OTP:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Função para fazer logout
  const signOut = async () => {
    try {
      console.log('Iniciando processo de logout...');

      // Chamar a API de logout se tiver token personalizado
      const token = localStorage.getItem('token');
      if (token) {
        try {
          console.log('Chamando API de logout para o token personalizado');
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (apiError) {
          console.error('Erro ao chamar API de logout:', apiError);
          // Continuar com o processo de logout mesmo se a API falhar
        }
      }

      // Remover tokens específicos primeiro
      localStorage.removeItem('token');
      localStorage.removeItem('abzToken');
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');

      // Limpar cookies relacionados à autenticação
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'abzToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Fazer logout no Supabase
      console.log('Fazendo logout no Supabase');
      await supabase.auth.signOut();

      // Limpar estado
      setUser(null);
      setProfile(null);
      setLoginStep('phone');

      console.log('Logout concluído com sucesso');

      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);

      // Tentar limpar manualmente mesmo em caso de erro
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('abzToken');
        localStorage.removeItem('auth');
        localStorage.removeItem('user');

        // Limpar cookies relacionados à autenticação
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'abzToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        // Limpar estado
        setUser(null);
        setProfile(null);
      } catch (cleanupError) {
        console.error('Erro ao limpar dados de autenticação:', cleanupError);
      }

      // Forçar redirecionamento mesmo em caso de erro
      window.location.href = '/login';
    }
  };

  // Alias para logout (para compatibilidade)
  const logout = signOut;

  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user;

  // Verificar papéis do usuário
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'caio.correia@groupabz.com';

  // Verificar se o usuário é administrador de várias maneiras para garantir acesso
  const isAdmin = profile?.role === 'ADMIN' ||
                 profile?.email === adminEmail ||
                 user?.email === adminEmail ||
                 (profile?.access_permissions && profile?.access_permissions.modules && profile?.access_permissions.modules.admin === true);

  // Debug: verificar se o usuário é administrador
  console.log('SupabaseAuthContext - isAdmin:', isAdmin);
  console.log('SupabaseAuthContext - user email:', user?.email);
  console.log('SupabaseAuthContext - profile email:', profile?.email);
  console.log('SupabaseAuthContext - profile role:', profile?.role);
  console.log('SupabaseAuthContext - profile permissions:', JSON.stringify(profile?.access_permissions));

  // Se o usuário for o administrador principal mas não tiver o papel de ADMIN, atualizar o perfil
  useEffect(() => {
    const updateAdminProfile = async () => {
      if ((profile?.email === adminEmail || user?.email === adminEmail) && profile?.role !== 'ADMIN') {
        console.log('Atualizando perfil do administrador...');
        try {
          const { error } = await supabase
            .from('users')
            .update({
              role: 'ADMIN',
              access_permissions: {
                ...(profile?.access_permissions || {}),
                modules: {
                  ...(profile?.access_permissions?.modules || {}),
                  admin: true
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', profile?.id);

          if (error) {
            console.error('Erro ao atualizar perfil do administrador:', error);
          } else {
            console.log('Perfil do administrador atualizado com sucesso!');
            // Recarregar a página para aplicar as alterações
            window.location.reload();
          }
        } catch (error) {
          console.error('Erro ao atualizar perfil do administrador:', error);
        }
      }
    };

    if (profile && !isLoading) {
      updateAdminProfile();
    }
  }, [profile, user, adminEmail, isLoading]);

  const isManager = profile?.role === 'MANAGER';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated,
        isAdmin,
        isManager,
        passwordExpired,
        loginStep,
        hasPassword,
        authStatus,
        setLoginStep,
        initiateLogin,
        loginWithPassword,
        loginWithOtp,
        verifyOtp,
        verifyCode,
        updatePassword,
        checkPasswordStatus,
        hasAccess: (module: string) => {
          // Administradores têm acesso a tudo
          if (isAdmin) return true;

          // Gerentes têm acesso a tudo, exceto à área de administração
          if (isManager && module !== 'admin') return true;

          // Verificar permissões de módulo (verificar tanto accessPermissions quanto access_permissions)
          return !!(
            profile?.accessPermissions?.modules?.[module] ||
            profile?.access_permissions?.modules?.[module]
          );
        },
        hasFeature: (feature: string) => {
          // Administradores têm acesso a todas as funcionalidades
          if (isAdmin) return true;

          // Gerentes têm acesso a todas as funcionalidades, exceto as administrativas
          if (isManager && !feature.startsWith('admin.')) return true;

          // Verificar permissões de funcionalidade (verificar tanto accessPermissions quanto access_permissions)
          return !!(
            profile?.accessPermissions?.features?.[feature] ||
            profile?.access_permissions?.features?.[feature]
          );
        },
        signOut,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useSupabaseAuth deve ser usado dentro de um SupabaseAuthProvider');
  }

  return context;
}
