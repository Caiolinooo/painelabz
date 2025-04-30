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
      avaliacaoModule = await avaliacaoDesempenho.init();
      console.log('Módulo de avaliação de desempenho inicializado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar módulo de avaliação de desempenho:', error);
      throw error;
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
