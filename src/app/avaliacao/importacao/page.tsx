'use client';

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiUpload, FiDownload, FiInfo, FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '@/components/PageHeader';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';

export default function ImportacaoPage() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('avaliacoes');
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importStats, setImportStats] = useState<{
    processed: number;
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Verificar tipo de arquivo
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert(t('avaliacao.importacao.invalidFileType'));
        setSelectedFile(null);
        return;
      }

      // Processar arquivo para preview
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', importType);

        const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
        if (!token) {
          throw new Error('Não autorizado');
        }

        // Enviar para processamento inicial (preview)
        const response = await fetch('/api/avaliacao-desempenho/preview', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          setPreviewData(result.data);
        } else {
          throw new Error(result.error || 'Erro ao processar arquivo');
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        alert(error instanceof Error ? error.message : 'Erro desconhecido ao processar arquivo');
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setIsUploading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
      if (!token) {
        throw new Error('Não autorizado');
      }

      // Enviar dados para importação
      const response = await fetch('/api/avaliacao-desempenho/importar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          funcionarios: previewData.filter(item => item.status === 'valid').map(item => item.data)
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setImportStats({
          processed: result.resultado.total || 0,
          imported: result.resultado.imported || 0,
          skipped: 0,
          errors: result.resultado.errors || 0
        });
      } else {
        throw new Error(result.error || 'Erro ao importar dados');
      }
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      alert(error instanceof Error ? error.message : 'Erro desconhecido ao importar dados');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Definir o caminho do modelo com base no tipo de importação
    let templatePath = '';

    switch (importType) {
      case 'funcionarios':
        templatePath = '/templates/modelo_importacao_funcionarios.xlsx';
        break;
      case 'avaliacoes':
        templatePath = '/templates/modelo_importacao_avaliacoes.xlsx';
        break;
      case 'criterios':
        templatePath = '/templates/modelo_importacao_criterios.xlsx';
        break;
      default:
        templatePath = '/templates/modelo_importacao_funcionarios.xlsx';
    }

    // Criar um link para download
    const link = document.createElement('a');
    link.href = templatePath;
    link.download = `modelo_${importType}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <PageHeader
        title={t('avaliacao.importacao.title')}
        description={t('avaliacao.importacao.description')}
        icon={<FiUpload className="w-8 h-8" />}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{t('avaliacao.importacao.title')}</h2>
          <p className="text-gray-600">{t('avaliacao.importacao.description')}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.selectOption')}
          </label>
          <select
            className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
          >
            <option value="avaliacoes">{t('avaliacao.importacao.importAvaliacoes')}</option>
            <option value="funcionarios">{t('avaliacao.importacao.importFuncionarios')}</option>
            <option value="criterios">{t('avaliacao.importacao.importCriterios')}</option>
          </select>
        </div>

        {!selectedFile ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <FiUpload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{t('avaliacao.importacao.instructionsText')}</p>
            <p className="text-gray-500 mb-4">{t('avaliacao.importacao.fileFormat')}</p>
            <label className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded cursor-pointer">
              {t('avaliacao.importacao.selectFile')}
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <FiCheck className="text-green-500 mr-2" />
                <span>{selectedFile.name}</span>
              </div>
              <button
                className="text-red-500"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                  setImportStats(null);
                }}
              >
                <FiX />
              </button>
            </div>

            {previewData && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">{t('avaliacao.importacao.preview')}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {importType === 'funcionarios' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('avaliacao.funcionarios.nome')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('avaliacao.funcionarios.cargo')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('avaliacao.funcionarios.departamento')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('avaliacao.funcionarios.dataAdmissao')}
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {row.status === 'valid' ? (
                              <span className="text-green-500 flex items-center">
                                <FiCheck className="mr-1" /> {t('common.valid')}
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center">
                                <FiX className="mr-1" /> {t('common.error')}
                              </span>
                            )}
                          </td>
                          {importType === 'funcionarios' &&
                            row.data.map((cell: string, index: number) => (
                              <td key={index} className="px-6 py-4 whitespace-nowrap">
                                {cell || (
                                  <span className="text-red-500">{t('common.required')}</span>
                                )}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  {t('avaliacao.importacao.success')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('avaliacao.importacao.rowsProcessed')}</p>
                    <p className="text-xl font-semibold">{importStats.processed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('avaliacao.importacao.rowsImported')}</p>
                    <p className="text-xl font-semibold text-green-600">{importStats.imported}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('avaliacao.importacao.rowsSkipped')}</p>
                    <p className="text-xl font-semibold text-yellow-600">{importStats.skipped}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('avaliacao.importacao.rowsWithErrors')}</p>
                    <p className="text-xl font-semibold text-red-600">{importStats.errors}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <button
            className="flex items-center bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            onClick={handleDownloadTemplate}
          >
            <FiDownload className="mr-2" />
            {t('avaliacao.importacao.template')}
          </button>
          {selectedFile && !importStats && (
            <button
              className={`bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded flex items-center ${
                isUploading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              onClick={handleImport}
              disabled={isUploading}
            >
              {isUploading ? t('avaliacao.importacao.processing') : t('avaliacao.importacao.upload')}
            </button>
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <FiInfo className="text-blue-500 mr-2 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-blue-800 font-medium">{t('avaliacao.importacao.instructions')}</h3>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
                <li>{t('avaliacao.importacao.instructionsText')}</li>
                <li>{t('avaliacao.importacao.fileFormat')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
