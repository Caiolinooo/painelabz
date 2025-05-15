/**
 * Utilitário para inicializar e gerenciar o módulo de avaliação de desempenho
 */

// Importar o módulo de avaliação de desempenho
const avaliacaoDesempenho = require('../../avaliacao-desempenho/src/index');
// Nota: Este é um stub temporário até que o módulo real seja implementado

// Variável para armazenar a instância inicializada do módulo
let avaliacaoModule: any = null;

/**
 * Inicializa o módulo de avaliação de desempenho se ainda não estiver inicializado
 * @returns A instância inicializada do módulo
 */
export async function initAvaliacaoModule() {
  if (!avaliacaoModule) {
    try {
      console.log('Inicializando módulo de avaliação de desempenho...');

      // Verificar se o módulo existe
      if (!avaliacaoDesempenho || typeof avaliacaoDesempenho.init !== 'function') {
        console.warn('Módulo de avaliação não encontrado ou método init não disponível. Usando stub.');
        // Criar um stub básico para o módulo
        avaliacaoModule = {
          version: '0.1.0-stub',
          name: 'avaliacao-desempenho-stub',
          getStatus: () => ({ status: 'online', mode: 'stub' }),
          getAvaliacoes: async () => [],
          getAvaliacao: async (id: any) => null,
          getAvaliacoesByFuncionario: async (funcionarioId: any) => [],
          createAvaliacao: async (data: any) => ({ id: 1, ...data }),
          updateAvaliacao: async (id: any, data: any) => ({ id, ...data }),
          deleteAvaliacao: async (id: any) => true,
          getFuncionarios: async () => [],
          getFuncionario: async (id: any) => null,
          getCriterios: async () => [],
          getCriterio: async (id: any) => null,
          getCriteriosByCategoria: async (categoria: string) => []
        };
        console.log('Stub do módulo de avaliação criado com sucesso!');
        return avaliacaoModule;
      }

      // Tentar inicializar o módulo real
      avaliacaoModule = await avaliacaoDesempenho.init();
      console.log('Módulo de avaliação de desempenho inicializado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar módulo de avaliação de desempenho:', error);

      // Em caso de erro, criar um stub básico para o módulo
      console.warn('Criando stub do módulo de avaliação devido a erro de inicialização.');
      avaliacaoModule = {
        version: '0.1.0-stub',
        name: 'avaliacao-desempenho-stub',
        getStatus: () => ({ status: 'online', mode: 'stub' }),
        getAvaliacoes: async () => [],
        getAvaliacao: async (id: any) => null,
        getAvaliacoesByFuncionario: async (funcionarioId: any) => [],
        createAvaliacao: async (data: any) => ({ id: 1, ...data }),
        updateAvaliacao: async (id: any, data: any) => ({ id, ...data }),
        deleteAvaliacao: async (id: any) => true,
        getFuncionarios: async () => [],
        getFuncionario: async (id: any) => null,
        getCriterios: async () => [],
        getCriterio: async (id: any) => null,
        getCriteriosByCategoria: async (categoria: string) => []
      };
    }
  }
  return avaliacaoModule;
}

/**
 * Obtém a instância do módulo de avaliação de desempenho
 * @returns A instância do módulo ou null se não estiver inicializado
 */
export function getAvaliacaoModule() {
  return avaliacaoModule;
}

/**
 * Verifica se o módulo de avaliação de desempenho está inicializado
 * @returns true se o módulo estiver inicializado, false caso contrário
 */
export function isAvaliacaoModuleInitialized() {
  return !!avaliacaoModule;
}

/**
 * Reinicia o módulo de avaliação de desempenho
 * @returns A nova instância inicializada do módulo
 */
export async function restartAvaliacaoModule() {
  avaliacaoModule = null;
  return await initAvaliacaoModule();
}
