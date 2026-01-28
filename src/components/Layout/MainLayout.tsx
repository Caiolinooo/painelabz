'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FiGrid,
  FiRss,
  FiUser,
  FiBriefcase,
  FiAward,
  FiBook,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiMenu,
  FiSearch,
  FiBell,
  FiGlobe,
  FiSettings,
  FiLogOut,
  FiCreditCard,
  FiFileText,
  FiTrendingUp,
  FiClock,
  FiDollarSign,
  FiBarChart2,
  FiSidebar,
  FiShield,
  FiShoppingCart
} from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n } from '@/contexts/I18nContext';
import { useMenuItems } from '@/hooks/useUnifiedData';
import NotificationHUD from '@/components/notifications/NotificationHUD';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import LanguageSelector from '@/components/LanguageSelector';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import GlobalTimeTracker from '@/components/tracking/GlobalTimeTracker';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import UserAvatar from '@/components/UserAvatar';


interface MainLayoutProps {
  children: React.ReactNode;
}

// Logo Component
const PortalLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z" stroke="white" strokeWidth="0" />
    <path d="M16.5 7C13 7 10 9 9 12C8 15 9.5 19 12 21C14.5 23 18 23 21 21" stroke="#0EA5E9" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M12 21C10 23 8 23 6 22" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M21 10C24 10 26 12 26 15C26 18 24 20 21 21" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="16" cy="15" r="3" fill="#3B82F6" />
  </svg>
);

