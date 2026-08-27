'use client';

import React, { useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface Collaborator {
  id: string;
  empresa_nome: string;
  embarcacao_nome: string;
  cargo_nome: string;
  centro_custo_nome: string;
  status_embarque: string;
}

interface FiltersState {
  search: string;
  empresa: string;
  embarcacao: string;
  cargo: string;
  centro_custo: string;
  status: string;
  ativo: string;
  apenasStandby: boolean;
  docsVencidos: boolean;
}

interface GTMatrixFiltersProps {
  filters: FiltersState;
  onChange: (partial: Partial<FiltersState>) => void;
  colaboradores?: Collaborator[];
}

const STATUS_OPTIONS = [
  { value: 'embarcado', labelKey: 'gestaoTripulantes.status.embarcado' },
  { value: 'standby', labelKey: 'gestaoTripulantes.status.standby' },
  { value: 'folga', labelKey: 'gestaoTripulantes.status.folga' },
  { value: 'desembarcado', labelKey: 'gestaoTripulantes.status.desembarcado' },
  { value: 'afastado', labelKey: 'gestaoTripulantes.status.afastado' },
  { value: 'ferias', labelKey: 'gestaoTripulantes.status.ferias' },
  { value: 'treinamento', labelKey: 'gestaoTripulantes.status.treinamento' },
];

export default function GTMatrixFilters({ filters, onChange, colaboradores = [] }: GTMatrixFiltersProps) {
  const { t } = useI18n();

  const distinctOptions = useMemo(() => {
    const extract = (key: keyof Collaborator) =>
      Array.from(new Set(
        colaboradores.map(c => (c[key] as string)).filter(Boolean)
      )).sort();
    return {
      empresas: extract('empresa_nome'),
      embarcacoes: extract('embarcacao_nome'),
      cargos: extract('cargo_nome'),
      centrosCusto: extract('centro_custo_nome'),
    };
  }, [colaboradores]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('gestaoTripulantes.filters.search')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
          />
        </div>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filters.empresa}
          onChange={e => onChange({ empresa: e.target.value })}
        >
          <option value="">{t('gestaoTripulantes.filters.allCompanies')}</option>
          {distinctOptions.empresas.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filters.embarcacao}
          onChange={e => onChange({ embarcacao: e.target.value })}
        >
          <option value="">{t('gestaoTripulantes.filters.allVessels')}</option>
          {distinctOptions.embarcacoes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filters.cargo}
          onChange={e => onChange({ cargo: e.target.value })}
        >
          <option value="">{t('gestaoTripulantes.filters.allPositions')}</option>
          {distinctOptions.cargos.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filters.centro_custo}
          onChange={e => onChange({ centro_custo: e.target.value })}
        >
          <option value="">{t('gestaoTripulantes.filters.allCostCenters')}</option>
          {distinctOptions.centrosCusto.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filters.status}
          onChange={e => onChange({ status: e.target.value })}
        >
          <option value="">{t('gestaoTripulantes.filters.allStatus')}</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-blue-200 bg-blue-50/50 text-blue-900 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.ativo || 'ativos'}
          onChange={e => onChange({ ativo: e.target.value })}
        >
          <option value="ativos">Apenas Ativos</option>
          <option value="inativos">Apenas Inativos</option>
          <option value="todos">Todos (Ativos + Inativos)</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.apenasStandby}
            onChange={e => onChange({ apenasStandby: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t('gestaoTripulantes.filters.onlyStandby')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.docsVencidos}
            onChange={e => onChange({ docsVencidos: e.target.checked })}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          {t('gestaoTripulantes.filters.onlyVencidos')}
        </label>
      </div>
    </div>
  );
}
