/**
 * identity.ts — Utilitário centralizado de validação e normalização de identidade
 *
 * Usado tanto no frontend (assinatura mobile, perfil, contratos)
 * quanto no backend (APIs de sign, assign).
 * Nunca duplique estas funções — sempre importe daqui.
 */

// ─────────────────────────────────────────────
// CPF
// ─────────────────────────────────────────────

/**
 * Remove qualquer caractere que não seja dígito de um CPF.
 * Ex: "123.456.789-09" → "12345678909"
 */
export function normalizeCpf(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Formata 11 dígitos como CPF com máscara "000.000.000-00".
 * Aceita entrada parcial — formata até onde houver dígitos.
 */
export function formatCpf(raw: string): string {
  const digits = normalizeCpf(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Valida CPF: deve ter 11 dígitos e passar no algoritmo de dígitos verificadores.
 * Rejeita sequências iguais (ex: 000.000.000-00).
 */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // rejeita todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) return false;

  return true;
}

/**
 * Exibe CPF parcialmente mascarado para proteção de privacidade.
 * Ex: "12345678909" → "***.456.789-**"
 */
export function maskCpf(raw: string): string {
  const digits = normalizeCpf(raw);
  if (digits.length !== 11) return raw;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

// ─────────────────────────────────────────────
// Nome
// ─────────────────────────────────────────────

/**
 * Normaliza uma string para comparação:
 * - Converte para minúsculas
 * - Remove acentos/diacríticos
 * - Remove pontuação e caracteres especiais
 * - Colapsa espaços extras
 */
export function normalizeForComparison(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-z0-9\s]/g, '')     // remove pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comparação fuzzy de nomes: retorna true se ao menos UM token
 * do nome digitado existir no nome esperado (após normalização).
 *
 * Exemplos:
 *   namesMatch("João Silva", "João da Silva") → true
 *   namesMatch("Silva", "João da Silva")      → true
 *   namesMatch("Pedro", "João da Silva")      → false
 */
export function namesMatch(typed: string, expected: string): boolean {
  if (!typed || !expected) return false;
  const typedTokens = normalizeForComparison(typed).split(' ').filter(Boolean);
  const expectedNormalized = normalizeForComparison(expected);
  const expectedTokens = expectedNormalized.split(' ').filter(Boolean);
  return typedTokens.some(token => token.length >= 3 && expectedTokens.includes(token));
}

// ─────────────────────────────────────────────
// Data de Nascimento
// ─────────────────────────────────────────────

/**
 * Formata uma data ISO (YYYY-MM-DD) para exibição brasileira (DD/MM/YYYY).
 */
export function formatBirthDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/**
 * Compara duas datas de nascimento normalizadas (YYYY-MM-DD).
 * Ignora timezone — apenas compara o valor da string.
 */
export function birthDatesMatch(typed: string, expected: string): boolean {
  if (!typed || !expected) return true; // sem dado para comparar → não bloqueia
  return typed.trim() === expected.trim();
}
