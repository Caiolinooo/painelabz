'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import {
  FiArrowRightCircle,
  FiExternalLink,
  FiDownload,
  FiAlertCircle
} from 'react-icons/fi';
import Link from 'next/link';
import dashboardCards, { getTranslatedCards, DashboardCard } from '@/data/cards';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

// Importar ícones dinamicamente
import * as FiIcons from 'react-icons/fi';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();
  const { config } = useSiteConfig();
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para mapear strings de ícones para componentes de ícones
  const getIconComponent = (iconName: string) => {
    // Se o iconName já for um componente, retorná-lo
    if (typeof iconName !== 'string') {
      return iconName;
    }

    // Remover o prefixo "Fi" se existir
    const name = iconName.startsWith('Fi') ? iconName : `Fi${iconName}`;

    // @ts-ignore - Acessar dinamicamente o ícone
    return FiIcons[name] || FiIcons.FiGrid;
  };

  // Carregar cards do banco de dados
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // Usar os cards estáticos como fallback
        const staticCards = getTranslatedCards(t);
        setCards(staticCards);

        // Tentar carregar os cards do banco de dados
        try {
          const response = await fetch('/api/cards');

          if (response.ok) {
            const data = await response.json();

            // Mapear os dados para o formato esperado e aplicar traduções
            const dbCards = data.map((card: any) => {
              // Verificar o idioma atual usando o contexto de i18n
              const currentLanguage = t.locale || 'pt-BR'; // Obter o locale do contexto t ou usar pt-BR como padrão
              let title = card.title;
              let description = card.description;

              // Se o idioma for inglês e existirem campos de tradução, usar eles
              if (currentLanguage === 'en-US') {
                if (card.titleEn) {
                  title = card.titleEn;
                }

                if (card.descriptionEn) {
                  description = card.descriptionEn;
                }
              }

              // Processar o ID do card para usar nas traduções
              // Remover hífens para compatibilidade com as chaves de tradução
              const cardIdForTranslation = card.id.replace(/-/g, '');

              // Tentar encontrar traduções para o título e descrição usando diferentes padrões de chaves
              let translatedTitle = '';
              let translatedDesc = '';

              // 1. Tentar usar o ID exato como está no objeto de traduções
              if (t(`cards.${card.id}`, '') !== `cards.${card.id}`) {
                translatedTitle = t(`cards.${card.id}`, '');
                translatedDesc = t(`cards.${card.id}Desc`, '');
              }

              // 2. Tentar usar o ID sem hífens (formato mais comum nas traduções)
              if (!translatedTitle || translatedTitle === card.id) {
                if (t(`cards.${cardIdForTranslation}`, '') !== `cards.${cardIdForTranslation}`) {
                  translatedTitle = t(`cards.${cardIdForTranslation}`, '');
                  translatedDesc = t(`cards.${cardIdForTranslation}Desc`, '');
                }
              }

              // 3. Para cards específicos, verificar traduções diretas
              if (card.id === 'avaliacao' || card.id.includes('avaliacao')) {
                translatedTitle = t('avaliacao.title', '') || translatedTitle;
                translatedDesc = t('avaliacao.description', '') || translatedDesc;
              }

              if (card.id === 'admin' || card.id.includes('admin')) {
                translatedTitle = t('admin.title', '') || translatedTitle;
                translatedDesc = t('admin.dashboard', '') || translatedDesc;
              }

              // Se ainda não encontrou traduções, usar os valores originais
              if (!translatedTitle || translatedTitle === card.id || translatedTitle === `cards.${card.id}` || translatedTitle === `cards.${cardIdForTranslation}`) {
                translatedTitle = title;
              }

              if (!translatedDesc || translatedDesc === `cards.${card.id}Desc` || translatedDesc === `cards.${cardIdForTranslation}Desc`) {
                translatedDesc = description;
              }

              return {
                id: card.id,
                title: translatedTitle,
                description: translatedDesc,
                href: card.href,
                icon: getIconComponent(card.icon),
                color: card.color,
                hoverColor: card.hoverColor,
                external: card.external,
                enabled: card.enabled,
                order: card.order,
                adminOnly: card.adminOnly,
                managerOnly: card.managerOnly,
                allowedRoles: card.allowedRoles,
                allowedUserIds: card.allowedUserIds
              };
            });

            // Atualizar os cards se houver dados
            if (dbCards && dbCards.length > 0) {
              setCards(dbCards);
            }
          }
        } catch (err) {
          console.error('Erro ao carregar cards do banco de dados:', err);
          // Não definir erro para usar os cards estáticos como fallback
        }
      } catch (err) {
        console.error('Erro ao inicializar cards:', err);
        setError('Erro ao carregar cards');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [t]);

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

        {/* Estado de carregamento */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-abz-blue"></div>
            <span className="ml-2 text-gray-600">{t('common.loading', 'Carregando...')}</span>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">{t('common.error', 'Ocorreu um erro')}</h3>
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-sm text-red-700 mt-2">
                {t('common.tryAgain', 'Tente novamente mais tarde ou entre em contato com o suporte.')}
              </p>
            </div>
          </div>
        )}

        {/* Grid de Cards - Applying standard card style */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cards
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
                // Usar a cor primária da configuração do site
                const buttonStyle = {
                  backgroundColor: config.primaryColor,
                };
                const buttonClasses = "inline-flex items-center px-4 py-2 text-white rounded-md hover:opacity-90 transition-colors text-sm font-medium shadow-sm";

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
                    {card.external ? (
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses}
                        style={{backgroundColor: config.primaryColor}}
                        title={`${t('dashboard.access')} ${card.title}`}
                      >
                        <FiExternalLink className="mr-1.5" />
                        {t('dashboard.access')}
                      </a>
                    ) : (
                      <Link
                        href={card.href}
                        className={buttonClasses}
                        style={{backgroundColor: config.primaryColor}}
                        title={`${t('dashboard.access')} ${card.title}`}
                      >
                        <FiArrowRightCircle className="mr-1.5" />
                        {t('dashboard.access')}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mensagem se não houver cards */}
        {!loading && !error && cards.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">{t('dashboard.noCards', 'Nenhum card disponível no momento.')}</p>
          </div>
        )}

        {/* Banner Informativo */}
        <div className="bg-abz-light-blue bg-opacity-40 rounded-lg border border-abz-blue border-opacity-20 p-6 mt-6">
          <h2 className="text-lg font-semibold text-abz-blue-dark mb-2">
            {t('dashboard.quickAccessFeatures')}
          </h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>{t('dashboard.centralizedPanel')}</p>
            <p>{t('dashboard.contactSupport')}</p>
          </div>
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-abz-blue border-opacity-20">
              <Link
                href="/admin"
                style={{
                  backgroundColor: config.secondaryColor,
                  color: config.secondaryColor === '#ffffff' ? '#000000' : '#ffffff'
                }}
                className="inline-flex items-center px-4 py-2 rounded-md hover:opacity-90 transition-colors text-sm font-medium shadow-sm"
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
