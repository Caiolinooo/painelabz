'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export default function ResetPassword({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);
  const router = useRouter();
  const { t } = useI18n();
  const { config } = useSiteConfig();
  const { token } = params;

  // Verificar se o token é válido
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setTokenValid(false);
          setError(data.error || t('auth.invalidOrExpiredToken'));
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setTokenValid(false);
        setError(t('auth.tokenVerificationError'));
      } finally {
        setTokenChecked(true);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validar as senhas
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirecionar para a página de login após 3 segundos
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || t('auth.resetPasswordError'));
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setError(t('auth.requestError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 lg:px-8 bg-abz-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!tokenValid) {
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
            />
          </div>
          <div className="mt-6 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {t('auth.invalidOrExpiredToken')}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      {t('common.backToLogin')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-abz-blue-dark">
          {t('auth.resetPassword')}
        </h2>
        <div className="mt-6 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="bg-green-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiCheck className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {t('auth.passwordResetSuccess')}
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{t('auth.passwordResetSuccessDescription')}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      {t('common.backToLogin')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('auth.newPassword')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
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
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5" />
                      ) : (
                        <FiEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t('auth.passwordRequirements')}
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {t('auth.confirmPassword')}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
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
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff className="h-5 w-5" />
                      ) : (
                        <FiEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiAlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {t('auth.resetPasswordError')}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.loading')}
                    </>
                  ) : (
                    t('auth.resetPassword')
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
