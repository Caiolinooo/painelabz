/**
 * Utilitários para lidar com problemas de hidratação no React
 */

/**
 * Formata uma data de forma segura para evitar erros de hidratação
 * @param date Data a ser formatada
 * @param options Opções de formatação
 * @returns String formatada ou null se estiver no servidor
 */
export function formatDateSafe(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  },
  locale: string = 'pt-BR'
): string | null {
  // Verificar se estamos no cliente
  if (typeof window === 'undefined') {
    return null;
  }

  // Converter para objeto Date se necessário
  const dateObj = date instanceof Date ? date : new Date(date);
  
  try {
    return dateObj.toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateObj.toISOString().split('T')[0]; // Fallback para formato ISO
  }
}

/**
 * Formata um número de forma segura para evitar erros de hidratação
 * @param num Número a ser formatado
 * @param options Opções de formatação
 * @returns String formatada ou null se estiver no servidor
 */
export function formatNumberSafe(
  num: number,
  options: Intl.NumberFormatOptions = {},
  locale: string = 'pt-BR'
): string | null {
  // Verificar se estamos no cliente
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    return num.toLocaleString(locale, options);
  } catch (error) {
    console.error('Erro ao formatar número:', error);
    return num.toString(); // Fallback para toString
  }
}

/**
 * Verifica se o código está sendo executado no cliente
 * @returns true se estiver no cliente, false se estiver no servidor
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Wrapper para funções que devem ser executadas apenas no cliente
 * @param fn Função a ser executada
 * @param fallback Valor de fallback para o servidor
 * @returns Resultado da função ou fallback
 */
export function clientOnly<T, F>(fn: () => T, fallback: F): T | F {
  if (isClient()) {
    return fn();
  }
  return fallback;
}
