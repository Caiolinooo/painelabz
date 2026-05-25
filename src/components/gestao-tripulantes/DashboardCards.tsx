'use client';

import React from 'react';
import { FiUsers, FiAnchor, FiUserCheck, FiAlertTriangle } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface DashboardData {
  total_colaboradores: number;
  total_embarcados: number;
  total_disponiveis: number;
  total_docs_vencidos: number;
  total_docs_vencendo: number;
  asos_pendentes_revisao: number;
}

interface DashboardCardsProps {
  data: DashboardData | null;
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-16 bg-gray-200 rounded" />
    </div>
  );
}

export default function DashboardCards({ data }: DashboardCardsProps) {
  const { t } = useI18n();

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      label: t('gestaoTripulantes.dashboard.totalCollaborators'),
      value: data.total_colaboradores,
      icon: FiUsers,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      label: t('gestaoTripulantes.dashboard.onboardNow'),
      value: data.total_embarcados,
      icon: FiAnchor,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      label: t('gestaoTripulantes.dashboard.availableBackup'),
      value: data.total_disponiveis,
      icon: FiUserCheck,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      label: t('gestaoTripulantes.dashboard.expiredDocs'),
      value: data.total_docs_vencidos,
      icon: FiAlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-500',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
          </div>
          <div className={`p-3 rounded-full ${card.bgColor} ${card.textColor}`}>
            <card.icon className="w-6 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
}
