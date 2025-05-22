'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import Image from 'next/image';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { config } = useSiteConfig();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hashParams, setHashParams] = useState<Record<string, string>>({});
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Parse the hash fragment from the URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const paramsObj: Record<string, string> = {};

      params.forEach((value, key) => {
        paramsObj[key] = value;
      });

      setHashParams(paramsObj);

      // Check if we have an access_token, which means the password reset link is valid
      if (paramsObj.access_token) {
        setTokenValid(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar senha
    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'A senha deve ter pelo menos 8 caracteres'));
      return;
    }

    // Verificar se as senhas coincidem
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'As senhas não coincidem'));
      return;
    }

    setIsLoading(true);

    try {
      // Check if we have an access token from the URL hash
      if (hashParams.access_token) {
        // Create a new Supabase client with the access token
        const supabaseWithToken = supabase.auth.setSession({
          access_token: hashParams.access_token,
          refresh_token: hashParams.refresh_token || '',
        });

        // Update the user's password
        const { error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) {
          console.error('Error updating password:', error);
          setError(error.message || t('auth.resetPasswordError', 'Erro ao redefinir senha'));
          return;
        }
      } else {
        // No access token found in URL
        setError(t('auth.invalidOrExpiredToken', 'Link de redefinição de senha inválido ou expirado'));
        return;
      }

      // Success
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || t('auth.resetPasswordError', 'Erro ao redefinir senha'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 lg:px-8 bg-abz-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src={config.logo}
            alt={config.companyName + " Logo"}
            width={200}
            height={60}
            className="h-auto"
            priority
            unoptimized
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-abz-blue-dark">
          {t('auth.resetPassword', 'Redefinir Senha')}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-6 py-8 shadow-md rounded-lg sm:px-10">
          {!tokenValid && !success && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {t('auth.invalidOrExpiredToken', 'Link de redefinição de senha inválido ou expirado')}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{t('auth.tokenVerificationError', 'O link que você clicou é inválido ou expirou. Por favor, solicite um novo link de redefinição de senha.')}</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() => router.push('/login')}
                      variant="outline"
                      size="sm"
                      className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-800"
                    >
                      <FiArrowLeft className="mr-2 h-4 w-4" />
                      {t('common.backToLogin', 'Voltar para o Login')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-start">
              <FiCheck className="mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Senha redefinida com sucesso!</p>
                <p className="mt-1">Você será redirecionado para a página de login em alguns segundos.</p>
                <Link href="/login" className="mt-4 inline-block text-sm text-abz-blue hover:text-abz-blue-dark">
                  Ir para o login agora
                </Link>
              </div>
            </div>
          ) : tokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FiEye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  A senha deve ter pelo menos 8 caracteres
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FiEye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-abz-blue hover:bg-abz-blue-dark"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t('common.loading', 'Redefinindo...')}
                    </>
                  ) : (
                    t('auth.resetPassword', 'Redefinir Senha')
                  )}
                </Button>
              </div>

              <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-abz-blue hover:text-abz-blue-dark">
                  Voltar para o login
                </Link>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
