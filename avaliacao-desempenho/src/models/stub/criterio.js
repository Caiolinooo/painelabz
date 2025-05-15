/**
 * Stub para o modelo de Critério
 * Este arquivo serve como um placeholder até que o modelo real seja implementado
 */

class CriterioStub {
  constructor() {
    this.criterios = [
      { 
        id: 1, 
        nome: 'Produtividade', 
        descricao: 'Capacidade de entregar resultados dentro dos prazos estabelecidos, mantendo a qualidade esperada.', 
        peso: 3, 
        notaMaxima: 5,
        categoria: 'desempenho'
      },
      { 
        id: 2, 
        nome: 'Comunicação', 
        descricao: 'Habilidade de se comunicar de forma clara e eficaz com colegas, superiores e clientes.', 
        peso: 2, 
        notaMaxima: 5,
        categoria: 'comportamento'
      },
      { 
        id: 3, 
        nome: 'Pontualidade', 
        descricao: 'Cumprimento de prazos e horários estabelecidos.', 
        peso: 2, 
        notaMaxima: 5,
        categoria: 'comportamento'
      },
      { 
        id: 4, 
        nome: 'Trabalho em Equipe', 
        descricao: 'Capacidade de colaborar com colegas e contribuir para o sucesso da equipe.', 
        peso: 3, 
        notaMaxima: 5,
        categoria: 'comportamento'
      },
      { 
        id: 5, 
        nome: 'Conhecimento Técnico', 
        descricao: 'Domínio das habilidades técnicas necessárias para a função.', 
        peso: 3, 
        notaMaxima: 5,
        categoria: 'conhecimento'
      },
      { 
        id: 6, 
        nome: 'Resolução de Problemas', 
        descricao: 'Capacidade de identificar e resolver problemas de forma eficaz.', 
        peso: 3, 
        notaMaxima: 5,
        categoria: 'desempenho'
      },
      { 
        id: 7, 
        nome: 'Liderança', 
        descricao: 'Capacidade de liderar e influenciar positivamente a equipe.', 
        peso: 2, 
        notaMaxima: 5,
        categoria: 'lideranca'
      },
      { 
        id: 8, 
        nome: 'Inovação', 
        descricao: 'Capacidade de propor e implementar novas ideias e soluções.', 
        peso: 2, 
        notaMaxima: 5,
        categoria: 'desempenho'
      },
      { 
        id: 9, 
        nome: 'Adaptabilidade', 
        descricao: 'Capacidade de se adaptar a mudanças e novos desafios.', 
        peso: 2, 
        notaMaxima: 5,
        categoria: 'comportamento'
      },
      { 
        id: 10, 
        nome: 'Comprometimento', 
        descricao: 'Nível de dedicação e compromisso com os objetivos da empresa.', 
        peso: 3, 
        notaMaxima: 5,
        categoria: 'comportamento'
      }
    ];
    this.nextId = 11;
  }

  /**
   * Encontra todos os critérios
   * @returns {Array} Lista de critérios
   */
  async findAll() {
    return this.criterios;
  }

  /**
   * Encontra um critério pelo ID
   * @param {string|number} id ID do critério
   * @returns {Object|null} Critério encontrado ou null
   */
  async findByPk(id) {
    return this.criterios.find(c => c.id === id) || null;
  }

  /**
   * Encontra critérios por categoria
   * @param {string} categoria Categoria dos critérios
   * @returns {Array} Lista de critérios da categoria
   */
  async findByCategoria(categoria) {
    return this.criterios.filter(c => c.categoria === categoria);
  }

  /**
   * Cria um novo critério
   * @param {Object} data Dados do critério
   * @returns {Object} Critério criado
   */
  async create(data) {
    const criterio = {
      id: this.nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.criterios.push(criterio);
    return criterio;
  }

  /**
   * Atualiza um critério
   * @param {Object} data Dados a serem atualizados
   * @param {Object} options Opções de atualização
   * @returns {number} Número de registros atualizados
   */
  async update(data, options) {
    const { where } = options;
    const index = this.criterios.findIndex(c => c.id === where.id);
    
    if (index === -1) {
      return 0;
    }
    
    this.criterios[index] = {
      ...this.criterios[index],
      ...data,
      updatedAt: new Date()
    };
    
    return 1;
  }

  /**
   * Remove um critério
   * @param {Object} options Opções de remoção
   * @returns {number} Número de registros removidos
   */
  async destroy(options) {
    const { where } = options;
    const initialLength = this.criterios.length;
    this.criterios = this.criterios.filter(c => c.id !== where.id);
    return initialLength - this.criterios.length;
  }
}

module.exports = CriterioStub;
