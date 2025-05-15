'use client';

import { useState, FormEvent } from 'react';
import { FiMail, FiPhone, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface ForgotPasswordFormProps {
  onCancel: () => void;
}

export default function ForgotPasswordForm({ onCancel }: ForgotPasswordFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [useEmail, setUseEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validar o identificador
    if (!identifier) {
      setError(useEmail ? t('auth.invalidEmail') : t('auth.invalidPhoneNumber'));
      setIsLoading(false);
      return;
    }

    if (useEmail) {
      // Importar a função de validação de email
      const { validateEmail } = await import('@/lib/schema');

      // Validar o email com a função melhorada
      if (!validateEmail(identifier)) {
        setError(t('auth.invalidEmail'));
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [useEmail ? 'email' : 'phoneNumber']: identifier,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t('auth.requestError'));
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      setError(t('auth.requestError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {success ? (
        <div className="bg-green-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiCheck className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {t('auth.resetLinkSent')}
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  {useEmail
                    ? t('auth.resetLinkSentEmailDescription')
                    : t('auth.resetLinkSentPhoneDescription')}
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onCancel}
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                {useEmail ? t('auth.email') : t('auth.phoneNumber')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseEmail(!useEmail);
                  setIdentifier('');
                  setError('');
                }}
                className="text-xs text-abz-blue hover:text-abz-blue-dark"
              >
                {useEmail ? t('auth.usePhone') : t('auth.useEmail')}
              </button>
            </div>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {useEmail ? (
                  <FiMail className="h-5 w-5 text-gray-400" />
                ) : (
                  <FiPhone className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <input
                id="identifier"
                name="identifier"
                type={useEmail ? 'email' : 'tel'}
                autoComplete={useEmail ? 'email' : 'tel'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue sm:text-sm"
                placeholder={useEmail ? 'email@exemplo.com' : '+55 (99) 99999-9999'}
              />
            </div>
            {error && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <FiAlertCircle className="mr-1 h-4 w-4" />
                {error}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {useEmail
                ? t('auth.resetPasswordEmailDescription')
                : t('auth.resetPasswordPhoneDescription')}
            </p>
          </div>

          <div className="flex items-center justify-between space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue disabled:opacity-70 disabled:cursor-not-allowed"
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
                <>
                  {t('auth.sendResetLink')} <FiArrowRight className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
