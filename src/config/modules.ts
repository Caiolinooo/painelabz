
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface ModuleDefinition {
    key: string;
    name: string;
    description?: string;
    defaultRoles: UserRole[];
    category?: 'system' | 'business' | 'hr' | 'department' | 'core' | 'content';
}


export const SYSTEM_MODULES: ModuleDefinition[] = [
    // Core / Geral
    {
        key: 'dashboard',
        name: 'Dashboard',
        description: 'Visão geral do sistema',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'noticias',
        name: 'Notícias',
        description: 'Portal de comunicação e novidades',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'calendario',
        name: 'Calendário',
        description: 'Eventos corporativos e datas importantes',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'ia-assistant',
        name: 'ABZ Assistant',
        description: 'Assistente inteligente com IA',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    // HR / Meu RH
    {
        key: 'ponto',
        name: 'Ponto',
        description: 'Registro e espelho de ponto',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'contracheque',
        name: 'Contracheque',
        description: 'Visualização de holerites e rendimentos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'reembolso',
        name: 'Reembolso',
        description: 'Solicitação e acompanhamento de reembolsos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'kpi',
        name: 'KPIs',
        description: 'Indicadores de desempenho',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'hr'
    },
    {
        key: 'avaliacao',
        name: 'Avaliação de Desempenho',
        description: 'Ciclos de avaliação e feedback',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'hr'
    },
    {
        key: 'epi',
        name: 'EPI',
        description: 'Equipamentos de Proteção Individual',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'ferias',
        name: 'Férias',
        description: 'Solicitação e aprovação de férias',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'lista-presenca',
        name: 'Lista de Presença',
        description: 'Controle de presença e assinaturas',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'contratos',
        name: 'Contratos',
        description: 'Gestão de documentos e assinaturas digitais',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'academy',
        name: 'Academy',
        description: 'Plataforma de cursos e treinamentos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    // Content & Conhecimento
    {
        key: 'biblioteca',
        name: 'Biblioteca',
        description: 'Repositório de arquivos e documentos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'content'
    },
    {
        key: 'ajuda',
        name: 'Ajuda',
        description: 'Central de suporte e dúvidas',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'content'
    },
    // Department / Específicos
    {
        key: 'compras',
        name: 'Ordens de Compra',
        description: 'Gestão de compras e aprovações',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'department'
    },
    {
        key: 'poliweb',
        name: 'Poliweb',
        description: 'Clínica ocupacional e gestão de ASO',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'department'
    },
    {
        key: 'man-schedule',
        name: 'Man Schedule',
        description: 'Gestão de tripulantes e escalas offshore',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'department'
    },
    // Communication
    {
        key: 'chat',
        name: 'Chat',
        description: 'Comunicação interna',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'department'
    },
    {
        key: 'wkradar',
        name: 'WK Radar',
        description: 'Sistema Radar',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'department'
    },
    // Admin
    {
        key: 'admin',
        name: 'Administração',
        description: 'Configurações do sistema',
        defaultRoles: ['ADMIN'],
        category: 'system'
    },
    {
        key: 'integracao-erp',
        name: 'Integração ERP',
        description: 'Gestão de integração MIO',
        defaultRoles: ['ADMIN'],
        category: 'department'
    }
];

/**
 * Returns the default permissions object for a given role based on the SYSTEM_MODULES config.
 */
export function getDefaultPermissionsForRole(role: string): Record<string, boolean> {
    const normalizedRole = role.toUpperCase() as UserRole;
    const permissions: Record<string, boolean> = {};

    SYSTEM_MODULES.forEach(module => {
        if (module.defaultRoles.includes(normalizedRole)) {
            permissions[module.key] = true;
        }
    });

    return permissions;
}

/**
 * Returns a complete map of { [moduleKey]: boolean } for all modules for a given role.
 */
export function getFullPermissionsForRole(role: string): Record<string, boolean> {
    const normalizedRole = role.toUpperCase() as UserRole;
    const permissions: Record<string, boolean> = {};

    SYSTEM_MODULES.forEach(module => {
        permissions[module.key] = module.defaultRoles.includes(normalizedRole);
    });

    return permissions;
}

