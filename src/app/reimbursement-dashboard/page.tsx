'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

export default function ReimbursementDashboardRedirect() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Redirect to the tabbed interface with the dashboard tab active
    router.replace('/reembolso?tab=dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <FiLoader className="animate-spin h-10 w-10 text-abz-blue mb-4" />
      <h1 className="text-xl font-semibold text-gray-700 mb-2">
        {t('common.redirecting', 'Redirecionando...')}
      </h1>
      <p className="text-gray-500">
        {t('reimbursement.redirectingToDashboard', 'Redirecionando para o painel de reembolsos...')}
      </p>
    </div>
  );
}
