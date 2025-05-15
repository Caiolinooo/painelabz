'use client';

import React from 'react';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface ImportProgressProps {
  progress: {
    current: number;
    total: number;
    success: number;
    error: number;
    skipped?: number;
  };
  onComplete: () => void;
  onCancel: () => void;
}

export default function ImportProgress({ progress, onComplete, onCancel }: ImportProgressProps) {
  const { t } = useI18n();

  const isComplete = progress.current === progress.total;
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {isComplete ? t('admin.importComplete') : t('admin.importingUsers')}
      </h3>

      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {progress.current} / {progress.total} {t('admin.records')}
          </span>
          <span className="text-sm font-medium text-gray-700">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${isComplete ? 'bg-green-600' : 'bg-abz-blue'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <FiCheck className="text-green-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">{t('admin.successfulImports')}</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">{progress.success}</p>
        </div>

        {progress.skipped !== undefined && progress.skipped > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <FiCheck className="text-yellow-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Ignorados (duplicatas)</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{progress.skipped}</p>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <FiX className="text-red-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">{t('admin.failedImports')}</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{progress.error}</p>
        </div>
      </div>

      {isComplete ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark"
          >
            {t('common.done')}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <FiLoader className="animate-spin mr-2" />
            {t('admin.processingBatch')}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
