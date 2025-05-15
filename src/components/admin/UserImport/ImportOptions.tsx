'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiMail, FiSmartphone, FiUsers, FiUserCheck } from 'react-icons/fi';

interface ImportOptionsProps {
  options: {
    sendEmailInvites: boolean;
    sendSMSInvites: boolean;
    defaultRole: string;
    skipDuplicates: boolean;
  };
  onChange: (options: any) => void;
}

export default function ImportOptions({ options, onChange }: ImportOptionsProps) {
  const { t } = useI18n();
  
  const handleChange = (field: string, value: any) => {
    onChange({
      ...options,
      [field]: value
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-3">
        {t('admin.importOptions')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opções de convite */}
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="sendEmailInvites"
                type="checkbox"
                checked={options.sendEmailInvites}
                onChange={(e) => handleChange('sendEmailInvites', e.target.checked)}
                className="h-4 w-4 text-abz-blue border-gray-300 rounded focus:ring-abz-blue"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="sendEmailInvites" className="font-medium text-gray-700 flex items-center">
                <FiMail className="mr-1" />
                {t('admin.sendEmailInvites')}
              </label>
              <p className="text-gray-500">{t('admin.sendEmailInvitesDescription')}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="sendSMSInvites"
                type="checkbox"
                checked={options.sendSMSInvites}
                onChange={(e) => handleChange('sendSMSInvites', e.target.checked)}
                className="h-4 w-4 text-abz-blue border-gray-300 rounded focus:ring-abz-blue"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="sendSMSInvites" className="font-medium text-gray-700 flex items-center">
                <FiSmartphone className="mr-1" />
                {t('admin.sendSMSInvites')}
              </label>
              <p className="text-gray-500">{t('admin.sendSMSInvitesDescription')}</p>
            </div>
          </div>
        </div>
        
        {/* Opções de permissões */}
        <div className="space-y-3">
          <div>
            <label htmlFor="defaultRole" className="block text-sm font-medium text-gray-700 flex items-center">
              <FiUserCheck className="mr-1" />
              {t('admin.defaultRole')}
            </label>
            <select
              id="defaultRole"
              value={options.defaultRole}
              onChange={(e) => handleChange('defaultRole', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-abz-blue focus:border-abz-blue sm:text-sm rounded-md"
            >
              <option value="USER">Usuário Padrão</option>
              <option value="ADMIN">Administrador</option>
              <option value="MANAGER">Gerente</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">{t('admin.defaultRoleDescription')}</p>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="skipDuplicates"
                type="checkbox"
                checked={options.skipDuplicates}
                onChange={(e) => handleChange('skipDuplicates', e.target.checked)}
                className="h-4 w-4 text-abz-blue border-gray-300 rounded focus:ring-abz-blue"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="skipDuplicates" className="font-medium text-gray-700 flex items-center">
                <FiUsers className="mr-1" />
                {t('admin.skipDuplicates')}
              </label>
              <p className="text-gray-500">{t('admin.skipDuplicatesDescription')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
