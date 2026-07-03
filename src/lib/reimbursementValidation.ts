/**
 * Validação inteligente de valores de reembolso.
 *
 * Este módulo centraliza os limites e regras de negócio para valores de
 * reembolso, evitando erros comuns de digitação (como digitar "5000,83"
 * para uma despesa de alimentação e o sistema interpretar como
 * R$ 5.000.083,00 devido ao "formato bancário" antigo).
 *
 * Os limites abaixo são utilizados tanto no frontend (validação do
 * formulário) quanto no backend (validação server-side na API) para
 * garantir consistência.
 */

/**
 * Limite de valor por tipo de despesa.
 * Valores em BRL (Reais).
 */
export interface ExpenseTypeLimit {
  /** Valor máximo permitido para o tipo (em BRL). */
  max: number;
  /** Valor típico máximo esperado (acima disso, exibir aviso de confirmação). */
  warningThreshold: number;
  /** Descrição amigável do limite (usada em mensagens de erro/aviso). */
  label: string;
  /** Descrição do que o tipo representa (para tooltips de ajuda). */
  description: string;
}

/**
 * Limites por tipo de despesa.
 *
 * Os valores foram definidos com base em políticas corporativas comuns
 * de reembolso. Podem ser ajustados conforme a política da empresa.
 */
export const EXPENSE_TYPE_LIMITS: Record<string, ExpenseTypeLimit> = {
  alimentacao: {
    max: 2000,
    warningThreshold: 200,
    label: 'Alimentação',
    description: 'Refeições e lanches corporativos'
  },
  transporte: {
    max: 1000,
    warningThreshold: 300,
    label: 'Transporte',
    description: 'Táxi, ônibus, metrô, estacionamento'
  },
  hospedagem: {
    max: 5000,
    warningThreshold: 800,
    label: 'Hospedagem',
    description: 'Hotéis e pousadas em viagens corporativas'
  },
  combustivel: {
    max: 1000,
    warningThreshold: 300,
    label: 'Combustível',
    description: 'Abastecimento de veículos corporativos'
  },
  material: {
    max: 5000,
    warningThreshold: 1000,
    label: 'Material de Escritório',
    description: 'Materiais de escritório e suprimentos'
  },
  outros: {
    max: 10000,
    warningThreshold: 2000,
    label: 'Outros',
    description: 'Outros tipos de despesa'
  }
};

/**
 * Limite máximo para o valor total de uma solicitação de reembolso.
 * Em BRL.
 */
export const MAX_TOTAL_REIMBURSEMENT = 50000;

/**
 * Valor mínimo permitido por despesa (em BRL).
 * Evita valores como R$ 0,01 que provavelmente são erros.
 */
export const MIN_EXPENSE_VALUE = 0.01;

/**
 * Converte uma string de valor no formato brasileiro ("1.234,56")
 * ou no formato decimal ("1234.56") para um número.
 */
export function parseCurrencyValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  // Remover símbolos de moeda e espaços
  let cleaned = trimmed.replace(/[R$\s€£]/g, '');

  // Detectar o formato:
  // - Se houver vírgula e ponto: vírgula é decimal, ponto é milhar (pt-BR)
  // - Se houver apenas vírgula: vírgula é decimal (pt-BR)
  // - Se houver apenas ponto: pode ser milhar ou decimal (en)
  // - Se não houver nenhum: número inteiro
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Formato pt-BR: "1.234,56" -> remover pontos, trocar vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // Apenas vírgula: é o decimal no formato pt-BR
    cleaned = cleaned.replace(',', '.');
  }
  // Se tem apenas ponto ou nenhum, assumir formato numérico padrão

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata um número para o padrão brasileiro ("1.234,56").
 */
