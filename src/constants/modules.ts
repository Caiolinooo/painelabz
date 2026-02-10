export interface SystemModule {
    id: string;
    label: string; // Default label or translation key
    description: string;
    category?: 'core' | 'hr' | 'content' | 'department';
    href: string;
    visible?: boolean; // If false, hidden from sidebar (but permission still checked)
}

export const SYSTEM_MODULES: SystemModule[] = [
    // Core
    { id: 'dashboard', label: 'Dashboard', description: 'Página inicial e visão geral', category: 'core', href: '/dashboard' },
    { id: 'noticias', label: 'Notícias', description: 'Portal de comunicação e novidades', category: 'core', href: '/noticias' },
    { id: 'calendario', label: 'Calendário', description: 'Eventos corporativos e datas importantes', category: 'core', href: '/calendario' },

    // HR (Meu RH)
    { id: 'ponto', label: 'Ponto', description: 'Registro e espelho de ponto', category: 'hr', href: '/ponto' },
    { id: 'contracheque', label: 'Contracheque', description: 'Visualização de holerites e rendimentos', category: 'hr', href: '/contracheque' },
    { id: 'reembolso', label: 'Reembolso', description: 'Solicitação e acompanhamento de reembolsos', category: 'hr', href: '/reembolso' },
    { id: 'kpi', label: 'KPIs', description: 'Indicadores de desempenho', category: 'hr', href: '/kpi' },
    { id: 'avaliacao', label: 'Avaliação de Desempenho', description: 'Ciclos de avaliação e feedback', category: 'hr', href: '/avaliacao' },
    { id: 'epi', label: 'EPI', description: 'Equipamentos de Proteção Individual', category: 'hr', href: '/epi' },

    // Content & Knowledge
    { id: 'manual', label: 'Manual do Colaborador', description: 'Guia de normas e conduta', category: 'department', href: '/manual', visible: false },
    { id: 'procedimentos', label: 'Procedimentos', description: 'Procedimentos Operacionais Padrão (POPs)', category: 'department', href: '/procedimentos', visible: false },
    { id: 'politicas', label: 'Políticas', description: 'Políticas internas da empresa', category: 'department', href: '/politicas', visible: false },
    { id: 'biblioteca', label: 'Biblioteca', description: 'Repositório de arquivos e documentos', category: 'content', href: '/biblioteca', visible: true },
    { id: 'academy', label: 'Academy', description: 'Plataforma de cursos e treinamentos', category: 'content', href: '/academy' },
    { id: 'ajuda', label: 'Ajuda', description: 'Central de suporte e dúvidas', category: 'content', href: '/ajuda' },

    // Department Specific
    { id: 'compras', label: 'Ordens de Compra', description: 'Gestão de compras e aprovações', category: 'department', href: '/department/purchase-orders', visible: true },

    // Tools & Communication
    { id: 'chat', label: 'Chat', description: 'Comunicação interna', category: 'department', href: '/chat' },
    { id: 'wkradar', label: 'WK Radar', description: 'Sistema Radar', category: 'department', href: '/wkradar' },
    { id: 'contatos', label: 'Lista de Ramais', description: 'Contatos e telefones úteis', category: 'department', href: '/contatos', visible: false },

    // Additional Content
    { id: 'emergencia', label: 'Emergência', description: 'Procedimentos de emergência', category: 'department', href: '/emergencia', visible: false },
    { id: 'guia_offshore', label: 'Guia Offshore', description: 'Guia para trabalho embarcado', category: 'department', href: '/guia_offshore', visible: false },

    // Management & Metrics (Inside Department)
    { id: 'notifications', label: 'Notificações', description: 'Gerenciar notificações do sistema', category: 'department', href: '/admin/notifications' },
    { id: 'feedback', label: 'Feedbacks', description: 'Visualizar feedbacks dos usuários', category: 'department', href: '/admin/feedback' },
    { id: 'metrics', label: 'Métricas Gerais', description: 'Métricas gerais de uso', category: 'department', href: '/admin/metrics' },
    { id: 'engagement', label: 'Engajamento (Notícias)', description: 'Métricas de engajamento de notícias', category: 'department', href: '/admin/metrics/engagement' },

    // Admin / Integrations (Visible if permitted)
    { id: 'integracao-erp', label: 'Integração ERP', description: 'Gestão de integração MIO', category: 'department', href: '/admin/integracao-erp' },
];

export const MODULE_CATEGORIES = {
    core: 'Geral',
    hr: 'Meu RH',
    content: 'Conteúdo e Conhecimento',
    department: 'Departamento'
};
