'use client';

import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/useToast';
import { FiSave, FiLoader } from 'react-icons/fi';

interface PersonalInfoTabProps {
  user: any;
}

export function PersonalInfoTab({ user }: PersonalInfoTabProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    position: user?.position || '',
    department: user?.department || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      const response = await fetch('/api/users-unified/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          position: formData.position,
          department: formData.department
        })
      });

      if (response.ok) {
        toast.success(t('profile.updateSuccess', 'Informações atualizadas com sucesso'));
      } else {
        const data = await response.json();
        toast.error(data.error || t('profile.updateError', 'Erro ao atualizar informações'));
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(t('profile.updateError', 'Erro ao atualizar informações'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {t('profile.personalInfo', 'Informações Pessoais')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.firstName', 'Nome')}
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.lastName', 'Sobrenome')}
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.position', 'Cargo')}
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.department', 'Departamento')}
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
