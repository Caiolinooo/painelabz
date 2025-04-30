'use client';

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiFileText, FiDownload, FiCalendar } from 'react-icons/fi';
import PageHeader from '@/components/PageHeader';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';

export default function RelatoriosPage() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const [tipoRelatorio, setTipoRelatorio] = useState('individual');
  const [periodoRelatorio, setPeriodoRelatorio] = useState('mensal');
  const [funcionario, setFuncionario] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const handleGerarRelatorio = () => {
    // Implementação futura
    console.log('Gerando relatório...');
  };

  return (
    <MainLayout>
      <PageHeader
        title={t('avaliacao.relatorios.title')}
        description={t('avaliacao.relatorios.description')}
        icon={<FiFileText className="w-8 h-8" />}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">{t('avaliacao.relatorios.gerarRelatorio')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('avaliacao.relatorios.tipoRelatorio')}
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value)}
            >
              <option value="individual">{t('avaliacao.relatorios.tipoOptions.individual')}</option>
              <option value="departamento">{t('avaliacao.relatorios.tipoOptions.departamento')}</option>
              <option value="geral">{t('avaliacao.relatorios.tipoOptions.geral')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('avaliacao.relatorios.periodoRelatorio')}
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={periodoRelatorio}
              onChange={(e) => setPeriodoRelatorio(e.target.value)}
            >
              <option value="mensal">{t('avaliacao.periodoOptions.mensal')}</option>
              <option value="trimestral">{t('avaliacao.periodoOptions.trimestral')}</option>
              <option value="semestral">{t('avaliacao.periodoOptions.semestral')}</option>
              <option value="anual">{t('avaliacao.periodoOptions.anual')}</option>
            </select>
          </div>

          {tipoRelatorio === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('avaliacao.relatorios.funcionarioRelatorio')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={funcionario}
                onChange={(e) => setFuncionario(e.target.value)}
              >
                <option value="">{t('common.selectOption')}</option>
                {/* Opções de funcionários serão carregadas dinamicamente */}
              </select>
            </div>
          )}

          {tipoRelatorio === 'departamento' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('avaliacao.relatorios.departamentoRelatorio')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              >
                <option value="">{t('common.selectOption')}</option>
                {/* Opções de departamentos serão carregadas dinamicamente */}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('avaliacao.relatorios.dataInicio')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-gray-400" />
              </div>
              <input
                type="date"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('avaliacao.relatorios.dataFim')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-gray-400" />
              </div>
              <input
                type="date"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            className="flex items-center bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
          >
            <FiDownload className="mr-2" />
            {t('avaliacao.relatorios.exportarExcel')}
          </button>
          <button
            className="flex items-center bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
          >
            <FiDownload className="mr-2" />
            {t('avaliacao.relatorios.exportarPDF')}
          </button>
          <button
            className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded"
            onClick={handleGerarRelatorio}
          >
            {t('avaliacao.relatorios.gerarRelatorio')}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">{t('avaliacao.relatorios.title')}</h2>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <FiFileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">{t('avaliacao.relatorios.noRelatorios')}</p>
        </div>
      </div>
    </MainLayout>
  );
}
