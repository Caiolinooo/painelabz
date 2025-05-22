'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/useToast';
import { FiSave, FiLoader, FiGlobe, FiMoon, FiBell } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

interface PreferencesTabProps {
  user?: any; // Tornando o parâmetro opcional
}

export function PreferencesTab({ user = null }: PreferencesTabProps) {
  const { t, locale, setLocale } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  type Theme = 'light' | 'dark' | 'system';
  type Language = string;

  const [preferences, setPreferences] = useState<{
    language: Language;
    theme: Theme;
    notifications: {
      email: boolean;
      browser: boolean;
      sms: boolean;
    };
  }>({
    language: locale || 'pt-BR',
    theme: 'light',
    notifications: {
      email: true,
      browser: true,
      sms: false
    }
  });

  // Aplica o tema no <html>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (preferences.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // Sistema
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  const handleThemeChange = (theme: Theme) => {
    setPreferences(prev => ({ ...prev, theme }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setPreferences(prev => ({ ...prev, language: newLocale }));
    setLocale(newLocale as any);
  };

  const handleNotificationChange = (type: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error(t('common.notAuthorized', 'Não autorizado'));
        return;
      }

      // Estruturar os dados corretamente para o backend
      const updateData = {
        preferences: preferences // Aninhar as preferências em um campo específico
      };

      console.log('Enviando dados para atualização:', updateData);

      const response = await fetch('/api/users-unified/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('Status da resposta:', response.status);
      const responseData = await response.json();
      console.log('Resposta completa:', responseData);

      if (response.ok) {
        toast.success(t('profile.preferencesUpdated', 'Preferências atualizadas com sucesso'));
      } else {
        console.error('Erro retornado pela API:', responseData);
        toast.error(responseData.error || t('profile.preferencesUpdateError', 'Erro ao atualizar preferências'));
      }
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      toast.error(t('profile.preferencesUpdateError', 'Erro ao atualizar preferências'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {t('profile.preferences', 'Preferências')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Idioma */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <FiGlobe className="h-5 w-5 mr-2 text-gray-600" />
            {t('profile.language', 'Idioma')}
          </h3>

          <div className="max-w-xs">
            <select
              value={preferences.language}
              onChange={handleLanguageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {t('profile.languageDescription', 'Selecione o idioma de exibição do sistema')}
            </p>
          </div>
        </div>

        {/* Tema */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <FiMoon className="h-5 w-5 mr-2 text-gray-600" />
            {t('profile.theme', 'Tema')}
          </h3>

          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => handleThemeChange('light')}
              variant={preferences.theme === 'light' ? 'default' : 'outline'}
              className={preferences.theme === 'light' ? 'bg-abz-blue text-white' : ''}
            >
              {t('profile.lightTheme', 'Claro')}
            </Button>
            <Button
              type="button"
              onClick={() => handleThemeChange('dark')}
              variant={preferences.theme === 'dark' ? 'default' : 'outline'}
              className={preferences.theme === 'dark' ? 'bg-abz-blue text-white' : ''}
            >
              {t('profile.darkTheme', 'Escuro')}
            </Button>
            <Button
              type="button"
              onClick={() => handleThemeChange('system')}
              variant={preferences.theme === 'system' ? 'default' : 'outline'}
              className={preferences.theme === 'system' ? 'bg-abz-blue text-white' : ''}
            >
              {t('profile.systemTheme', 'Sistema')}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {t('profile.themeDescription', 'Escolha o tema de exibição do sistema')}
          </p>
        </div>

        {/* Notificações */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
            <FiBell className="h-5 w-5 mr-2 text-gray-600" />
            {t('profile.notifications', 'Notificações')}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailNotifications"
                checked={preferences.notifications.email}
                onChange={(e) => handleNotificationChange('email', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                {t('profile.emailNotifications', 'Receber notificações por e-mail')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="browserNotifications"
                checked={preferences.notifications.browser}
                onChange={(e) => handleNotificationChange('browser', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="browserNotifications" className="ml-2 block text-sm text-gray-700">
                {t('profile.browserNotifications', 'Receber notificações no navegador')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="smsNotifications"
                checked={preferences.notifications.sms}
                onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-700">
                {t('profile.smsNotifications', 'Receber notificações por SMS')}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-abz-blue hover:bg-abz-blue-dark"
          >
            {isLoading ? (
              <>
                <FiLoader className="animate-spin h-5 w-5 mr-2" />
                {t('common.saving', 'Salvando...')}
              </>
            ) : (
              <>
                <FiSave className="h-5 w-5 mr-2" />
                {t('common.save', 'Salvar')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
