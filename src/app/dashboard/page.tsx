'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import {
  FiArrowRightCircle,
  FiExternalLink,
  FiDownload
} from 'react-icons/fi';
import Link from 'next/link';
import dashboardCards, { getTranslatedCards } from '@/data/cards';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

// Os cards do dashboard agora são importados de src/data/cards.ts

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();

  // Obter os cards traduzidos
  const translatedCards = getTranslatedCards(t);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Título da Página com estilo aprimorado */}
        <div className="pb-5 border-b border-gray-200">
          <h1 className="text-3xl font-extrabold text-abz-blue-dark">
            {t('dashboard.logisticsPanel')}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('dashboard.welcomeMessage')}
          </p>
        </div>

        {/* Grid de Cards - Applying standard card style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {translatedCards
            .filter(card => {
              // Filtrar cards com base nas permissões
              if (!card.enabled) return false;

              // Verificar permissões de acesso
              if (card.adminOnly && !isAdmin) return false;
              if (card.managerOnly && !(isAdmin || user?.role === 'MANAGER')) return false;

              // Verificar roles permitidas
              if (card.allowedRoles && card.allowedRoles.length > 0) {
                const userRole = user?.role || 'USER';
                if (!card.allowedRoles.includes(userRole.toLowerCase())) {
                  // Administradores sempre têm acesso
                  if (userRole !== 'ADMIN') return false;
                }
              }

              // Verificar usuários permitidos
              if (card.allowedUserIds && card.allowedUserIds.length > 0) {
                if (!user?.id || !card.allowedUserIds.includes(user.id)) {
                  // Administradores sempre têm acesso
                  if (user?.role !== 'ADMIN') return false;
                }
              }

              return true;
            })
            .sort((a, b) => a.order - b.order)
            .map((card) => {
              const Icon = card.icon; // Get icon component
              // Standard blue button classes
              const buttonClasses = "inline-flex items-center px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark transition-colors text-sm font-medium shadow-sm";

              return (
                <div
                key={card.id}
                  // Standard card container styling
                  className="bg-white rounded-lg shadow-md p-5 transition-shadow hover:shadow-lg flex flex-col h-full"
                >
                {/* Top section with icon and title */}
                <div className="flex items-start mb-3">
                  <div className="bg-abz-light-blue p-3 rounded-full mr-3 flex-shrink-0">
                      <Icon className="text-abz-blue w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-abz-text-black flex-1">{card.title}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-abz-text-dark mb-4 flex-grow">
                    {card.description}
                  </p>

                {/* Link/Button at the bottom */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <Link
                    href={card.href}
                    target={card.external ? '_blank' : '_self'}
                    rel={card.external ? 'noopener noreferrer' : ''}
                    className={buttonClasses} // Apply button styling to the link
                    title={`${t('dashboard.access')} ${card.title}`}
                  >
                    {card.external ? <FiExternalLink className="mr-1.5" /> : <FiArrowRightCircle className="mr-1.5" />}
                    {t('dashboard.access')}
                  </Link>
                  {/* We can add a download button here too if applicable, like in other pages */}
                  {/* Example:
                  <a href="#" download className="ml-2 inline-flex ... bg-gray-100 ...">
                    <FiDownload className="mr-1.5" /> Download
                  </a>
                  */}
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner Informativo */}
        <div className="bg-abz-light-blue bg-opacity-40 rounded-lg border border-abz-blue border-opacity-20 p-6 mt-6">
          <h2 className="text-lg font-semibold text-abz-blue-dark mb-2">
            {t('dashboard.quickAccessFeatures')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('dashboard.centralizedPanel')}
            {t('dashboard.contactSupport')}
          </p>
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-abz-blue border-opacity-20">
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-abz-purple text-white rounded-md hover:bg-abz-purple-dark transition-colors text-sm font-medium shadow-sm"
              >
                {t('dashboard.accessAdminPanel')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
