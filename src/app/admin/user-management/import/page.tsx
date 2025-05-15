'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import ImportUsers from '@/components/Admin/UserImport/ImportUsers';
import { FiUsers, FiUploadCloud, FiInfo, FiFileText, FiBarChart2 } from 'react-icons/fi';

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
        <div className="mt-4 md:mt-0 flex space-x-2">
          <a
            href="/admin/user-management/convert-office365"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiUploadCloud className="mr-2 -ml-1 h-5 w-5 text-gray-500" />
            Converter Planilha Office 365
          </a>
          <a
            href="/admin/user-management/import/documentation"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiFileText className="mr-2 -ml-1 h-5 w-5 text-gray-500" />
            Documentação
          </a>
          <a
            href="/admin/user-management/import/dashboard"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiBarChart2 className="mr-2 -ml-1 h-5 w-5 text-gray-500" />
            Dashboard
          </a>
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
                <li>Recomendamos usar o template do Office 365 para importação de funcionários</li>
                <li>Você pode exportar dados do Office 365 e usar diretamente para importação</li>
                <li>Certifique-se de que os dados incluam pelo menos nome e um contato (email ou telefone)</li>
                <li>Para importar muitos funcionários, recomendamos dividir em lotes de até 100 registros</li>
                <li>Após a importação, os usuários precisarão definir suas senhas no primeiro acesso</li>
                <li>Você pode optar por enviar convites por email ou SMS durante a importação</li>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-2">
            <a
              href="/templates/office365-import-template.xlsx"
              download
              className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50 bg-blue-50"
            >
              <FiUploadCloud className="mr-2 text-abz-blue" />
              <span className="text-sm font-medium">Office 365 Template</span>
            </a>
            <a
              href="/templates/office365-sample-data.xlsx"
              download
              className="flex items-center justify-center p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-xs"
            >
              <span className="text-gray-600">Baixar Exemplo</span>
            </a>
          </div>

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
