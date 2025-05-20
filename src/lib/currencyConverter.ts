// Serviço para conversão de moedas

// Tipos de moedas suportadas
export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP';

// Interface para taxas de câmbio
export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  timestamp: number;
}

// Cache para taxas de câmbio
let cachedRates: ExchangeRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hora em milissegundos

// Função para obter taxas de câmbio atualizadas
export async function getExchangeRates(baseCurrency: Currency = 'BRL'): Promise<ExchangeRates> {
  const currentTime = Date.now();

  // Verificar se o cache é válido
  if (cachedRates && currentTime - cacheTimestamp < CACHE_DURATION && cachedRates.base === baseCurrency) {
    return cachedRates;
  }

  try {
    // Em um ambiente real, você usaria uma API como Open Exchange Rates, ExchangeRate-API, etc.
    // Por enquanto, usaremos taxas fixas para demonstração
    const mockRates: ExchangeRates = {
      base: baseCurrency,
      rates: {
        BRL: 1,
        USD: 0.18,  // 1 BRL = 0.18 USD
        EUR: 0.17,  // 1 BRL = 0.17 EUR
        GBP: 0.14   // 1 BRL = 0.14 GBP
      },
      timestamp: currentTime
    };

    // Se a moeda base não for BRL, ajustar as taxas
    if (baseCurrency !== 'BRL') {
      const baseRate = mockRates.rates[baseCurrency];

      // Recalcular todas as taxas com base na nova moeda base
      Object.keys(mockRates.rates).forEach(currency => {
        mockRates.rates[currency as Currency] = mockRates.rates[currency as Currency] / baseRate;
      });

      // A taxa para a moeda base deve ser 1
      mockRates.rates[baseCurrency] = 1;
    }

    // Atualizar o cache
    cachedRates = mockRates;
    cacheTimestamp = currentTime;

    return mockRates;
  } catch (error) {
    console.error('Erro ao obter taxas de câmbio:', error);

    // Em caso de erro, retornar taxas padrão
    return {
      base: baseCurrency,
      rates: {
        BRL: 1,
        USD: baseCurrency === 'USD' ? 1 : 0.18,
        EUR: baseCurrency === 'EUR' ? 1 : 0.17,
        GBP: baseCurrency === 'GBP' ? 1 : 0.14
      },
      timestamp: currentTime
    };
  }
}

// Função para converter valor entre moedas
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) return amount;

  // Se a moeda base das taxas for diferente da moeda de origem, precisamos ajustar
  if (rates.base !== fromCurrency) {
    // Converter para a moeda base primeiro
    const amountInBaseCurrency = amount * rates.rates[fromCurrency];
    // Depois converter para a moeda de destino
    return amountInBaseCurrency * rates.rates[toCurrency];
  }

  // Conversão direta
  return amount * rates.rates[toCurrency];
}

// Função para formatar valor monetário de acordo com a moeda
export function formatCurrencyValue(amount: number, currency: Currency): string {
  // Verificar se o número tem casas decimais específicas que precisam ser preservadas
  const amountStr = amount.toString();

  // Determinar o número de casas decimais a serem exibidas
  let minDigits = 2;  // Mínimo padrão de 2 casas decimais
  let maxDigits = 2;  // Padrão para valores sem casas decimais específicas

  // Analisar a parte decimal do número
  if (amountStr.includes('.')) {
    const [, decimalPart] = amountStr.split('.');

    // Determinar o número máximo de casas decimais com base no valor
    maxDigits = Math.max(2, decimalPart.length);

    // Verificar se o valor termina com zeros
    const trailingZerosMatch = decimalPart.match(/0+$/);
    if (trailingZerosMatch) {
      // Garantir que exibimos pelo menos o número de casas decimais necessárias
      // para preservar os zeros no final
      minDigits = Math.max(2, decimalPart.length);
    }
  }

  // Criar o formatador com as configurações determinadas
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });

  // Formatar o valor
  let formattedValue = formatter.format(amount);

  // Verificar se o valor formatado tem o número correto de casas decimais
  const parts = formattedValue.split(',');
  if (parts.length > 1) {
    const [intPart, decPart] = parts;

    // Se o valor original tinha mais casas decimais que o formatado
    if (amountStr.includes('.')) {
      const [, originalDecPart] = amountStr.split('.');

      // Se a parte decimal formatada é menor que a original e a original termina com zeros
      if (decPart.length < originalDecPart.length && originalDecPart.endsWith('0')) {
        // Adicionar os zeros que foram perdidos na formatação
        const zerosToAdd = originalDecPart.length - decPart.length;
        if (zerosToAdd > 0) {
          formattedValue = `${intPart},${decPart}${'0'.repeat(zerosToAdd)}`;
        }
      }
    }
  }

  return formattedValue;
}

// Função para extrair valor numérico de uma string formatada
export function extractNumericValue(formattedValue: string): number {
  if (!formattedValue) return 0;

  // Remover símbolos de moeda, espaços e separadores de milhar
  // Converter vírgula para ponto para representação decimal
  const cleanValue = formattedValue
    .replace(/[^\d,.-]/g, '')  // Remove tudo exceto dígitos, vírgula, ponto e sinal negativo
    .replace(/\./g, '')        // Remove pontos (separadores de milhar)
    .replace(',', '.');        // Converte vírgula para ponto decimal

  // Casos especiais que precisam de tratamento cuidadoso

  // 1. Valor termina com ponto decimal (usuário acabou de digitar a vírgula)
  if (cleanValue.endsWith('.')) {
    // Retornar apenas a parte inteira
    return parseInt(cleanValue.slice(0, -1)) || 0;
  }

  // 2. Valor tem parte decimal com zeros no final ou mais de 2 dígitos
  if (cleanValue.includes('.')) {
    const [intPart, decPart] = cleanValue.split('.');

    // Preservar a precisão exata quando:
    // - A parte decimal termina com zeros
    // - A parte decimal tem mais de 2 dígitos
    if (decPart.endsWith('0') || decPart.length > 2) {
      // Usar Number em vez de parseFloat para preservar zeros no final
      return Number(cleanValue);
    }
  }

  // Caso padrão: usar parseFloat para converter para número
  return parseFloat(cleanValue) || 0;
}

// Símbolos das moedas
export const currencySymbols: Record<Currency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

// Nomes das moedas
export const currencyNames: Record<Currency, string> = {
  BRL: 'Real Brasileiro',
  USD: 'Dólar Americano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina'
};
