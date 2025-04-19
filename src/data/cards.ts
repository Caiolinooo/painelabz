/**
 * Definição dos cards do dashboard
 * Estes dados podem ser editados pelo painel de administração
 */

import {
  FiBookOpen,
  FiClipboard,
  FiFileText,
  FiBriefcase,
  FiCalendar,
  FiRss,
  FiDollarSign,
  FiClock,
  FiUser
} from 'react-icons/fi';
import { IconType } from 'react-icons';

export interface DashboardCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: IconType;
  color: string;
  hoverColor: string;
  external: boolean;
  enabled: boolean;
  order: number;
  // Permissões de acesso
  adminOnly?: boolean;
  managerOnly?: boolean;
  allowedRoles?: string[];
  allowedUserIds?: string[];
}

// Função para obter os cards do dashboard com traduções
export function getTranslatedCards(t: (key: string, params?: Record<string, any>) => string) {
  return [
    {
      id: 'manual',
      title: t('cards.manualColaborador'),
      description: t('cards.manualColaboradorDesc'),
      href: '/manual',
      icon: FiBookOpen,
      color: 'bg-abz-blue',
      hoverColor: 'hover:bg-abz-blue-dark',
      external: false,
      enabled: true,
      order: 1
    },
    {
      id: 'procedimentos-logistica',
      title: t('cards.procedimentosLogistica'),
      description: t('cards.procedimentosLogisticaDesc'),
      href: '/procedimentos-logistica',
      icon: FiClipboard,
      color: 'bg-abz-green',
      hoverColor: 'hover:bg-abz-green-dark',
      external: false,
      enabled: true,
      order: 2
    },
    {
      id: 'politicas',
      title: t('cards.politicas'),
      description: t('cards.politicasDesc'),
      href: '/politicas',
      icon: FiFileText,
      color: 'bg-abz-purple',
      hoverColor: 'hover:bg-abz-purple-dark',
      external: false,
      enabled: true,
      order: 3
    },
    {
      id: 'procedimentos',
      title: t('cards.procedimentosGerais'),
      description: t('cards.procedimentosGeraisDesc'),
      href: '/procedimentos',
      icon: FiBriefcase,
      color: 'bg-abz-orange',
      hoverColor: 'hover:bg-abz-orange-dark',
      external: false,
      enabled: true,
      order: 4
    },
    {
      id: 'calendario',
      title: t('cards.calendario'),
      description: t('cards.calendarioDesc'),
      href: '/calendario',
      icon: FiCalendar,
      color: 'bg-abz-teal',
      hoverColor: 'hover:bg-abz-teal-dark',
      external: false,
      enabled: true,
      order: 5
    },
    {
      id: 'noticias',
      title: t('cards.noticias'),
      description: t('cards.noticiasDesc'),
      href: '/noticias',
      icon: FiRss,
      color: 'bg-abz-red',
      hoverColor: 'hover:bg-abz-red-dark',
      external: false,
      enabled: true,
      order: 6
    },
    {
      id: 'reembolso',
      title: t('cards.reembolso'),
      description: t('cards.reembolsoDesc'),
      href: '/reembolso',
      icon: FiDollarSign,
      color: 'bg-abz-blue',
      hoverColor: 'hover:bg-abz-blue-dark',
      external: false,
      enabled: true,
      order: 7
    },
    {
      id: 'contracheque',
      title: t('cards.contracheque'),
      description: t('cards.contrachequeDesc'),
      href: '/contracheque',
      icon: FiDollarSign,
      color: 'bg-abz-green',
      hoverColor: 'hover:bg-abz-green-dark',
      external: false,
      enabled: true,
      order: 8
    },
    {
      id: 'ponto',
      title: t('cards.ponto'),
      description: t('cards.pontoDesc'),
      href: '/ponto',
      icon: FiClock,
      color: 'bg-abz-purple',
      hoverColor: 'hover:bg-abz-purple-dark',
      external: false,
      enabled: true,
      order: 9
    }
  ] as DashboardCard[];
}

// Lista de cards do dashboard (versão estática para compatibilidade)
const dashboardCards: DashboardCard[] = [
  {
    id: 'manual',
    title: 'Manual do Colaborador',
    description: 'Acesse o manual completo do colaborador.',
    href: '/manual',
    icon: FiBookOpen,
    color: 'bg-abz-blue',
    hoverColor: 'hover:bg-abz-blue-dark',
    external: false,
    enabled: true,
    order: 1
  },
  {
    id: 'procedimentos-logistica',
    title: 'Procedimentos de Logística',
    description: 'Consulte os procedimentos padrões da área.',
    href: '/procedimentos-logistica',
    icon: FiClipboard,
    color: 'bg-abz-green',
    hoverColor: 'hover:bg-abz-green-dark',
    external: false,
    enabled: true,
    order: 2
  },
  {
    id: 'politicas',
    title: 'Políticas',
    description: 'Visualize as políticas de HSE e Qualidade.',
    href: '/politicas',
    icon: FiFileText,
    color: 'bg-abz-purple',
    hoverColor: 'hover:bg-abz-purple-dark',
    external: false,
    enabled: true,
    order: 3
  },
  {
    id: 'procedimentos',
    title: 'Procedimentos Gerais',
    description: 'Documentos e diretrizes gerais.',
    href: '/procedimentos',
    icon: FiBriefcase,
    color: 'bg-abz-cyan',
    hoverColor: 'hover:bg-abz-cyan-dark',
    external: false,
    enabled: true,
    order: 4
  },
  {
    id: 'calendario',
    title: 'Calendário',
    description: 'Veja feriados nacionais e locais.',
    href: '/calendario',
    icon: FiCalendar,
    color: 'bg-abz-red',
    hoverColor: 'hover:bg-abz-red-dark',
    external: false,
    enabled: true,
    order: 5
  },
  {
    id: 'noticias',
    title: 'ABZ News',
    description: 'Últimas notícias e comunicados.',
    href: '/noticias',
    icon: FiRss,
    color: 'bg-abz-pink',
    hoverColor: 'hover:bg-abz-pink-dark',
    external: false,
    enabled: true,
    order: 6
  },
  {
    id: 'reembolso',
    title: 'Reembolso',
    description: 'Solicite reembolsos de despesas.',
    href: '/reembolso',
    icon: FiDollarSign,
    color: 'bg-abz-yellow',
    hoverColor: 'hover:bg-abz-yellow-dark',
    external: false,
    enabled: true,
    order: 7
  },
  {
    id: 'contracheque',
    title: 'Contracheque',
    description: 'Acesse seus contracheques.',
    href: '/contracheque',
    icon: FiDollarSign,
    color: 'bg-abz-orange',
    hoverColor: 'hover:bg-abz-orange-dark',
    external: false,
    enabled: true,
    order: 8
  },
  {
    id: 'ponto',
    title: 'Ponto',
    description: 'Registre seu ponto.',
    href: '/ponto',
    icon: FiClock,
    color: 'bg-abz-teal',
    hoverColor: 'hover:bg-abz-teal-dark',
    external: false,
    enabled: true,
    order: 9
  }
];

export default dashboardCards;
