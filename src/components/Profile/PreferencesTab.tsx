'use client';

import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/useToast';
import { FiSave, FiLoader, FiGlobe, FiMoon, FiBell } from 'react-icons/fi';

interface PreferencesTabProps {
  user: any;
}

export function PreferencesTab({ user }: PreferencesTabProps) {
  const { t, locale, setLocale } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    language: locale || 'pt-BR',
    theme: 'light',
    notifications: {
      email: true,
      browser: true,
      sms: false
    }
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setPreferences(prev => ({ ...prev, language: newLocale }));
    setLocale(newLocale);
  };

  const handleThemeChange = (theme: string) => {
    setPreferences(prev => ({ ...prev, theme }));
    // Implementar lógica para mudar o tema
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

      // Simular uma chamada de API para salvar as preferências
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(t('profile.preferencesUpdated', 'Preferências atualizadas com sucesso'));
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
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`px-4 py-2 rounded-md ${
                preferences.theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {t('profile.lightTheme', 'Claro')}
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`px-4 py-2 rounded-md ${
                preferences.theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {t('profile.darkTheme', 'Escuro')}
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`px-4 py-2 rounded-md ${
                preferences.theme === 'system'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {t('profile.systemTheme', 'Sistema')}
            </button>
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
                {t('common.save', 'Salvar')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
