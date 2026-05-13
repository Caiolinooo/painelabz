/**
 * Serviço Unificado de Dados
 * Gerencia cards e menus de forma centralizada e automática
 */

import { IconType } from 'react-icons';
import { FiGrid } from 'react-icons/fi';
import { supabase } from './supabase';
import { getIconComponent } from './iconMap';
import { SYSTEM_MODULES } from '@/constants/modules';

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
  animation_config?: {
    type: 'slide' | 'fade' | 'zoom';
    duration: number;
    delay: number;
  };

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
      cacheExpiry: 2, // 2 minutos - atualiza rápido após admin fazer mudanças
      fallbackToHardcoded: true
    };

    this.initializeHardcodedItems();
  }

  /**
   * Obtém módulos permitidos para um setor
   */
  async getSectorAllowedModules(sectorId: string): Promise<string[]> {
    if (!sectorId) return [];

    const cacheKey = `sector-modules-${sectorId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data as any; // Cast for TS
    }

    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('sector_modules')
        .select('module_id')
        .eq('sector_id', sectorId);

      if (error) {
        console.error('Error fetching sector modules:', error);
        return [];
      }

      const allowedModules = data.map(m => m.module_id);

      // Cache the result
      this.cache.set(cacheKey, {
        data: allowedModules as any,
        timestamp: Date.now()
      });

      return allowedModules;
    } catch (e) {
      console.error('Error checking sector modules:', e);
      return [];
    }
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
        icon: getIconComponent('FiHome'),
        iconName: 'FiHome',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 1,
        showInDashboard: false,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'core'
      },
      {
        id: 'manual',
        title: 'Manual do Colaborador',
        description: 'Acesse o manual completo do colaborador',
        href: '/manual',
        icon: getIconComponent('FiBookOpen'),
        iconName: 'FiBookOpen',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: false,
        order: 2,
        showInDashboard: false,
        showInMenu: false,
        showInAdminMenu: false,
        category: 'department'
      },
      {
        id: 'procedimentos-logistica',
        title: 'Procedimentos Logística',
        description: 'Procedimentos operacionais de logística',
        href: '/procedimentos-logistica',
        icon: getIconComponent('FiClipboard'),
        iconName: 'FiClipboard',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 3,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'department'
      },
      {
        id: 'reembolso',
        title: 'Reembolso',
        description: 'Sistema de solicitação de reembolsos',
        href: '/reembolso',
        icon: getIconComponent('FiDollarSign'),
        iconName: 'FiDollarSign',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 4,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'hr'
      },
      {
        id: 'avaliacao',
        title: 'Avaliação',
        description: 'Sistema de avaliação de desempenho',
        href: '/avaliacao',
        icon: getIconComponent('FiBarChart2'),
        iconName: 'FiBarChart2',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 5,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'hr',
        moduleKey: 'avaliacao'
      },
      {
        id: 'calendario',
        title: 'Calendário',
        description: 'Calendário de eventos e feriados',
        href: '/calendario',
        icon: getIconComponent('FiCalendar'),
        iconName: 'FiCalendar',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 6,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'core'
      },
      {
        id: 'contatos',
        title: 'Contatos',
        description: 'Lista de contatos da empresa',
        href: '/contatos',
        icon: getIconComponent('FiUsers'),
        iconName: 'FiUsers',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 7,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'department'
      },
      {
        id: 'ponto',
        title: 'Ponto',
        description: 'Sistema de controle de ponto',
        href: '/ponto',
        icon: getIconComponent('FiClock'),
        iconName: 'FiClock',
        color: 'bg-abz-indigo',
        hoverColor: 'hover:bg-abz-indigo-dark',
        external: false,
        enabled: true,
        order: 8,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'hr'
      },
      {
        id: 'contracheque',
        title: 'Contracheque',
        description: 'Consulta de contracheques',
        href: '/contracheque',
        icon: getIconComponent('FiFileText'),
        iconName: 'FiFileText',
        color: 'bg-abz-green',
        hoverColor: 'hover:bg-abz-green-dark',
        external: false,
        enabled: true,
        order: 9,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'hr'
      },
      {
        id: 'academy',
        title: 'Academy',
        description: 'Portal de treinamentos e cursos',
        href: '/academy',
        icon: getIconComponent('FiBookOpen'),
        iconName: 'FiBookOpen',
        color: 'bg-abz-blue',
        hoverColor: 'hover:bg-abz-blue-dark',
        external: false,
        enabled: true,
        order: 10,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'content'
      },
      {
        id: 'noticias',
        title: 'Notícias',
        description: 'Central de notícias e comunicados',
        href: '/noticias',
        icon: getIconComponent('FiMessageSquare'),
        iconName: 'FiMessageSquare',
        color: 'bg-abz-indigo',
        hoverColor: 'hover:bg-abz-indigo-dark',
        external: false,
        enabled: true,
        order: 11,
        showInDashboard: true,
        showInMenu: true,
        showInAdminMenu: false,
        category: 'core'
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
    userSectorId?: string;
  }): Promise<UnifiedItem[]> {
    let items = await this.loadItems(filters?.userSectorId);

    // Buscar permissões do setor se necessário
    let allowedSectorModules: string[] = [];
    if (filters?.userSectorId) {
      allowedSectorModules = await this.getSectorAllowedModules(filters.userSectorId);
    }

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
        if (item.allowedRoles && item.allowedRoles.length > 0 && !item.allowedRoles.includes(filters.userRole || '')) {
          return false;
        }
        if (item.allowedUserIds && item.allowedUserIds.length > 0 && !item.allowedUserIds.includes(filters.userId || '')) {
          return false;
        }

        // Filtro por Setor
        if (filters && filters.userSectorId && allowedSectorModules.length > 0) {
          if (item.id !== 'dashboard' && !allowedSectorModules.includes(item.id)) {
            return false;
          }
        } else if (filters && filters.userSectorId && allowedSectorModules.length === 0) {
          // Mantendo permissividade se não houver módulos definidos
        }

        return item.enabled && item.href && item.href.trim() !== '';
      });
    }

    // Ordenar por order
    return items.sort((a, b) => a.order - b.order);
  }

  /**
   * Carrega items do cache ou fonte de dados
   */
  private async loadItems(sectorId?: string): Promise<UnifiedItem[]> {
    const cacheKey = `unified-items-${sectorId || 'global'}`;
    const cached = this.cache.get(cacheKey);

    // Verificar cache
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    let items: UnifiedItem[] = [];

    try {
      // Tentar carregar do Supabase se habilitado
      if (this.config.enableSupabaseSync) {
        items = await this.loadFromSupabase(sectorId);
      }

      // Fallback para hardcoded se necessário
      if (items.length === 0 && this.config.fallbackToHardcoded) {
        console.log('🔄 Using hardcoded items as fallback');
        items = [...this.hardcodedItems];
      }

      // Processar ícones usando o mapeamento centralizado
      items = items.map(item => ({
        ...item,
        icon: getIconComponent(item.iconName)
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
   * Carrega items do Supabase (tabela cards - mesma que admin atualiza)
   * Agora suporta Overrides por Setor
   */
  private async loadFromSupabase(sectorId?: string): Promise<UnifiedItem[]> {
    try {
      // Usar o singleton do Supabase já importado no topo do arquivo
      if (!supabase) {
        console.warn('🔄 Supabase client not available, using fallback');
        return [];
      }

      // 1. Buscar cards base
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('enabled', true)
        .order('order', { ascending: true });

      if (error) {
        // Silenciar erro se a tabela não existir
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('🔄 Table cards does not exist, using fallback');
        } else {
          console.error('🔄 Error loading from Supabase:', error);
        }
        return [];
      }

      let overrides: any[] = [];
      if (sectorId) {
        const { data: overridesData } = await supabase
          .from('card_overrides')
          .select('*')
          .eq('sector_id', sectorId);
        overrides = overridesData || [];
      }

      if (!cards || cards.length === 0) {
        console.log('🔄 No items found in Supabase cards, using fallback');
        return [];
      }

      // Converter para UnifiedItem aplicando overrides
      const items: UnifiedItem[] = cards.map((card: any) => {
        // Tentar encontrar override
        const override = overrides.find(o => o.card_id === card.id);

        // Tentar encontrar item hardcoded correspondente para fallback
        const hardcodedItem = this.hardcodedItems.find(h => h.id === card.id);

        // Determinar valores (Override > Card > Hardcoded)
        const finalTitle = override?.custom_label || card.title;
        const finalIconName = override?.custom_icon || card.icon_name || card.iconName || card.icon || 'FiGrid';
        const finalOrder = override?.order ?? card.order ?? 999;
        const finalEnabled = override?.enabled ?? (card.enabled !== false);
        const animationConfig = card.animation_config || {};

        let icon = FiGrid;

        // Resolver componente de ícone
        if (hardcodedItem && !card.icon_name && !card.iconName && !card.icon && !override?.custom_icon) {
          icon = hardcodedItem.icon;
        } else {
          icon = getIconComponent(finalIconName);
        }

        return {
          id: card.id,
          title: finalTitle, // Se override, usa custom_label, senao default
          title_pt: finalTitle,
          title_en: card.title_en || card.titleEn || finalTitle,
          description: card.description || '',
          href: card.href,
          icon: icon,
          iconName: finalIconName,
          color: card.color,
          hoverColor: card.hover_color || card.hoverColor,
          external: card.external || false,
          enabled: finalEnabled,
          order: finalOrder,
          adminOnly: card.admin_only || card.adminOnly || false,
          managerOnly: card.manager_only || card.managerOnly || false,
          allowedRoles: card.allowed_roles || card.allowedRoles || [],
          allowedUserIds: card.allowed_user_ids || card.allowedUserIds || [],
          moduleKey: card.module_key || card.moduleKey,
          showInDashboard: true,
          showInMenu: !(card.admin_only || card.adminOnly),
          showInAdminMenu: card.admin_only || card.adminOnly || false,
          category: card.category || SYSTEM_MODULES.find(m => m.id === card.id)?.category,
          animation_config: animationConfig, // Pass through config
          source: 'supabase' as const
        };
      });

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
   * Adiciona ou atualiza um item de Override
   */
  async upsertOverride(overrideData: {
    card_id: string;
    sector_id: string;
    custom_label?: string;
    custom_icon?: string;
    enabled?: boolean;
    order?: number;
  }): Promise<void> {
    if (!this.config.enableSupabaseSync) return;

    try {
      const { error } = await supabase
        .from('card_overrides')
        .upsert(overrideData, { onConflict: 'card_id, sector_id' });

      if (error) throw error;

      this.clearCache();
    } catch (error) {
      console.error('Error upserting override:', error);
      throw error;
    }
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

export async function getMenuItems(userRole?: string, userId?: string, userSectorId?: string): Promise<UnifiedItem[]> {
  return await unifiedDataService.getItems({
    showInMenu: true,
    userRole,
    userId,
    userSectorId
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
