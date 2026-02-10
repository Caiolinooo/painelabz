'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiLayers, FiList, FiFileText, FiEdit, FiUsers, FiSettings, FiUserCheck, FiRefreshCw, FiBarChart2, FiKey, FiTool, FiUserX, FiDollarSign, FiCheck, FiEdit3, FiDatabase, FiShield } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';

// Componente de card para o dashboard de administração
interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const AdminCard = ({ title, description, icon: Icon, href, color }: AdminCardProps) => {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col h-full border-t-4 ${color}`}
    >
      <div className="flex items-start mb-4">
        <div className="p-3 rounded-full bg-gray-100 mr-4">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm flex-grow">{description}</p>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-sm font-medium text-abz-blue">{t('common.manage')} &rarr;</span>
      </div>
    </Link>
  );
};

export default function AdminDashboard() {
  const { user, profile, isAdmin } = useSupabaseAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [isFixingPermissions, setIsFixingPermissions] = useState(false);

  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Adicionar logs para depuração
  console.log('AdminDashboard - isAdmin:', isAdmin);
  console.log('AdminDashboard - user:', user);
  console.log('AdminDashboard - Ambiente de desenvolvimento:', isDevelopment);

  // Função para corrigir permissões de administrador
  const fixAdminPermissions = () => {
    setIsFixingPermissions(true);
    router.push('/admin-fix');
  };

  // Mapeamento de categorias e seus itens
  const groupedMenuItems = {
    system: [
      { title: 'admin.systemSetup', description: 'admin.systemSetupDesc', icon: FiTool, href: '/admin/setup', color: 'border-gray-500' },
      { title: 'admin.settings', description: 'admin.settingsDesc', icon: FiSettings, href: '/admin/settings', color: 'border-slate-500' },
      { title: 'admin.fixPermissions', description: 'admin.fixPermissionsDesc', icon: FiUserCheck, href: '/admin-fix', color: 'border-amber-500' },
    ],
    content: [
      { title: 'admin.cards', description: 'admin.cardsDesc', icon: FiLayers, href: '/admin/cards', color: 'border-blue-500' },
      { title: 'admin.menu', description: 'admin.menuDesc', icon: FiList, href: '/admin/menu', color: 'border-indigo-500' },
      { title: 'admin.documentsSection', description: 'admin.documentsDesc', icon: FiFileText, href: '/admin/documents', color: 'border-purple-500' },
      { title: 'admin.news', description: 'admin.newsDesc', icon: FiEdit, href: '/admin/noticias', color: 'border-pink-500' },
      { title: 'Gerenciar Editores', description: 'Configure editores para Academy e Social/News', icon: FiEdit3, href: '/admin/editors', color: 'border-violet-500' },
    ],
    users: [
      { title: 'admin.usersSection', description: 'admin.usersSectionDesc', icon: FiUsers, href: '/admin/user-management', color: 'border-yellow-500' },
      { title: 'admin.rolePermissions', description: 'admin.rolePermissionsDesc', icon: FiKey, href: '/admin/role-permissions', color: 'border-orange-500' },
      { title: 'admin.userApprovalSettings', description: 'admin.userApprovalSettingsDesc', icon: FiUserCheck, href: '/admin/user-approval-settings', color: 'border-cyan-500' },
      { title: 'admin.bannedUsers', description: 'admin.bannedUsersDesc', icon: FiUserX, href: '/admin/banned-users', color: 'border-red-500' },
    ],
    operational: [
      { title: 'Gestão de EPIs', description: 'Gerencie solicitações, tipos e validade de EPIs', icon: FiShield, href: '/admin/epi', color: 'border-yellow-600' },
      { title: 'admin.myReimbursements', description: 'admin.myReimbursementsDesc', icon: FiDollarSign, href: '/reembolso?tab=dashboard', color: 'border-green-600' },
      { title: 'admin.approveReimbursements', description: 'admin.approveReimbursementsDesc', icon: FiCheck, href: '/reembolso?tab=approval', color: 'border-emerald-500' },
      { title: 'admin.reimbursementSettings', description: 'admin.reimbursementSettingsDesc', icon: FiSettings, href: '/admin/reimbursement-settings', color: 'border-lime-500' },
    ],
    performance: [
      { title: 'Avaliação de Desempenho', description: 'Gerencie o módulo de avaliação de desempenho', icon: FiBarChart2, href: '/admin/avaliacao', color: 'border-teal-500' },
    ],
    integrations: [
      { title: 'admin.erpIntegration', description: 'Gerencie conexões com SAP, MIO e outros sistemas', icon: FiDatabase, href: '/admin/integracao-erp', color: 'border-blue-600' },
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('admin.welcomeAdmin', `Bem-vindo, ${profile?.first_name || 'Admin'}`)}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={fixAdminPermissions}
            disabled={isFixingPermissions}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            {isFixingPermissions ? (
              <>
                <FiRefreshCw className="animate-spin mr-2" />
                Corrigindo Permissões...
              </>
            ) : (
              <>
                <FiUserCheck className="mr-2" />
                Corrigir Permissões
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Configuração e Sistema */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Sistema e Configurações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems.system.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
          </div>
        </section>

        {/* Operacional e Segurança */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Operacional e Segurança</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems.operational.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
          </div>
        </section>

        {/* Usuários e Permissões */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Usuários e Permissões</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems.users.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
          </div>
        </section>

        {/* Conteúdo e Comunicação */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Conteúdo e Comunicação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems.content.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
          </div>
        </section>

        {/* Desempenho e Integrações */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Desempenho e Integrações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems.performance.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
            {groupedMenuItems.integrations.map((item, index) => (
              <AdminCard key={index} {...item} title={t(item.title, item.title)} description={t(item.description, item.description)} />
            ))}
          </div>
        </section>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.systemInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500">{t('admin.version')}</p>
            <p className="text-lg font-semibold text-gray-900">{process.env.NEXT_PUBLIC_APP_VERSION || '3.8.1'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500">{t('admin.lastLogin')}</p>
            <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500">{t('admin.status')}</p>
            <p className="text-lg font-semibold text-green-600">{t('admin.active')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
