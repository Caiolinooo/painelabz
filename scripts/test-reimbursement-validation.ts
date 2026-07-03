/**
 * Teste rápido para validar a lógica de parsing de valores e validação
 * de limites do sistema de reembolso.
 *
 * Executar com: node --experimental-vm-modules scripts/test-reimbursement-validation.js
 * ou: npx tsx scripts/test-reimbursement-validation.ts
 *
 * Este teste é independente do banco de dados e não requer ambiente completo.
 */

import {
  parseCurrencyValue,
  formatBRLValue,
  validateExpenseValue,
  validateTotalValue,
  validateExpenseDate,
  getTodayDateString,
  EXPENSE_TYPE_LIMITS,
  MAX_TOTAL_REIMBURSEMENT
} from '../src/lib/reimbursementValidation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    console.log(`  ✅ ${message} (=${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    console.log(`     Esperado: ${JSON.stringify(expected)}`);
    console.log(`     Recebido: ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\n=== Testes de parseCurrencyValue ===\n');

// Casos principais: o bug que queremos evitar
// Usuário digita "5000,83" esperando R$ 5000,83
assertEqual(parseCurrencyValue('5000,83'), 5000.83, 'Formato "5000,83" deve ser R$ 5000,83');
// Usuário digita "50,83" esperando R$ 50,83
assertEqual(parseCurrencyValue('50,83'), 50.83, 'Formato "50,83" deve ser R$ 50,83');
// Usuário digita "50" esperendo R$ 50,00 (não R$ 0,50 como no formato bancário antigo!)
assertEqual(parseCurrencyValue('50'), 50, 'Formato "50" deve ser R$ 50,00 (não 0,50)');

// Formato brasileiro com separador de milhar
assertEqual(parseCurrencyValue('1.234,56'), 1234.56, 'Formato "1.234,56" deve ser 1234.56');
assertEqual(parseCurrencyValue('5.000.083,00'), 5000083.00, 'Formato "5.000.083,00" deve ser 5000083');

// Formato com ponto decimal (inglês)
assertEqual(parseCurrencyValue('50.83'), 50.83, 'Formato "50.83" (ponto decimal) deve ser 50.83');
assertEqual(parseCurrencyValue('1234.56'), 1234.56, 'Formato "1234.56" deve ser 1234.56');

// Casos edge
assertEqual(parseCurrencyValue(''), 0, 'String vazia deve retornar 0');
assertEqual(parseCurrencyValue(null), 0, 'null deve retornar 0');
assertEqual(parseCurrencyValue(undefined), 0, 'undefined deve retornar 0');
assertEqual(parseCurrencyValue(50.83), 50.83, 'Número 50.83 deve retornar 50.83');
assertEqual(parseCurrencyValue('R$ 50,83'), 50.83, 'Formato "R$ 50,83" deve ser 50.83');

console.log('\n=== Testes de formatBRLValue ===\n');

assertEqual(formatBRLValue(50.83), '50,83', '50.83 deve formatar como "50,83"');
assertEqual(formatBRLValue(1234.56), '1.234,56', '1234.56 deve formatar como "1.234,56"');
assertEqual(formatBRLValue(5000083), '5.000.083,00', '5000083 deve formatar como "5.000.083,00"');

console.log('\n=== Testes de validateExpenseValue (limites por tipo) ===\n');

// Alimentação: limite R$ 2000, warning em R$ 200
const foodOk = validateExpenseValue('alimentacao', '50,83');
assert(foodOk.valid, 'Alimentação R$ 50,83 deve ser válida');
assert(!foodOk.warning, 'Alimentação R$ 50,83 não deve ter warning');

const foodWarning = validateExpenseValue('alimentacao', '500,00');
assert(foodWarning.valid, 'Alimentação R$ 500,00 deve ser válida (dentro do limite)');
assert(foodWarning.warning, 'Alimentação R$ 500,00 deve ter warning (acima do típico)');

const foodInvalid = validateExpenseValue('alimentacao', '5000,00');
assert(!foodInvalid.valid, 'Alimentação R$ 5000,00 deve ser INVÁLIDA (acima do limite máximo)');
assert(!!foodInvalid.errorMessage, 'Alimentação R$ 5000,00 deve ter mensagem de erro');

// O caso do bug: R$ 5.000.083,00 para alimentação
const hugeBug = validateExpenseValue('alimentacao', '5.000.083,00');
assert(!hugeBug.valid, 'Alimentação R$ 5.000.083,00 deve ser INVÁLIDA (bug prevented!)');
assert(!!hugeBug.errorMessage, 'Alimentação R$ 5.000.083,00 deve ter mensagem de erro explicativa');

// Hospedagem: limite maior (R$ 5000), warning threshold em R$ 800
const hotelOk = validateExpenseValue('hospedagem', '800,00');
assert(hotelOk.valid, 'Hospedagem R$ 800,00 deve ser válida');
// warning é para valores > 800 (estritamente maior), então 800 não dispara
assert(!hotelOk.warning, 'Hospedagem R$ 800,00 (no limite do warning) não dispara warning');

const hotelWarning = validateExpenseValue('hospedagem', '801,00');
assert(hotelWarning.valid, 'Hospedagem R$ 801,00 deve ser válida');
assert(hotelWarning.warning, 'Hospedagem R$ 801,00 (acima do warning threshold) deve ter warning');

const hotelMax = validateExpenseValue('hospedagem', '4500,00');
assert(hotelMax.valid, 'Hospedagem R$ 4500,00 deve ser válida (dentro do limite de R$ 5000)');
assert(hotelMax.warning, 'Hospedagem R$ 4500,00 deve ter warning');

const hotelInvalid = validateExpenseValue('hospedagem', '6000,00');
assert(!hotelInvalid.valid, 'Hospedagem R$ 6000,00 deve ser INVÁLIDA (acima do limite)');

// Tipo desconhecido deve usar limites "outros"
const unknown = validateExpenseValue('tipo_desconhecido', '5000,00');
assert(unknown.valid, 'Tipo desconhecido R$ 5000,00 deve ser válida (usa limites "outros")');

console.log('\n=== Testes de validateTotalValue ===\n');

const totalOk = validateTotalValue('1500,00');
assert(totalOk.valid, 'Total R$ 1500,00 deve ser válido');
assert(!totalOk.warning, 'Total R$ 1500,00 não deve ter warning');

const totalWarning = validateTotalValue('30000,00');
assert(totalWarning.valid, 'Total R$ 30000,00 deve ser válido');
assert(totalWarning.warning, 'Total R$ 30000,00 deve ter warning (acima de 50% do limite)');

const totalInvalid = validateTotalValue('60000,00');
assert(!totalInvalid.valid, 'Total R$ 60000,00 deve ser INVÁLIDO (acima do limite máximo)');
assert(!!totalInvalid.errorMessage, 'Total R$ 60000,00 deve ter mensagem de erro');

console.log('\n=== Testes de validateExpenseDate ===\n');

// Data de hoje deve ser válida
const today = getTodayDateString();
const todayDate = validateExpenseDate(today);
assert(todayDate.valid, `Data de hoje (${today}) deve ser válida`);

// Data no futuro deve ser inválida
const futureDate = '2099-12-31';
const future = validateExpenseDate(futureDate);
assert(!future.valid, 'Data futura (2099-12-31) deve ser inválida');
assert(!!future.errorMessage, 'Data futura deve ter mensagem de erro');

// Data muito antiga (mais de 1 ano) deve ser inválida
const oldDate = '2020-01-01';
const old = validateExpenseDate(oldDate);
assert(!old.valid, 'Data muito antiga (2020-01-01) deve ser inválida');

// Data vazia deve ser inválida
const empty = validateExpenseDate('');
assert(!empty.valid, 'Data vazia deve ser inválida');

console.log('\n=== Resumo dos Limites ===\n');

Object.entries(EXPENSE_TYPE_LIMITS).forEach(([tipo, limit]) => {
  console.log(`  ${limit.label}: máximo R$ ${formatBRLValue(limit.max)}, aviso em R$ ${formatBRLValue(limit.warningThreshold)}`);
});
console.log(`  Total máximo por solicitação: R$ ${formatBRLValue(MAX_TOTAL_REIMBURSEMENT)}`);

console.log(`\n=== Resultado: ${passed} passaram, ${failed} falharam ===\n`);

if (failed > 0) {
  process.exit(1);
}
