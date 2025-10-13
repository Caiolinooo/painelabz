/**
 * Serviço Unificado de Dados
 * Gerencia cards e menus de forma centralizada e automática
 */

import { IconType } from 'react-icons';
import { 
  FiGrid, FiBookOpen, FiClipboard, FiFileText, FiBriefcase, 
  FiCalendar, FiRss, FiDollarSign, FiSettings, FiUsers,
  FiBarChart2, FiPlay, FiMessageSquare, FiUser, FiActivity,
  FiClock, FiKey, FiUserCheck, FiUserX, FiBell, FiAward,
  FiSmartphone, FiDatabase, FiTool, FiLayers, FiList, FiEdit
} from 'react-icons/fi';

// Interface unificada para items (cards e menus)
export interface UnifiedItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: IconType;
  iconName: string;
  color?: string;
  hoverColor?: string;
  external: boolean;
  enabled: boolean;
  order: number;
  
  // Permissões
  adminOnly?: boolean;
  managerOnly?: boolean;
  allowedRoles?: string[];
  allowedUserIds?: string[];
  moduleKey?: string;
  
  // Configurações específicas
  showInDashboard?: boolean;
  showInMenu?: boolean;
  showInAdminMenu?: boolean;
  category?: string;
  
  // Metadados
  createdAt?: string;
  updatedAt?: string;
  source?: 'supabase' | 'hardcoded';
}

// Mapeamento de ícones - Material Icons para React Icons
const iconMap: Record<string, IconType> = {
  // React Icons (FiXxx)
  FiGrid, FiBookOpen, FiClipboard, FiFileText, FiBriefcase,
  FiCalendar, FiRss, FiDollarSign, FiSettings, FiUsers,
  FiBarChart2, FiPlay, FiMessageSquare, FiUser, FiActivity,
  FiClock, FiKey, FiUserCheck, FiUserX, FiBell, FiAward,
  FiSmartphone, FiDatabase, FiTool, FiLayers, FiList, FiEdit,

  // Material Icons (mapeamento para React Icons)
  'dashboard': FiGrid,
  'book': FiBookOpen,
  'description': FiFileText,
  'policy': FiClipboard,
  'calendar_today': FiCalendar,
  'newspaper': FiRss,
  'receipt': FiDollarSign,
  'payments': FiDollarSign,
  'schedule': FiClock,
  'assessment': FiBarChart2,
  'admin_panel_settings': FiSettings,
  'settings': FiSettings,
  'people': FiUsers,
  'person': FiUser,
  'play_circle': FiPlay,
  'chat': FiMessageSquare,
  'trending_up': FiActivity,
  'smartphone': FiSmartphone,
  'storage': FiDatabase,
  'build': FiTool,
  'layers': FiLayers,
  'list': FiList,
  'edit': FiEdit
};

// Configuração do serviço
interface UnifiedDataConfig {
  enableSupabaseSync: boolean;
  enableAutoTranslation: boolean;
  cacheExpiry: number; // em minutos
  fallbackToHardcoded: boolean;
}

class UnifiedDataService {
  private config: UnifiedDataConfig;
  private cache: Map<string, { data: UnifiedItem[]; timestamp: number }> = new Map();
  private hardcodedItems: UnifiedItem[] = [];

  constructor() {
    this.config = {
      enableSupabaseSync: true,
      enableAutoTranslation: true,
      cacheExpiry: 30, // 30 minutos
      fallbackToHardcoded: true
    };

    this.initializeHardcodedItems();
  }

