/**
 * Teste rápido para validar a lógica de antecedência de 40 dias do
 * módulo de férias (solicitação do DP).
 *
 * Executar com: npx tsx scripts/test-leave-advance-notice.ts
 */

import {
  LEAVE_ADVANCE_NOTICE_DAYS,
  getMinLeaveStartDate,
  validateLeaveAdvanceNotice,
  formatDatePTBR,
  getCarlosGalloEmail,
  getLeaveExtraNotifyEmails
} from '../src/lib/leaveConfig';

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

console.log('\n=== Configuração ===\n');

assert(LEAVE_ADVANCE_NOTICE_DAYS === 40, `LEAVE_ADVANCE_NOTICE_DAYS deve ser 40 (recebido: ${LEAVE_ADVANCE_NOTICE_DAYS})`);

console.log('\n=== Testes de getMinLeaveStartDate ===\n');

const minDate = getMinLeaveStartDate(new Date('2026-07-03T12:00:00'));
console.log(`  Data mínima calculada para 2026-07-03: ${minDate}`);
assert(minDate === '2026-08-12', `40 dias após 2026-07-03 deve ser 2026-08-12 (recebido: ${minDate})`);

console.log('\n=== Testes de validateLeaveAdvanceNotice ===\n');

// Data com exatamente 40 dias de antecedência deve ser válida
const exactly40 = validateLeaveAdvanceNotice('2026-08-12', new Date('2026-07-03T12:00:00'));
assert(exactly40.valid, 'Data com exatamente 40 dias de antecedência deve ser válida');

// Data com 39 dias deve ser inválida
const only39 = validateLeaveAdvanceNotice('2026-08-11', new Date('2026-07-03T12:00:00'));
assert(!only39.valid, 'Data com 39 dias deve ser inválida');
assert(!!only39.errorMessage, 'Data com 39 dias deve ter mensagem de erro');
assert(!!only39.minDate, 'Data inválida deve retornar minDate sugerida');

// Data com mais de 40 dias deve ser válida
const moreThan40 = validateLeaveAdvanceNotice('2026-12-25', new Date('2026-07-03T12:00:00'));
assert(moreThan40.valid, 'Data com 175 dias de antecedência deve ser válida');

// Data no passado deve ser inválida
const past = validateLeaveAdvanceNotice('2020-01-01', new Date('2026-07-03T12:00:00'));
assert(!past.valid, 'Data no passado deve ser inválida');

// Data vazia deve ser inválida
const empty = validateLeaveAdvanceNotice('');
assert(!empty.valid, 'Data vazia deve ser inválida');

// Data inválida deve ser inválida
const invalid = validateLeaveAdvanceNotice('not-a-date');
assert(!invalid.valid, 'String inválida deve retornar inválido');

console.log('\n=== Testes de formatDatePTBR ===\n');

assert(formatDatePTBR('2026-08-12') === '12/08/2026', '2026-08-12 deve formatar como 12/08/2026');
assert(formatDatePTBR('') === '', 'Data vazia deve retornar string vazia');
assert(formatDatePTBR('invalid') === 'invalid', 'Data inválida deve retornar como veio');

console.log('\n=== Testes de getCarlosGalloEmail ===\n');

async function runAsyncTests() {
  const carlosEmail = await getCarlosGalloEmail();
  console.log(`  Email do Carlos Gallo (fallback): ${carlosEmail}`);
  assert(carlosEmail === 'carlos.gallo@groupabz.com', `Email default deve ser carlos.gallo@groupabz.com (recebido: ${carlosEmail})`);

  console.log('\n=== Testes de getLeaveExtraNotifyEmails ===\n');

  const extras = await getLeaveExtraNotifyEmails();
  console.log(`  Emails extras: ${extras.join(', ')}`);
  assert(extras.length >= 1, 'Deve retornar pelo menos 1 email (Carlos Gallo)');
  assert(extras.includes('carlos.gallo@groupabz.com'), 'Deve incluir o email do Carlos Gallo');

  console.log(`\n=== Resultado: ${passed} passaram, ${failed} falharam ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAsyncTests().catch(err => {
  console.error('Erro ao executar testes async:', err);
  process.exit(1);
});
