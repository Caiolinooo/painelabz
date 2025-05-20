'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { PasswordRequiredGuard } from '@/components/Auth/PasswordRequiredGuard';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { ProfileTabs } from '@/components/Profile/ProfileTabs';
import { PersonalInfoTab } from '@/components/Profile/PersonalInfoTab';
import { ContactInfoTab } from '@/components/Profile/ContactInfoTab';
import { SecurityTab } from '@/components/Profile/SecurityTab';
import { PreferencesTab } from '@/components/Profile/PreferencesTab';
import { LoadingIndicator } from '@/components/UI/LoadingIndicator';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('personal');
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated) {
      setIsPageLoading(false);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isPageLoading || isLoading) {
    return <LoadingIndicator message={t('common.loading', 'Carregando...')} />;
  }

  return (
    <PasswordRequiredGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <ProfileHeader user={user} />
          
          <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="p-6">
              {activeTab === 'personal' && <PersonalInfoTab user={user} />}
              {activeTab === 'contact' && <ContactInfoTab user={user} />}
              {activeTab === 'security' && <SecurityTab user={user} />}
              {activeTab === 'preferences' && <PreferencesTab user={user} />}
            </div>
          </div>
        </div>
      </div>
    </PasswordRequiredGuard>
  );
}
