/**
 * Definição dos documentos (políticas, manuais, etc.)
 * Estes dados podem ser editados pelo painel de administração
 */

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  file: string;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Políticas
export const politicas: Document[] = [
  {
    id: 'hse-pt',
    title: 'Política de HSE',
    description: 'Diretrizes de Saúde, Segurança e Meio Ambiente do ABZ Group',
    category: 'HSE',
    language: 'Português',
    file: '/documentos/politicas/PL-HSE-R0 - Política de HSE_ABZ Group-PORT.pdf',
    enabled: true,
    order: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'qua-pt',
    title: 'Política da Qualidade',
    description: 'Política de Qualidade e Gestão do ABZ Group',
    category: 'Qualidade',
    language: 'Português',
    file: '/documentos/politicas/PL-QUA-R8 - Politica da Qualidade_ABZ Group-PORT.pdf',
    enabled: true,
    order: 2,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'qua-en',
    title: 'Quality Policy',
    description: 'ABZ Group Quality Management Policy',
    category: 'Qualidade',
    language: 'English',
    file: '/documentos/politicas/PL-QUA-a-R8 - Quality Policy_ABZ Group-ENG.pdf',
    enabled: true,
    order: 3,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

// Manual
export const manuais: Document[] = [
  {
    id: 'manual-logistica',
    title: 'Manual de Logística',
    description: 'Guia completo com as diretrizes e informações sobre os processos logísticos.',
    category: 'Manual',
    language: 'Português',
    file: '/documentos/manuais/Manual de logística.pdf',
    enabled: true,
    order: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

// Procedimentos de Logística
export const procedimentosLogistica: Document[] = [
  {
    id: 'proc-log-1',
    title: 'Procedimento de Recebimento',
    description: 'Procedimento para recebimento de materiais.',
    category: 'Logística',
    language: 'Português',
    file: '/documentos/procedimentos/recebimento.pdf',
    enabled: true,
    order: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'proc-log-2',
    title: 'Procedimento de Expedição',
    description: 'Procedimento para expedição de materiais.',
    category: 'Logística',
    language: 'Português',
    file: '/documentos/procedimentos/expedicao.pdf',
    enabled: true,
    order: 2,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

// Procedimentos Gerais
export const procedimentosGerais: Document[] = [
  {
    id: 'proc-ger-1',
    title: 'Procedimento de Compras',
    description: 'Procedimento para compras de materiais e serviços.',
    category: 'Compras',
    language: 'Português',
    file: '/documentos/procedimentos/compras.pdf',
    enabled: true,
    order: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'proc-ger-2',
    title: 'Procedimento de RH',
    description: 'Procedimento para gestão de recursos humanos.',
    category: 'RH',
    language: 'Português',
    file: '/documentos/procedimentos/rh.pdf',
    enabled: true,
    order: 2,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

// Função para obter todos os documentos
export function getAllDocuments(): Document[] {
  return [
    ...politicas,
    ...manuais,
    ...procedimentosLogistica,
    ...procedimentosGerais
  ];
}

// Função para obter documento por ID
export function getDocumentById(id: string): Document | undefined {
  return getAllDocuments().find(doc => doc.id === id);
}

// Função para obter documentos por categoria
export function getDocumentsByCategory(category: string): Document[] {
  return getAllDocuments().filter(doc => doc.category === category);
}
