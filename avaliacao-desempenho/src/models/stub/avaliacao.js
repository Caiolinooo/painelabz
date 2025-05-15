/**
 * Stub para o modelo de Avaliação
 * Este arquivo serve como um placeholder até que o modelo real seja implementado
 */

class AvaliacaoStub {
  constructor() {
    this.avaliacoes = [
      {
        id: 1,
        funcionarioId: 1,
        avaliadorId: 2,
        periodo: 'trimestral',
        status: 'concluida',
        pontuacao: 85,
        comentarios: 'Bom desempenho geral, mas precisa melhorar a comunicação.',
        dataAvaliacao: '2025-01-15',
        dataProximaAvaliacao: '2025-04-15',
        criterios: [
          { id: 1, nome: 'Produtividade', descricao: 'Capacidade de entregar resultados', peso: 3, nota: 4, notaMaxima: 5 },
          { id: 2, nome: 'Comunicação', descricao: 'Habilidade de comunicação com a equipe', peso: 2, nota: 3, notaMaxima: 5 },
          { id: 3, nome: 'Pontualidade', descricao: 'Cumprimento de prazos', peso: 2, nota: 5, notaMaxima: 5 },
          { id: 4, nome: 'Trabalho em Equipe', descricao: 'Colaboração com colegas', peso: 3, nota: 4, notaMaxima: 5 }
        ]
      },
      {
        id: 2,
        funcionarioId: 3,
        avaliadorId: 2,
        periodo: 'semestral',
        status: 'pendente',
        pontuacao: null,
        comentarios: '',
        dataAvaliacao: '2025-05-10',
        dataProximaAvaliacao: '2025-11-10',
        criterios: [
          { id: 1, nome: 'Produtividade', descricao: 'Capacidade de entregar resultados', peso: 3, nota: null, notaMaxima: 5 },
          { id: 2, nome: 'Comunicação', descricao: 'Habilidade de comunicação com a equipe', peso: 2, nota: null, notaMaxima: 5 },
          { id: 3, nome: 'Pontualidade', descricao: 'Cumprimento de prazos', peso: 2, nota: null, notaMaxima: 5 },
          { id: 4, nome: 'Trabalho em Equipe', descricao: 'Colaboração com colegas', peso: 3, nota: null, notaMaxima: 5 }
        ]
      },
      {
        id: 3,
        funcionarioId: 4,
        avaliadorId: 5,
        periodo: 'anual',
        status: 'emAndamento',
        pontuacao: 72,
        comentarios: 'Demonstra potencial, mas precisa melhorar em algumas áreas.',
        dataAvaliacao: '2025-03-20',
        dataProximaAvaliacao: '2026-03-20',
        criterios: [
          { id: 1, nome: 'Produtividade', descricao: 'Capacidade de entregar resultados', peso: 3, nota: 4, notaMaxima: 5 },
          { id: 2, nome: 'Comunicação', descricao: 'Habilidade de comunicação com a equipe', peso: 2, nota: 3, notaMaxima: 5 },
          { id: 3, nome: 'Pontualidade', descricao: 'Cumprimento de prazos', peso: 2, nota: 3, notaMaxima: 5 },
          { id: 4, nome: 'Trabalho em Equipe', descricao: 'Colaboração com colegas', peso: 3, nota: 4, notaMaxima: 5 }
        ]
      }
    ];
    this.nextId = 4;
  }

  /**
   * Encontra todas as avaliações
   * @returns {Array} Lista de avaliações
   */
  async findAll() {
    return this.avaliacoes;
  }

  /**
   * Encontra uma avaliação pelo ID
   * @param {string|number} id ID da avaliação
   * @returns {Object|null} Avaliação encontrada ou null
   */
  async findByPk(id) {
    return this.avaliacoes.find(a => a.id === id) || null;
  }

  /**
   * Encontra avaliações por funcionário
   * @param {string|number} funcionarioId ID do funcionário
   * @returns {Array} Lista de avaliações do funcionário
   */
  async findByFuncionario(funcionarioId) {
    return this.avaliacoes.filter(a => a.funcionarioId === funcionarioId);
  }

  /**
   * Cria uma nova avaliação
   * @param {Object} data Dados da avaliação
   * @returns {Object} Avaliação criada
   */
  async create(data) {
    const avaliacao = {
      id: this.nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.avaliacoes.push(avaliacao);
    return avaliacao;
  }

  /**
   * Atualiza uma avaliação
   * @param {Object} data Dados a serem atualizados
   * @param {Object} options Opções de atualização
   * @returns {number} Número de registros atualizados
   */
  async update(data, options) {
    const { where } = options;
    const index = this.avaliacoes.findIndex(a => a.id === where.id);
    
    if (index === -1) {
      return 0;
    }
    
    this.avaliacoes[index] = {
      ...this.avaliacoes[index],
      ...data,
      updatedAt: new Date()
    };
    
    return 1;
  }

  /**
   * Remove uma avaliação
   * @param {Object} options Opções de remoção
   * @returns {number} Número de registros removidos
   */
  async destroy(options) {
    const { where } = options;
    const initialLength = this.avaliacoes.length;
    this.avaliacoes = this.avaliacoes.filter(a => a.id !== where.id);
    return initialLength - this.avaliacoes.length;
  }
}

module.exports = AvaliacaoStub;
