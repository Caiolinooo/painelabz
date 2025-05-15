import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWrapper } from '@/lib/fetch-wrapper';
import useToast from '@/hooks/useToast';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isNewUser?: boolean;
}

export function SetPasswordModal({ isOpen, onClose, onSuccess, isNewUser = false }: SetPasswordModalProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);

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
      setError(t('auth.passwordsDoNotMatch', 'As senhas não coincidem'));
      return;
    }

    setIsLoading(true);

    try {
      // Enviar requisição para definir a senha
      const response = await fetchWrapper.post('/api/auth/set-password-after-verification', {
        password
      });

      if (response.success) {
        toast.success(t('auth.passwordSetSuccess', 'Senha definida com sucesso') + ': ' +
              (isNewUser
                ? t('auth.accountCreatedDescription', 'Sua conta foi criada com sucesso')
                : t('auth.passwordUpdatedDescription', 'Sua senha foi atualizada com sucesso')));
        setPasswordSet(true);
        onSuccess();
      } else {
        setError(response.error || t('auth.passwordSetError', 'Erro ao definir senha'));
      }
    } catch (error) {
      console.error('Erro ao definir senha:', error);
      setError(t('auth.passwordSetError', 'Erro ao definir senha'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isNewUser
              ? t('auth.createAccount', 'Criar Conta')
              : t('auth.setPassword', 'Definir Senha')}
          </h2>
          {passwordSet ? (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          ) : (
            <div className="w-6 h-6"></div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {isNewUser && (
              <div className="text-sm text-gray-600 mb-2">
                {t('auth.newAccountMessage', 'Para completar seu cadastro, defina uma senha para sua conta.')}
              </div>
            )}

            {!isNewUser && (
              <div className="text-sm text-gray-600 mb-2">
                {t('auth.setPasswordMessage', 'Defina uma senha para acessar sua conta.')}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 mb-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password', 'Senha')}
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
                {t('auth.confirmPassword', 'Confirmar Senha')}
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
            {passwordSet && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.close', 'Fechar')}
              </button>
            )}
            <button
              type={passwordSet ? "button" : "submit"}
              onClick={passwordSet ? onClose : undefined}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isLoading
                ? t('common.loading', 'Carregando...')
                : passwordSet
                  ? t('common.continue', 'Continuar')
                  : isNewUser
                    ? t('auth.createAccount', 'Criar Conta')
                    : t('auth.setPassword', 'Definir Senha')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
