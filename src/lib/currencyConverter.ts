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
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

// Função para extrair valor numérico de uma string formatada
export function extractNumericValue(formattedValue: string): number {
  // Remover símbolos de moeda, espaços e converter vírgula para ponto
  const cleanValue = formattedValue.replace(/[^\d,.-]/g, '').replace(',', '.');
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
