'use client';

import React from 'react';
import { ESocialDashboardResumo } from '@/types/e-social';
import { useI18n } from '@/contexts/I18nContext';
import {
  FiFileText, FiClock, FiSend, FiCheckCircle, FiDownload, FiAlertCircle
} from 'react-icons/fi';

interface DashboardESocialProps {
  data: ESocialDashboardResumo | null;
  loading: boolean;
}

const cardsConfig = [
  { key: 'total_eventos', icon: FiFileText, color: 'bg-blue-500', bg: 'bg-blue-50', i18n: 'totalEvents' },
  { key: 'pendentes_revisao', icon: FiClock, color: 'bg-amber-500', bg: 'bg-amber-50', i18n: 'pendingReview' },
  { key: 'fila_envio', icon: FiSend, color: 'bg-indigo-500', bg: 'bg-indigo-50', i18n: 'queued' },
  { key: 'enviados', icon: FiCheckCircle, color: 'bg-emerald-500', bg: 'bg-emerald-50', i18n: 'sent' },
  { key: 'processados', icon: FiDownload, color: 'bg-teal-500', bg: 'bg-teal-50', i18n: 'processed' },
  { key: 'com_erro', icon: FiAlertCircle, color: 'bg-red-500', bg: 'bg-red-50', i18n: 'errors' },
];

export default function DashboardESocial({ data, loading }: DashboardESocialProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cardsConfig.map((card) => {
        const Icon = card.icon;
        const value = data ? data[card.key as keyof ESocialDashboardResumo] ?? 0 : 0;
        return (
          <div key={card.key} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-4">
            <div className={`${card.bg} p-3 rounded-lg`}>
              <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t(`eSocial.dashboard.${card.i18n}`)}</p>
              {loading ? (
                <div className="h-6 w-12 bg-gray-200 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-xl font-bold text-gray-800">{value}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
