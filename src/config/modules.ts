
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface ModuleDefinition {
    key: string;
    name: string;
    description?: string;
    defaultRoles: UserRole[];
    category?: 'system' | 'business' | 'hr';
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
    {
        key: 'dashboard',
        name: 'Dashboard',
        description: 'Visão geral do sistema',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'manual',
        name: 'Manual do Colaborador',
        description: 'Documentos e manuais',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'procedimentos',
        name: 'Procedimentos',
        description: 'Procedimentos operacionais',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'business'
    },
    {
        key: 'politicas',
        name: 'Políticas',
        description: 'Políticas internas',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'business'
    },
    {
        key: 'calendario',
        name: 'Calendário',
        description: 'Agenda e eventos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'noticias',
        name: 'Notícias',
        description: 'Comunicados internos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'system'
    },
    {
        key: 'reembolso',
        name: 'Reembolso',
        description: 'Solicitação de reembolsos',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'business'
    },
    {
        key: 'contracheque',
        name: 'Contracheque',
        description: 'Holerites e documentos financeiros',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'ponto',
        name: 'Ponto',
        description: 'Registro de ponto',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'academy',
        name: 'ABZ Academy',
        description: 'Portal de treinamento',
        defaultRoles: ['ADMIN', 'MANAGER', 'USER'],
        category: 'hr'
    },
    {
        key: 'avaliacao',
        name: 'Avaliação de Desempenho',
        description: 'Gestão de performance',
        defaultRoles: ['ADMIN', 'MANAGER'], // Default to restricted, can be opened up
        category: 'hr'
    },
    {
        key: 'epi',
        name: 'Gestão de EPIs',
        description: 'Controle e entrega de EPIs',
        defaultRoles: ['ADMIN', 'MANAGER'],
        category: 'hr'
    },
    {
        key: 'admin',
        name: 'Administração',
        description: 'Configurações do sistema',
        defaultRoles: ['ADMIN'],
        category: 'system'
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
