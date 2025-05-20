'use client';

import { useI18n } from '@/contexts/I18nContext';
import { FiUser, FiMail, FiLock, FiSettings } from 'react-icons/fi';

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function ProfileTabs({ activeTab, setActiveTab }: ProfileTabsProps) {
  const { t } = useI18n();

  const tabs = [
    {
      id: 'personal',
      label: t('profile.personalInfo', 'Informações Pessoais'),
      icon: <FiUser className="h-5 w-5" />
    },
    {
      id: 'contact',
      label: t('profile.contactInfo', 'Informações de Contato'),
      icon: <FiMail className="h-5 w-5" />
    },
    {
      id: 'security',
      label: t('profile.security', 'Segurança'),
      icon: <FiLock className="h-5 w-5" />
    },
    {
      id: 'preferences',
      label: t('profile.preferences', 'Preferências'),
      icon: <FiSettings className="h-5 w-5" />
    }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