import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { SYSTEM_MODULES, MODULE_CATEGORIES, SystemModule } from '@/constants/modules';
import { getModuleIcon } from '@/constants/moduleIcons';

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { user, profile, logout, isAdmin } = useSupabaseAuth();
  const { t } = useI18n();

  usePushNotifications();
  const { items: menuItems } = useMenuItems(true);

  const { config } = useSiteConfig();
  const { unreadCount } = useNotifications(user?.id || '');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMeuRHOpen, setIsMeuRHOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use shared permissions hook
  const { hasPermission } = useEffectivePermissions();

  // Load sidebar state
  useEffect(() => {
    const saved = localStorage.getItem('main-sidebar-collapsed');
    setIsCollapsed(saved ? JSON.parse(saved) : false);
    const savedMeuRH = localStorage.getItem('sidebar-meurh-open');
    if (savedMeuRH !== null) setIsMeuRHOpen(JSON.parse(savedMeuRH));
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('main-sidebar-collapsed', JSON.stringify(newState));
  };

  const toggleMeuRH = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem('main-sidebar-collapsed', 'false');
      setIsMeuRHOpen(true);
      localStorage.setItem('sidebar-meurh-open', 'true');
      return;
    }

    const newState = !isMeuRHOpen;
    setIsMeuRHOpen(newState);
    localStorage.setItem('sidebar-meurh-open', JSON.stringify(newState));
  };

  const toggleDepartment = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem('main-sidebar-collapsed', 'false');
      setIsDepartmentOpen(true);
      localStorage.setItem('sidebar-dept-open', 'true');
      return;
    }
    const newState = !isDepartmentOpen;
    setIsDepartmentOpen(newState);
    localStorage.setItem('sidebar-dept-open', JSON.stringify(newState));
  };

  const [departmentTitle, setDepartmentTitle] = useState(MODULE_CATEGORIES.department);
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);

  useEffect(() => {
    const fetchSector = async () => {
      if ((profile as any)?.sector_id) {
        const { data } = await supabase
          .from('sectors')
          .select('name')
          .eq('id', (profile as any).sector_id)
          .single();

        if (data) {
          setDepartmentTitle(data.name);
        }
      }
    };
    if (profile) fetchSector();
  }, [profile, supabase]);

  // Module Processing - Filter by permission
  // Module Processing - Filter by permission AND visibility
  const allowedModules = SYSTEM_MODULES.filter(m => hasPermission(m.id) && m.visible !== false);

  const resolveItem = (m: SystemModule) => ({
    ...m,
    icon: getModuleIcon(m.id),
    badge: m.id === 'noticias' && unreadCount > 0 ? unreadCount : undefined
  });

  const coreItems = allowedModules.filter(m => m.category === 'core' || !m.category).map(resolveItem);
  const hrItems = allowedModules.filter(m => m.category === 'hr').map(resolveItem);
  const deptItems = allowedModules.filter(m => m.category === 'department').map(resolveItem);
  const contentItems = allowedModules.filter(m => m.category === 'content').map(resolveItem);

  const renderItem = (item: any) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`relative flex items-center px-4 py-3.5 my-1 mx-2 rounded-xl transition-all duration-200 group
          ${isActive
            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/30'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        title={isCollapsed ? item.label : ''}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />

        {!isCollapsed && (
          <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`}>
            {item.label}
          </span>
        )}

        {/* Badge for News */}
        {item.badge && !isCollapsed && (
          <span className="ml-auto bg-red-50 text-red-600 text-xs font-bold px-2.5 py-0.5 rounded-lg min-w-[20px] text-center ml-2">
            {item.badge}
          </span>
        )}
        {item.badge && isCollapsed && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        )}
      </Link>
    );
  };

  return (
    <ProtectedRoute>
      <GlobalTimeTracker />
      <div className="min-h-screen bg-gray-50 flex font-sans">

        {/* Sidebar */}
        <aside
          className={`bg-white fixed z-40 inset-y-0 left-0 border-r border-gray-100 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Logo */}
          <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <img
                    src={config?.logo || '/images/logo.png'}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/images/LC1_Azul.png') {
                        target.src = '/images/LC1_Azul.png';
                      }
                    }}
                  />
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">{config?.sidebarTitle || 'Portal'}</span>
              </div>
            )}

            {/* Collapse toggle */}
            <button
              onClick={toggleSidebar}
              className={`p-1.5 rounded-lg transition-colors duration-200 text-[#0066FF] hover:bg-blue-50 ${isCollapsed ? '' : 'ml-auto'}`}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              <FiSidebar className="w-6 h-6" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
            {/* Core Items */}
            {coreItems.map(renderItem)}

            {/* Meu RH Dropdown */}
            {hrItems.length > 0 && (
              <div className="mx-2 my-1">
                <button
                  onClick={toggleMeuRH}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 ${isMeuRHOpen ? 'bg-gray-50' : ''}`}
                >
                  <FiCreditCard className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sm text-gray-500 flex-1 text-left">{MODULE_CATEGORIES.hr}</span>
                      <FiChevronDown className={`w-4 h-4 transition-transform ${isMeuRHOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Submenu */}
                <div className={`overflow-hidden transition-all duration-300 ${isMeuRHOpen && !isCollapsed ? 'max-h-[500px] mt-1' : 'max-h-0'}`}>
                  {hrItems.map(renderItem)}
                </div>
              </div>
            )}

            {/* Department Menu */}
            {deptItems.length > 0 && (
              <div className="mx-2 my-1">
                <button
                  onClick={toggleDepartment}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 ${isDepartmentOpen ? 'bg-gray-50' : ''}`}
                >
                  <FiShoppingCart className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sm text-gray-500 flex-1 text-left truncate">{departmentTitle}</span>
                      <FiChevronDown className={`w-4 h-4 transition-transform ${isDepartmentOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Submenu */}
                <div className={`overflow-hidden transition-all duration-300 ${isDepartmentOpen && !isCollapsed ? 'max-h-[800px] mt-1' : 'max-h-0'}`}>
                  {deptItems.map(renderItem)}
                </div>
              </div>
            )}

            {/* Content Items */}
            {contentItems.map(renderItem)}

          </nav>

          {/* Credits */}
          {!isCollapsed && (
            <div className="p-6 mt-auto">
              <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500 font-medium leading-relaxed">
                Desenvolvido por <a href="https://github.com/Caiolinooo" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 transition-colors">Caio Correia</a>.
                <br />
                2026 © All rights reserved.
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Wrapper */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

          {/* Top Header */}
          {/* Top Header */}
          <header className="h-20 px-8 flex items-center justify-end bg-transparent z-30 sticky top-0 pointer-events-none">
            <div className="pointer-events-auto flex items-center bg-white rounded-full shadow-sm border border-gray-100 px-2 py-1.5 mt-4 mr-4 gap-1">
              {/* Notification Button */}
              <NotificationHUD
                userId={user?.id || ''}
                showBanner={true}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-700 relative transition-colors"
              />

              {/* Language Button */}
              <div className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                <LanguageSelector variant="dropdown" className="!p-0 !bg-transparent text-gray-500 hover:text-gray-700" />
              </div>

              <div className="w-px h-5 bg-gray-200 mx-1"></div>

              {/* Profile Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 outline-none hover:ring-2 hover:ring-blue-100 transition-all focus:ring-2 focus:ring-blue-100 flex-shrink-0 relative">
                    <UserAvatar user={user} profile={profile} className="w-full h-full" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 min-w-[240px] bg-white rounded-xl shadow-xl border border-gray-100 p-2 animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2"
                    sideOffset={8}
                    align="end"
                  >
                    <div className="px-3 py-3 border-b border-gray-50 mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 relative">
                          <UserAvatar user={user} profile={profile} className="w-full h-full" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : (user?.email?.split('@')[0] || 'Usuário')}
                          </span>
                          <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <Link href="/admin" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors">
                        <FiShield className="w-4 h-4" />
                        <span>Painel Admin</span>
                      </Link>
                    )}

                    <Link href="/profile" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors">
                      <FiUser className="w-4 h-4" />
                      <span>Meu Perfil</span>
                    </Link>

                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none transition-colors mt-1"
                      onClick={logout}
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </header>

          <main className="flex-1 px-4 md:px-8 py-8">
            {children}
          </main>
        </div>

      </div>
    </ProtectedRoute>
  );
}
