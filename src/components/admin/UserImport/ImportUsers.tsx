'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import ImportPreview from './ImportPreview';
import ImportProgress from './ImportProgress';

// Tipos de arquivos suportados
const SUPPORTED_FORMATS = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/plain': ['.txt'], // Para arquivos WK e Dominio (geralmente são TXT)
};

// Tipos de importação suportados
const IMPORT_TYPES = [
  { id: 'excel', label: 'Excel (XLSX/XLS)', formats: ['.xlsx', '.xls'] },
  { id: 'csv', label: 'CSV', formats: ['.csv'] },
  { id: 'wk', label: 'WK', formats: ['.txt'] },
  { id: 'dominio', label: 'Dominio', formats: ['.txt'] },
];

export default function ImportUsers() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('excel');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [importStarted, setImportStarted] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; success: number; error: number }>({
    current: 0,
    total: 0,
    success: 0,
    error: 0,
  });

  // Configuração do dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      // Processar o arquivo para preview
      const data = await processFileForPreview(selectedFile, importType);
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o arquivo');
      setPreviewData([]);
    } finally {
      setIsLoading(false);
    }
  }, [importType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Processar arquivo para preview
  const processFileForPreview = async (file: File, type: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const result = event.target?.result;
          if (!result) {
            reject(new Error('Falha ao ler o arquivo'));
            return;
          }

          let data: any[] = [];

          // Processar com base no tipo de importação
          switch (type) {
            case 'excel':
              // Importar biblioteca xlsx dinamicamente
              const XLSX = await import('xlsx');
              const workbook = XLSX.read(result, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              // Extrair cabeçalhos e dados
              const headers = data[0];
              const rows = data.slice(1);

              // Converter para array de objetos
              data = rows.map(row => {
                const obj: any = {};
                headers.forEach((header: string, index: number) => {
                  obj[header] = row[index];
                });
                return obj;
              });
              break;

            case 'csv':
              // Processar CSV
              const text = result.toString();
              const lines = text.split('\\n');
              const csvHeaders = lines[0].split(',').map(h => h.trim());

              data = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj: any = {};
                csvHeaders.forEach((header, index) => {
                  obj[header] = values[index];
                });
                return obj;
              });
              break;

            case 'wk':
            case 'dominio':
              // Processar arquivos de texto específicos (WK/Dominio)
              // Implementação específica para cada formato
              // Esta é uma implementação simplificada
              const textContent = result.toString();
              const textLines = textContent.split('\\n');

              // Assumindo um formato específico para WK/Dominio
              data = textLines.map(line => {
                const fields = line.split('|').map(f => f.trim());
                return {
                  nome: fields[0] || '',
                  email: fields[1] || '',
                  telefone: fields[2] || '',
                  cargo: fields[3] || '',
                  departamento: fields[4] || '',
                };
              });
              break;

            default:
              reject(new Error('Formato de arquivo não suportado'));
              return;
          }

          // Limitar a 10 registros para preview
          resolve(data.slice(0, 10));
        } catch (error) {
          reject(new Error('Erro ao processar o arquivo. Verifique o formato.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };

      if (type === 'excel') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Iniciar importação
  const startImport = async () => {
    if (!file || previewData.length === 0) {
      setError('Nenhum dado para importar');
      return;
    }

    setImportStarted(true);
    setProgress({
      current: 0,
      total: previewData.length,
      success: 0,
      error: 0,
    });

    try {
      // Processar o arquivo completo
      const allData = await processEntireFile(file, importType);

      // Importar em lotes
      await importInBatches(allData);
    } catch (err: any) {
      setError(err.message || 'Erro durante a importação');
    }
  };

  // Processar arquivo inteiro
  const processEntireFile = async (file: File, type: string): Promise<any[]> => {
    // Implementação similar ao processFileForPreview, mas sem limite de registros
    // Código omitido para brevidade, seria uma versão estendida do processFileForPreview

    // Placeholder para demonstração
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular dados completos
        resolve(Array(50).fill(0).map((_, i) => ({
          nome: `Colaborador ${i + 1}`,
          email: `colaborador${i + 1}@exemplo.com`,
          telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          cargo: 'Analista',
          departamento: 'TI',
        })));
      }, 1000);
    });
  };

  // Importar em lotes
  const importInBatches = async (data: any[]) => {
    const batchSize = 10; // Tamanho do lote
    const totalBatches = Math.ceil(data.length / batchSize);

    setProgress({
      current: 0,
      total: data.length,
      success: 0,
      error: 0,
    });

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);

      try {
        // Enviar lote para o servidor
        const result = await sendBatchToServer(batch);

        // Atualizar progresso
        setProgress(prev => ({
          current: end,
          total: data.length,
          success: prev.success + result.success,
          error: prev.error + result.error,
        }));

        // Pausa entre lotes para não sobrecarregar o servidor
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Erro ao processar lote:', error);
        setError('Erro ao processar lote de dados. A importação continuará com o próximo lote.');

        // Atualizar contagem de erros
        setProgress(prev => ({
          ...prev,
          current: end,
          error: prev.error + batch.length,
        }));
      }
    }
  };

  // Enviar lote para o servidor
  const sendBatchToServer = async (batch: any[]): Promise<{ success: number; error: number }> => {
    try {
      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: batch }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar dados para o servidor');
      }

      const result = await response.json();
      return {
        success: result.success || 0,
        error: result.error || 0,
      };
    } catch (error) {
      console.error('Erro ao enviar lote:', error);
      return {
        success: 0,
        error: batch.length,
      };
    }
  };

  // Cancelar importação
  const cancelImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportStarted(false);
    setProgress({
      current: 0,
      total: 0,
      success: 0,
      error: 0,
    });
  };

  // Reiniciar importação
  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportStarted(false);
    setProgress({
      current: 0,
      total: 0,
      success: 0,
      error: 0,
    });
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('admin.importUsers')}</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
          <FiAlertCircle className="mr-2" />
          {error}
        </div>
      )}

      {!importStarted ? (
        <>
          {/* Seleção de tipo de importação */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.importType')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {IMPORT_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setImportType(type.id)}
                  className={`px-4 py-2 text-sm rounded-md ${
                    importType === type.id
                      ? 'bg-abz-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('admin.supportedFormats')}: {IMPORT_TYPES.find(t => t.id === importType)?.formats.join(', ')}
            </p>
          </div>

          {/* Dropzone para upload */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-abz-blue bg-blue-50'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-abz-blue hover:bg-blue-50'
            }`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="flex flex-col items-center">
                <FiFile className="h-10 w-10 text-green-500 mb-2" />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreviewData([]);
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  {t('common.remove')}
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center">
                <FiLoader className="h-10 w-10 text-abz-blue mb-2 animate-spin" />
                <p className="text-sm text-gray-500">{t('common.processing')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FiUpload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  {isDragActive
                    ? t('admin.dropFileHere')
                    : t('admin.dragAndDropOrClick')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin.maxFileSize', { size: '10MB' })}
                </p>
              </div>
            )}
          </div>

          {/* Preview dos dados */}
          {previewData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                {t('admin.dataPreview')}
              </h3>
              <ImportPreview data={previewData} />

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelImport}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={startImport}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark"
                >
                  {t('admin.startImport')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <ImportProgress
          progress={progress}
          onComplete={resetImport}
          onCancel={cancelImport}
        />
      )}
    </div>
  );
}
