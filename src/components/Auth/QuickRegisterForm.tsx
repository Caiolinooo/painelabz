import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWrapper } from '@/lib/fetch-wrapper';
import useToast from '@/hooks/useToast';

interface QuickRegisterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email?: string;
  phoneNumber?: string;
}

export function QuickRegisterForm({ isOpen, onClose, onSuccess, email, phoneNumber }: QuickRegisterFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar campos
    if (!firstName || !lastName) {
      setError(t('auth.requiredFields', 'Preencha todos os campos obrigatórios'));
      return;
    }

    // Validar senha
    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'A senha deve ter pelo menos 8 caracteres'));
      return;
    }

    // Verificar se as senhas coincidem
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch', 'As senhas não coincidem'));
      return;
    }

    setIsLoading(true);

    try {
      // Enviar requisição para criar o usuário
      const response = await fetchWrapper.post('/api/auth/register', {
        firstName,
        lastName,
        email,
        phoneNumber,
        password
      });

      if (response.success) {
        toast.success(t('auth.accountCreatedSuccess', 'Conta criada com sucesso') + ': ' +
              t('auth.accountCreatedDescription', 'Sua conta foi criada com sucesso. Você já pode acessar o sistema.'));
        onSuccess();
      } else {
        setError(response.error || t('auth.accountCreationError', 'Erro ao criar conta'));
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      setError(t('auth.accountCreationError', 'Erro ao criar conta'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {t('auth.createAccount', 'Criar Conta')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600 mb-2">
              {t('auth.completeRegistration', 'Complete seu cadastro para acessar o sistema.')}
            </div>

            {error && (
              <div className="text-sm text-red-600 mb-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                {t('auth.firstName', 'Nome')} *
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('auth.firstNamePlaceholder', 'Digite seu nome')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                {t('auth.lastName', 'Sobrenome')} *
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('auth.lastNamePlaceholder', 'Digite seu sobrenome')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email', 'Email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                {t('auth.phoneNumber', 'Telefone')}
              </label>
              <input
                id="phoneNumber"
                value={phoneNumber}
                disabled
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password', 'Senha')} *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder', 'Digite sua senha')}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500">
                {t('auth.passwordRequirements', 'A senha deve ter pelo menos 8 caracteres')}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.confirmPassword', 'Confirmar Senha')} *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder', 'Confirme sua senha')}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isLoading
                ? t('common.loading', 'Carregando...')
                : t('auth.createAccount', 'Criar Conta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
