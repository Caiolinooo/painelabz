/**
 * Critérios padrão para avaliação de desempenho
 * Estes critérios são usados quando não há critérios personalizados definidos no banco de dados
 */

export interface CriterioAvaliacao {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  peso: number;
  pontuacao_maxima: number;
  ativo?: boolean;
}

// Função para gerar UUIDs v4 compatíveis com o formato do banco de dados
function generateUUID(): string {
  // Implementação simples de UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Critérios padrão para avaliação de desempenho com UUIDs válidos
export const criteriosPadrao: CriterioAvaliacao[] = [
  {
    id: '9a4f1c8b-5c1a-4e3b-8e0d-e2c1d3b4e5f6',
    nome: 'Conhecimento Técnico',
    descricao: 'Avalia o domínio das tecnologias e ferramentas utilizadas',
    categoria: 'Competências Técnicas',
    peso: 1.5,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '8b2e3f4a-1d5c-4e6b-9f0a-7c8d9e0f1a2b',
    nome: 'Produtividade',
    descricao: 'Avalia a capacidade de entregar resultados no prazo',
    categoria: 'Desempenho',
    peso: 1.2,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '7c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
    nome: 'Trabalho em Equipe',
    descricao: 'Avalia a capacidade de colaborar com os colegas',
    categoria: 'Habilidades Interpessoais',
    peso: 1.0,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '6d4e5f6a-7b8c-4d9e-0f1a-2b3c4d5e6f7a',
    nome: 'Comunicação',
    descricao: 'Avalia a clareza e eficácia na comunicação',
    categoria: 'Habilidades Interpessoais',
    peso: 1.0,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b',
    nome: 'Resolução de Problemas',
    descricao: 'Avalia a capacidade de identificar e resolver problemas',
    categoria: 'Competências Técnicas',
    peso: 1.3,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '4f5a6b7c-8d9e-4f0a-1b2c-3d4e5f6a7b8c',
    nome: 'Iniciativa',
    descricao: 'Avalia a capacidade de tomar iniciativa e propor soluções',
    categoria: 'Comportamento',
    peso: 1.2,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '3a4b5c6d-7e8f-4a9b-0c1d-2e3f4a5b6c7d',
    nome: 'Comprometimento',
    descricao: 'Avalia o nível de comprometimento com os objetivos da empresa',
    categoria: 'Comportamento',
    peso: 1.1,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
    nome: 'Adaptabilidade',
    descricao: 'Avalia a capacidade de se adaptar a mudanças e novos desafios',
    categoria: 'Comportamento',
    peso: 1.0,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    nome: 'Pontualidade',
    descricao: 'Avalia o cumprimento de prazos e horários estabelecidos',
    categoria: 'Comportamento',
    peso: 0.8,
    pontuacao_maxima: 5,
    ativo: true
  },
  {
    id: '0d1e2f3a-4b5c-4d6e-7f8a-9b0c1d2e3f4a',
    nome: 'Liderança',
    descricao: 'Avalia a capacidade de liderar e influenciar positivamente a equipe',
    categoria: 'Liderança',
    peso: 1.5,
    pontuacao_maxima: 5,
    ativo: true
  }
];

// Função para obter critérios por categoria
export function getCriteriosPorCategoria(categoria: string): CriterioAvaliacao[] {
  return criteriosPadrao.filter(criterio =>
    criterio.categoria.toLowerCase() === categoria.toLowerCase() && criterio.ativo
  );
}

// Função para obter todas as categorias disponíveis
export function getCategorias(): string[] {
  const categorias = new Set<string>();
  criteriosPadrao.forEach(criterio => {
    if (criterio.ativo) {
      categorias.add(criterio.categoria);
    }
  });
  return Array.from(categorias);
}

// Função para obter um critério pelo ID
export function getCriterioPorId(id: string): CriterioAvaliacao | undefined {
  return criteriosPadrao.find(criterio => criterio.id === id && criterio.ativo);
}

// Função para obter todos os critérios ativos
export function getTodosCriterios(): CriterioAvaliacao[] {
  return criteriosPadrao.filter(criterio => criterio.ativo);
}