export function formatBRLValue(value: number): string {
  if (isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Resultado da validação de um valor de despesa.
 */
export interface ExpenseValidationResult {
  /** True se o valor é válido (dentro dos limites). */
  valid: boolean;
  /** True se o valor é suspeito (acima do warningThreshold mas dentro do max). */
  warning: boolean;
  /** Mensagem de erro caso inválido. */
  errorMessage?: string;
  /** Mensagem de aviso caso suspeito. */
  warningMessage?: string;
  /** O limite aplicado para o tipo. */
  limit: ExpenseTypeLimit;
}

/**
 * Valida um valor de despesa contra o limite do tipo informado.
 */
export function validateExpenseValue(
  tipoReembolso: string,
  valor: string | number
): ExpenseValidationResult {
  const limit = EXPENSE_TYPE_LIMITS[tipoReembolso] || EXPENSE_TYPE_LIMITS.outros;
  const numericValue = parseCurrencyValue(valor);

  if (numericValue < MIN_EXPENSE_VALUE) {
    return {
      valid: false,
      warning: false,
      errorMessage: `O valor deve ser maior que R$ ${formatBRLValue(MIN_EXPENSE_VALUE)}.`,
      limit
    };
  }

  if (numericValue > limit.max) {
    return {
      valid: false,
      warning: false,
      errorMessage: `O valor R$ ${formatBRLValue(numericValue)} excede o limite máximo de R$ ${formatBRLValue(limit.max)} para a categoria "${limit.label}". Verifique se o valor foi digitado corretamente (use vírgula para separar os centavos, ex: 50,83 e não 5083).`,
      limit
    };
  }

  if (numericValue > limit.warningThreshold) {
    return {
      valid: true,
      warning: true,
      warningMessage: `O valor R$ ${formatBRLValue(numericValue)} está acima do típico para "${limit.label}" (geralmente até R$ ${formatBRLValue(limit.warningThreshold)}). Confirme se o valor está correto.`,
      limit
    };
  }

  return {
    valid: true,
    warning: false,
    limit
  };
}

/**
 * Resultado da validação do valor total de uma solicitação.
 */
export interface TotalValidationResult {
  valid: boolean;
  warning: boolean;
  errorMessage?: string;
  warningMessage?: string;
}

/**
 * Valida o valor total da solicitação de reembolso.
 */
export function validateTotalValue(total: string | number): TotalValidationResult {
  const numericValue = parseCurrencyValue(total);

  if (numericValue > MAX_TOTAL_REIMBURSEMENT) {
    return {
      valid: false,
      warning: false,
      errorMessage: `O valor total R$ ${formatBRLValue(numericValue)} excede o limite máximo de R$ ${formatBRLValue(MAX_TOTAL_REIMBURSEMENT)} por solicitação. Divida em múltiplas solicitações ou contate o administrador.`
    };
  }

  if (numericValue > MAX_TOTAL_REIMBURSEMENT * 0.5) {
    return {
      valid: true,
      warning: true,
      warningMessage: `O valor total R$ ${formatBRLValue(numericValue)} é relativamente alto. Confirme se todos os valores estão corretos antes de enviar.`
    };
  }

  return {
    valid: true,
    warning: false
  };
}

/**
 * Valida uma data de despesa.
 *
 * Regras:
 * - Não pode ser no futuro
 * - Não pode ser muito antiga (mais de 1 ano)
 */
export interface DateValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export function validateExpenseDate(dateString: string): DateValidationResult {
  if (!dateString) {
    return {
      valid: false,
      errorMessage: 'Data é obrigatória'
    };
  }

  // Criar data sem aplicar timezone para evitar off-by-one
  // Formato esperado: "YYYY-MM-DD" (vindo do input type="date")
  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    return {
      valid: false,
      errorMessage: 'Data inválida'
    };
  }

  // Criar a data ao meio-dia para evitar problemas de timezone
  const expenseDate = new Date(year, month - 1, day, 12, 0, 0);

  // Data atual ao meio-dia para comparação justa
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (isNaN(expenseDate.getTime())) {
    return {
      valid: false,
      errorMessage: 'Data inválida'
    };
  }

  if (expenseDate > today) {
    return {
      valid: false,
      errorMessage: 'A data da despesa não pode ser no futuro'
    };
  }

  // Verificar se a data não é muito antiga (mais de 1 ano)
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (expenseDate < oneYearAgo) {
    return {
      valid: false,
      errorMessage: 'A data da despesa não pode ser anterior a 1 ano'
    };
  }

  return {
    valid: true
  };
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD para uso em inputs type="date".
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lista de tipos de despesa suportados, para uso em selects.
 */
export const EXPENSE_TYPES = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'material', label: 'Material de Escritório' },
  { value: 'outros', label: 'Outros' }
];
