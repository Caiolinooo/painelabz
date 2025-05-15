/**
 * Stub para o modelo de Funcionário
 * Este arquivo serve como um placeholder até que o modelo real seja implementado
 */

class FuncionarioStub {
  constructor() {
    this.funcionarios = [
      {
        id: 1,
        nome: 'João Silva',
        email: 'joao.silva@example.com',
        cargo: 'Analista de Logística',
        departamento: 'Logística',
        dataAdmissao: '2023-01-15',
        status: 'ativo',
        userId: 'user-1',
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2023-01-15')
      },
      {
        id: 2,
        nome: 'Maria Oliveira',
        email: 'maria.oliveira@example.com',
        cargo: 'Gerente de Operações',
        departamento: 'Operações',
        dataAdmissao: '2022-05-10',
        status: 'ativo',
        userId: 'user-2',
        createdAt: new Date('2022-05-10'),
        updatedAt: new Date('2022-05-10')
      },
      {
        id: 3,
        nome: 'Pedro Santos',
        email: 'pedro.santos@example.com',
        cargo: 'Assistente Administrativo',
        departamento: 'Administrativo',
        dataAdmissao: '2023-03-22',
        status: 'ativo',
        userId: 'user-3',
        createdAt: new Date('2023-03-22'),
        updatedAt: new Date('2023-03-22')
      },
      {
        id: 4,
        nome: 'Ana Costa',
        email: 'ana.costa@example.com',
        cargo: 'Analista de RH',
        departamento: 'Recursos Humanos',
        dataAdmissao: '2022-11-05',
        status: 'ativo',
        userId: 'user-4',
        createdAt: new Date('2022-11-05'),
        updatedAt: new Date('2022-11-05')
      },
      {
        id: 5,
        nome: 'Carlos Ferreira',
        email: 'carlos.ferreira@example.com',
        cargo: 'Diretor de Operações',
        departamento: 'Diretoria',
        dataAdmissao: '2021-08-15',
        status: 'ativo',
        userId: 'user-5',
        createdAt: new Date('2021-08-15'),
        updatedAt: new Date('2021-08-15')
      }
    ];
    this.nextId = 6;
  }

  /**
   * Encontra todos os funcionários
   * @returns {Array} Lista de funcionários
   */
  async findAll() {
    return this.funcionarios;
  }

  /**
   * Encontra um funcionário pelo ID
   * @param {string|number} id ID do funcionário
   * @returns {Object|null} Funcionário encontrado ou null
   */
  async findByPk(id) {
    return this.funcionarios.find(f => f.id === id) || null;
  }

  /**
   * Encontra um funcionário pelo ID de usuário
   * @param {string} userId ID do usuário
   * @returns {Object|null} Funcionário encontrado ou null
   */
  async findByUserId(userId) {
    return this.funcionarios.find(f => f.userId === userId) || null;
  }

  /**
   * Encontra funcionários por departamento
   * @param {string} departamento Nome do departamento
   * @returns {Array} Lista de funcionários do departamento
   */
  async findByDepartamento(departamento) {
    return this.funcionarios.filter(f => f.departamento === departamento);
  }

  /**
   * Cria um novo funcionário
   * @param {Object} data Dados do funcionário
   * @returns {Object} Funcionário criado
   */
  async create(data) {
    const funcionario = {
      id: this.nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.funcionarios.push(funcionario);
    return funcionario;
  }

  /**
   * Atualiza um funcionário
   * @param {Object} data Dados a serem atualizados
   * @param {Object} options Opções de atualização
   * @returns {number} Número de registros atualizados
   */
  async update(data, options) {
    const { where } = options;
    const index = this.funcionarios.findIndex(f => f.id === where.id);

    if (index === -1) {
      return 0;
    }

    this.funcionarios[index] = {
      ...this.funcionarios[index],
      ...data,
      updatedAt: new Date()
    };

    return 1;
  }

  /**
   * Remove um funcionário
   * @param {Object} options Opções de remoção
   * @returns {number} Número de registros removidos
   */
  async destroy(options) {
    const { where } = options;
    const initialLength = this.funcionarios.length;
    this.funcionarios = this.funcionarios.filter(f => f.id !== where.id);
    return initialLength - this.funcionarios.length;
  }

  /**
   * Importa funcionários de um arquivo
   * @param {Array} data Array de dados de funcionários
   * @returns {Object} Resultado da importação
   */
  async importFromFile(data) {
    let imported = 0;
    let errors = 0;

    for (const item of data) {
      try {
        // Verificar se já existe um funcionário com o mesmo email
        const existingByEmail = this.funcionarios.find(f => f.email === item.email);

        if (existingByEmail) {
          // Atualizar funcionário existente
          await this.update(item, { where: { id: existingByEmail.id } });
        } else {
          // Criar novo funcionário
          await this.create(item);
        }

        imported++;
      } catch (error) {
        console.error('Erro ao importar funcionário:', error);
        errors++;
      }
    }

    return {
      total: data.length,
      imported,
      errors
    };
  }
}

module.exports = FuncionarioStub;
