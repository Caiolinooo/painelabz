'use client';

import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/useToast';
import { FiSave, FiLoader, FiLock, FiShield } from 'react-icons/fi';

interface SecurityTabProps {
  user: any;
}

export function SecurityTab({ user }: SecurityTabProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validar força da senha se for o campo de nova senha
    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  // Função para validar a força da senha
  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback([]);
      return;
    }

    // Critérios de validação
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Calcular força da senha (0-4)
    let strength = 0;
    if (hasMinLength) strength++;
    if (hasUpperCase && hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasSpecialChars) strength++;

    // Feedback para o usuário
    const feedback = [];
    if (!hasMinLength) feedback.push(t('auth.passwordTooShort', 'A senha deve ter pelo menos 8 caracteres'));
    if (!hasUpperCase || !hasLowerCase) feedback.push(t('auth.passwordNeedsMixedCase', 'A senha deve conter letras maiúsculas e minúsculas'));
    if (!hasNumbers) feedback.push(t('auth.passwordNeedsNumbers', 'A senha deve conter números'));
    if (!hasSpecialChars) feedback.push(t('auth.passwordNeedsSpecialChars', 'A senha deve conter caracteres especiais'));

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar senhas
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch', 'As senhas não coincidem'));
      return;
    }

    if (passwordStrength < 3) {
      toast.error(t('auth.passwordNotStrongEnough', 'A senha não é forte o suficiente'));
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error(t('common.notAuthorized', 'Não autorizado'));
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (response.ok) {
        toast.success(t('profile.passwordChanged', 'Senha alterada com sucesso'));
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordStrength(0);
        setPasswordFeedback([]);
      } else {
        const data = await response.json();
        toast.error(data.error || t('profile.passwordChangeError', 'Erro ao alterar senha'));
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(t('profile.passwordChangeError', 'Erro ao alterar senha'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {t('profile.security', 'Segurança')}
      </h2>
      
      <div className="space-y-8">
        {/* Alterar senha */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <FiLock className="h-5 w-5 mr-2 text-gray-600" />
            {t('profile.changePassword', 'Alterar senha')}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.currentPassword', 'Senha atual')}
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.newPassword', 'Nova senha')}
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Indicador de força da senha */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center mb-1">
                    <div className="text-xs text-gray-600 mr-2">
                      {t('profile.passwordStrength', 'Força da senha')}:
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          passwordStrength === 0 ? 'bg-gray-300' :
                          passwordStrength === 1 ? 'bg-red-500' :
                          passwordStrength === 2 ? 'bg-yellow-500' :
                          passwordStrength === 3 ? 'bg-green-500' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${passwordStrength * 25}%` }}
                      ></div>
                    </div>
                    <div className="text-xs ml-2">
                      {passwordStrength === 0 && t('profile.passwordWeak', 'Fraca')}
                      {passwordStrength === 1 && t('profile.passwordWeak', 'Fraca')}
                      {passwordStrength === 2 && t('profile.passwordMedium', 'Média')}
                      {passwordStrength === 3 && t('profile.passwordStrong', 'Forte')}
                      {passwordStrength === 4 && t('profile.passwordVeryStrong', 'Muito forte')}
                    </div>
                  </div>
                  
                  {/* Feedback sobre a senha */}
                  {passwordFeedback.length > 0 && (
                    <ul className="text-xs text-red-600 mt-1 space-y-1">
                      {passwordFeedback.map((feedback, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          {feedback}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.confirmPassword', 'Confirmar nova senha')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Aviso de senhas diferentes */}
              {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <div className="text-xs text-red-600 mt-1">
                  {t('auth.passwordsDoNotMatch', 'As senhas não coincidem')}
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="animate-spin h-5 w-5 mr-2" />
                    {t('common.saving', 'Salvando...')}
                  </>
                ) : (
                  <>
                    <FiSave className="h-5 w-5 mr-2" />
                    {t('profile.changePassword', 'Alterar senha')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Autenticação de dois fatores (em breve) */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <FiShield className="h-5 w-5 mr-2 text-gray-600" />
            {t('profile.twoFactorAuth', 'Autenticação de dois fatores')}
          </h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600 mb-3">
              {t('profile.twoFactorComingSoon', 'Em breve você poderá ativar a autenticação de dois fatores para sua conta.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
