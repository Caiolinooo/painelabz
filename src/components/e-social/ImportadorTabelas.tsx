'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';
import { 
  FiUploadCloud, 
  FiSearch, 
  FiChevronLeft, 
  FiChevronRight, 
  FiCheckCircle, 
  FiAlertCircle,
  FiFileText,
  FiBookOpen,
  FiFolder
} from 'react-icons/fi';

interface TableRecord {
  id: number;
  codigo: string;
  descricao: string;
  dt_inicio?: string;
  dt_fim?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ImportadorTabelas() {
  const [tabelaTarget, setTabelaTarget] = useState<'tabela-27' | 'tabela-50'>('tabela-27');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TableRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    totalImported?: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Fetch data on target table, search or page changes
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithToken(
        `/api/e-social/${tabelaTarget}?search=${encodeURIComponent(search)}&page=${page}&limit=15`
      );
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
          setPagination(body.pagination);
        }
      } else {
        toast.error('Erro ao carregar dados da tabela.');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      toast.error('Erro de conexão ao buscar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tabelaTarget, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast.error('Apenas arquivos CSV (.csv) são permitidos.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setUploadResult(null);
      } else {
        toast.error('Apenas arquivos CSV (.csv) são permitidos.');
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setUploadResult(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tabela', tabelaTarget);

      const res = await fetchWithToken('/api/e-social/importar-tabelas', {
        method: 'POST',
        body: formData
      });

      const body = await res.json();
      if (res.ok && body.success) {
        toast.success(body.message || 'Importação realizada com sucesso!');
        setUploadResult({
          success: true,
          message: body.message,
          totalImported: body.totalImported
        });
        setFile(null);
        setPage(1);
        fetchData();
      } else {
        const errMsg = body.error || 'Erro ao processar importação.';
        toast.error(errMsg);
        setUploadResult({
          success: false,
          message: errMsg
        });
      }
    } catch (err) {
      console.error('Erro de upload:', err);
      toast.error('Erro de rede ao enviar o arquivo.');
      setUploadResult({
        success: false,
        message: 'Falha de comunicação com o servidor.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Table Selector Tabs */}
      <div className="bg-slate-50 p-1 rounded-lg border border-slate-100 flex gap-2 w-fit">
        <button
          onClick={() => { setTabelaTarget('tabela-27'); setPage(1); setUploadResult(null); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
            tabelaTarget === 'tabela-27'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiBookOpen size={16} />
          Tabela 27 (Procedimentos e Exames)
        </button>
        <button
          onClick={() => { setTabelaTarget('tabela-50'); setPage(1); setUploadResult(null); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
            tabelaTarget === 'tabela-50'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiFolder size={16} />
          Tabela 50 (CBO - Cargos)
        </button>
      </div>

      {/* Upload Section Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FiUploadCloud className="text-blue-500" />
          Importar Planilha CSV
        </h2>
        <p className="text-sm text-slate-500">
          Atualize os dados enviando arquivos oficiais do governo no formato CSV. O delimitador será detectado automaticamente.
        </p>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <FiFileText size={36} className={`mb-3 ${file ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
            
            {file ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Arrastar arquivo CSV aqui ou clique para buscar</p>
                <p className="text-xs text-slate-400 mt-1">Apenas arquivos .csv oficiais do e-Social</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {file && (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="px-4 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Importando...' : 'Iniciar Importação'}
              </button>
            </div>
          )}
        </form>

        {/* Upload feedback */}
        {uploadResult && (
          <div className={`p-4 rounded-lg border flex gap-3 ${
            uploadResult.success 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            {uploadResult.success ? (
              <>
                <FiCheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">{uploadResult.message}</p>
                  {uploadResult.totalImported !== undefined && (
                    <p className="text-xs mt-0.5">Total de registros atualizados/inseridos: {uploadResult.totalImported}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <FiAlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold">{uploadResult.message}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Query/Listing Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800">
            {tabelaTarget === 'tabela-27' 
              ? 'Pesquisar Procedimentos e Exames' 
              : 'Pesquisar CBOs e Cargos'}
          </h2>
          
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código ou descrição..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <FiSearch className="absolute left-3 top-3 text-slate-400" size={15} />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-semibold hover:bg-slate-900 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Data list table */}
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 w-32">Código</th>
                <th className="px-6 py-3">Descrição Oficial e-Social</th>
                <th className="px-6 py-3 w-40">Início Vigência</th>
                <th className="px-6 py-3 w-40">Fim Vigência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 animate-pulse rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 animate-pulse rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 animate-pulse rounded w-20" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                data.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-600">{record.codigo}</td>
                    <td className="px-6 py-4 max-w-lg truncate" title={record.descricao}>
                      {record.descricao}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {record.dt_inicio ? `${record.dt_inicio.substring(0,2)}/${record.dt_inicio.substring(2,4)}/${record.dt_inicio.substring(4)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {record.dt_fim ? `${record.dt_fim.substring(0,2)}/${record.dt_fim.substring(2,4)}/${record.dt_fim.substring(4)}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Mostrando página <span className="font-semibold text-slate-800">{pagination.page}</span> de{' '}
              <span className="font-semibold text-slate-800">{pagination.pages}</span> (Total de{' '}
              <span className="font-semibold text-slate-800">{pagination.total}</span> registros)
            </p>
            
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 border rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page === pagination.pages}
                className="p-2 border rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
