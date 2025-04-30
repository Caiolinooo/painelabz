'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import ImportUsers from '@/components/Admin/UserImport/ImportUsers';
import { FiUsers, FiUploadCloud, FiInfo } from 'react-icons/fi';

export default function ImportUsersPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.importUsers')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('admin.importUsersDescription')}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <FiInfo className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {t('admin.importInstructions')}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('admin.importInstruction1')}</li>
                <li>{t('admin.importInstruction2')}</li>
                <li>{t('admin.importInstruction3')}</li>
                <li>{t('admin.importInstruction4')}</li>
                <li>{t('admin.importInstruction5')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ImportUsers />

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {t('admin.templateDownload')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('admin.downloadTemplateDescription')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/templates/import-users-excel.xlsx"
            download
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FiUploadCloud className="mr-2 text-abz-blue" />
            <span className="text-sm font-medium">Excel Template</span>
          </a>
          
          <a
            href="/templates/import-users-csv.csv"
            download
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FiUploadCloud className="mr-2 text-abz-blue" />
            <span className="text-sm font-medium">CSV Template</span>
          </a>
          
          <a
            href="/templates/import-users-txt.txt"
            download
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FiUploadCloud className="mr-2 text-abz-blue" />
            <span className="text-sm font-medium">TXT Template (WK/Dominio)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