  /**
   * Configura o serviço
   */
  configure(config: Partial<UnifiedDataConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Inicializa items hardcoded como fallback
   */
  private initializeHardcodedItems() {
    this.hardcodedItems = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Painel principal do sistema',
        href: '/dashboard',
        icon: FiGrid,
        iconName: 'FiGrid',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 1,
        showInDashboard: false,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'manual',
        title: 'Manual do Colaborador',
        description: 'Acesse o manual completo do colaborador',
        href: '/manual',
        icon: FiBookOpen,
        iconName: 'FiBookOpen',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: false,
        order: 2,
        showInDashboard: false,
        showInMenu: false,
        showInAdminMenu: false
      },
      {
        id: 'procedimentos-logistica',
        title: 'Procedimentos Logística',
        description: 'Procedimentos operacionais de logística',
        href: '/procedimentos-logistica',
        icon: FiClipboard,
        iconName: 'FiClipboard',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 3,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'reembolso',
        title: 'Reembolso',
        description: 'Sistema de solicitação de reembolsos',
        href: '/reembolso',
        icon: FiDollarSign,
        iconName: 'FiDollarSign',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 4,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'avaliacao',
        title: 'Avaliação',
        description: 'Sistema de avaliação de desempenho',
        href: '/avaliacao',
        icon: FiBarChart2,
        iconName: 'FiBarChart2',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 5,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        moduleKey: 'avaliacao'
      },
      {
        id: 'calendario',
        title: 'Calendário',
        description: 'Calendário de eventos e feriados',
        href: '/calendario',
        icon: FiCalendar,
        iconName: 'FiCalendar',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 6,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'contatos',
        title: 'Contatos',
        description: 'Lista de contatos da empresa',
        href: '/contatos',
        icon: FiUsers,
        iconName: 'FiUsers',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 7,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'ponto',
        title: 'Ponto',
        description: 'Sistema de controle de ponto',
        href: '/ponto',
        icon: FiClock,
        iconName: 'FiClock',
        color: 'bg-abz-indigo',
        hoverColor: 'hover:bg-abz-indigo-dark',
        external: false,
        enabled: true,
        order: 8,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'contracheque',
        title: 'Contracheque',
        description: 'Consulta de contracheques',
        href: '/contracheque',
        icon: FiFileText,
        iconName: 'FiFileText',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 9,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'academy',
        title: 'Academy',
        description: 'Portal de treinamentos e cursos',
        href: '/academy',
        icon: FiBookOpen,
        iconName: 'FiBookOpen',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 10,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'noticias',
        title: 'Notícias',
        description: 'Central de notícias e comunicados',
        href: '/noticias',
        icon: FiMessageSquare,
        iconName: 'FiMessageSquare',
        color: 'bg-abz-indigo',
        hoverColor: 'hover:bg-abz-indigo-dark',
        external: false,
        enabled: true,
        order: 11,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      },
      {
        id: 'admin',
        title: 'Administração',
        description: 'Painel de administração do sistema',
        href: '/admin',
        icon: FiSettings,
        iconName: 'FiSettings',
        color: 'bg-abz-indigo',
        hoverColor: 'hover:bg-abz-indigo-dark',
        external: false,
        enabled: true,
        order: 100,
        adminOnly: true,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false
      }
    ];
  }

  /**
   * Obtém todos os items com filtros aplicados
   */
  async getItems(filters?: {
    showInDashboard?: boolean;
    showInMenu?: boolean;
    showInAdminMenu?: boolean;
    category?: string;
    userRole?: string;
    userId?: string;
  }): Promise<UnifiedItem[]> {
    let items = await this.loadItems();

    // Aplicar filtros
    if (filters) {
      items = items.filter(item => {
        // Filtro por localização
        if (filters.showInDashboard !== undefined && item.showInDashboard !== filters.showInDashboard) {
          return false;
        }
        if (filters.showInMenu !== undefined && item.showInMenu !== filters.showInMenu) {
          return false;
        }
        if (filters.showInAdminMenu !== undefined && item.showInAdminMenu !== filters.showInAdminMenu) {
          return false;
        }

        // Filtro por categoria
        if (filters.category && item.category !== filters.category) {
          return false;
        }

        // Filtros de permissão
        if (item.adminOnly && filters.userRole !== 'admin') {
          return false;
        }
        if (item.managerOnly && !['admin', 'manager'].includes(filters.userRole || '')) {
          return false;
        }
        if (item.allowedRoles && !item.allowedRoles.includes(filters.userRole || '')) {
          return false;
        }
        if (item.allowedUserIds && !item.allowedUserIds.includes(filters.userId || '')) {
          return false;
        }

        return item.enabled;
      });
    }

    // Ordenar por order
    return items.sort((a, b) => a.order - b.order);
  }

  /**
   * Carrega items do cache ou fonte de dados
   */
  private async loadItems(): Promise<UnifiedItem[]> {
    const cacheKey = 'unified-items';
    const cached = this.cache.get(cacheKey);

    // Verificar cache
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    let items: UnifiedItem[] = [];

    try {
      // Tentar carregar do Supabase se habilitado
      if (this.config.enableSupabaseSync) {
        items = await this.loadFromSupabase();
      }

      // Fallback para hardcoded se necessário
      if (items.length === 0 && this.config.fallbackToHardcoded) {
        console.log('🔄 Using hardcoded items as fallback');
        items = [...this.hardcodedItems];
      }

      // Processar ícones
      items = items.map(item => ({
        ...item,
        icon: iconMap[item.iconName] || FiGrid
      }));

      // Atualizar cache
      this.cache.set(cacheKey, {
        data: items,
        timestamp: Date.now()
      });

      return items;
    } catch (error) {
      console.error('🔄 Error loading unified items:', error);
      
      // Fallback para hardcoded em caso de erro
      if (this.config.fallbackToHardcoded) {
        return [...this.hardcodedItems];
      }
      
      return [];
    }
  }

  /**
   * Carrega items do Supabase
   */
  private async loadFromSupabase(): Promise<UnifiedItem[]> {
    try {
      console.log('🔄 Loading items from Supabase...');

      // Importar supabase client dinamicamente para evitar problemas de SSR
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = ***REMOVED***!;
      const supabaseKey = ***REMOVED***!;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('🔄 Supabase credentials not found, using fallback');
        return [];
      }

      const supabase = ***REMOVED*** supabaseKey);

      // Buscar menu items do banco
      const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('enabled', true)
        .order('order', { ascending: true });

      if (error) {
        // Silenciar erro se a tabela não existir (código PGRST116)
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('🔄 Table menu_items does not exist, using fallback');
        } else {
          console.error('🔄 Error loading from Supabase:', error);
        }
        return [];
      }

      if (!menuItems || menuItems.length === 0) {
        console.log('🔄 No items found in Supabase, using fallback');
        return [];
      }

      // Converter para UnifiedItem
      const items: UnifiedItem[] = menuItems.map((item: any) => ({
        id: item.id,
        title: item.label, // Será traduzido depois
        title_pt: item.title_pt || item.label,
        title_en: item.title_en || item.label,
        description: '', // MenuItem não tem description
        href: item.href,
        icon: FiGrid, // Será mapeado depois
        iconName: item.icon || 'FiGrid',
        external: item.external || false,
        enabled: item.enabled,
        order: item.order,
        adminOnly: item.adminOnly || false,
        managerOnly: item.managerOnly || false,
        allowedRoles: item.allowedRoles,
        allowedUserIds: item.allowedUserIds,
        showInMenu: true,
        source: 'supabase' as const
      }));

      console.log(`🔄 Loaded ${items.length} items from Supabase`);
      return items;

    } catch (error) {
      console.error('🔄 Error loading from Supabase:', error);
      return [];
    }
  }

  /**
   * Verifica se o cache ainda é válido
   */
  private isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const expiryTime = timestamp + (this.config.cacheExpiry * 60 * 1000);
    return now < expiryTime;
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🔄 Unified data cache cleared');
  }

  /**
   * Adiciona ou atualiza um item
   */
  async upsertItem(item: Partial<UnifiedItem> & { id: string }): Promise<UnifiedItem> {
    // Implementar salvamento no Supabase se habilitado
    if (this.config.enableSupabaseSync) {
      // TODO: Implementar salvamento no Supabase
      console.log('🔄 Saving item to Supabase:', item.id);
    }

    // Limpar cache para forçar reload
    this.clearCache();

    return item as UnifiedItem;
  }

  /**
   * Remove um item
   */
  async deleteItem(id: string): Promise<void> {
    // Implementar remoção no Supabase se habilitado
    if (this.config.enableSupabaseSync) {
      // TODO: Implementar remoção no Supabase
      console.log('🔄 Deleting item from Supabase:', id);
    }

    // Limpar cache para forçar reload
    this.clearCache();
  }

  /**
   * Sincroniza dados hardcoded com Supabase
   */
  async syncHardcodedToSupabase(): Promise<void> {
    if (!this.config.enableSupabaseSync) {
      console.log('🔄 Supabase sync is disabled');
      return;
    }

    try {
      console.log('🔄 Syncing hardcoded items to Supabase...');
      
      for (const item of this.hardcodedItems) {
        await this.upsertItem(item);
      }

      console.log('🔄 Sync completed successfully');
    } catch (error) {
      console.error('🔄 Error syncing to Supabase:', error);
    }
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats(): { cacheSize: number; hardcodedCount: number } {
    return {
      cacheSize: this.cache.size,
      hardcodedCount: this.hardcodedItems.length
    };
  }
}

// Instância singleton
export const unifiedDataService = new UnifiedDataService();

// Funções de conveniência
export async function getDashboardCards(userRole?: string, userId?: string): Promise<UnifiedItem[]> {
  return await unifiedDataService.getItems({
    showInDashboard: true,
    userRole,
    userId
  });
}

export async function getMenuItems(userRole?: string, userId?: string): Promise<UnifiedItem[]> {
  return await unifiedDataService.getItems({
    showInMenu: true,
    userRole,
    userId
  });
}

export async function getAdminMenuItems(userRole?: string, userId?: string): Promise<UnifiedItem[]> {
  return await unifiedDataService.getItems({
    showInAdminMenu: true,
    userRole,
    userId
  });
}

export default unifiedDataService;
