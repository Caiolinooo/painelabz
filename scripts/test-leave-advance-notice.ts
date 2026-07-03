/**
 * Teste rápido para validar a lógica de antecedência (40 dias default) do
 * módulo de férias (solicitação do DP), e as funções async que leem do
 * banco de dados (configuráveis via painel admin).
 *
 * Executar com: npx tsx scripts/test-leave-advance-notice.ts
 */

import {
  DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS,
  LEAVE_ADVANCE_NOTICE_DAYS,
  LEAVE_ADVANCE_NOTICE_DAYS_KEY,
  CARLOS_GALLO_EMAIL_KEY,
  LEAVE_EXTRA_NOTIFY_EMAILS_KEY,
  getAdvanceNoticeDays,
  getMinLeaveStartDate,
  getMinLeaveStartDateAsync,
  validateLeaveAdvanceNotice,
  validateLeaveAdvanceNoticeAsync,
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

console.log('\n=== Configuração (constantes) ===\n');

assert(DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS === 40, `DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS deve ser 40 (recebido: ${DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS})`);
assert(LEAVE_ADVANCE_NOTICE_DAYS_KEY === 'LEAVE_ADVANCE_NOTICE_DAYS', `LEAVE_ADVANCE_NOTICE_DAYS_KEY deve ser 'LEAVE_ADVANCE_NOTICE_DAYS'`);
assert(CARLOS_GALLO_EMAIL_KEY === 'CARLOS_GALLO_EMAIL', `CARLOS_GALLO_EMAIL_KEY deve ser 'CARLOS_GALLO_EMAIL'`);
assert(LEAVE_EXTRA_NOTIFY_EMAILS_KEY === 'LEAVE_EXTRA_NOTIFY_EMAILS', `LEAVE_EXTRA_NOTIFY_EMAILS_KEY deve ser 'LEAVE_EXTRA_NOTIFY_EMAILS'`);

console.log('\n=== Testes de getMinLeaveStartDate (sync, fallback) ===\n');

const minDate = getMinLeaveStartDate(new Date('2026-07-03T12:00:00'));
console.log(`  Data mínima calculada para 2026-07-03: ${minDate}`);
assert(minDate === '2026-08-12', `40 dias após 2026-07-03 deve ser 2026-08-12 (recebido: ${minDate})`);

console.log('\n=== Testes de validateLeaveAdvanceNotice (sync, fallback) ===\n');

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

console.log('\n=== Testes async (leem do banco com fallback) ===\n');

async function runAsyncTests() {
  // getAdvanceNoticeDays: deve retornar 40 (fallback) quando banco/env não têm
  const advanceDays = await getAdvanceNoticeDays();
  console.log(`  getAdvanceNoticeDays() (fallback): ${advanceDays}`);
  assert(advanceDays === 40, `getAdvanceNoticeDays deve retornar 40 no fallback (recebido: ${advanceDays})`);

  // getMinLeaveStartDateAsync: deve retornar 40 dias no futuro
  const minDateAsync = await getMinLeaveStartDateAsync(new Date('2026-07-03T12:00:00'));
  console.log(`  getMinLeaveStartDateAsync() (fallback): ${minDateAsync}`);
  assert(minDateAsync === '2026-08-12', `getMinLeaveStartDateAsync deve retornar 2026-08-12 (recebido: ${minDateAsync})`);

  // validateLeaveAdvanceNoticeAsync: deve retornar requiredDays
  const asyncValidation = await validateLeaveAdvanceNoticeAsync('2026-08-11', new Date('2026-07-03T12:00:00'));
  assert(!asyncValidation.valid, 'validateLeaveAdvanceNoticeAsync deve rejeitar 39 dias');
  assert(asyncValidation.requiredDays === 40, 'validateLeaveAdvanceNoticeAsync deve retornar requiredDays=40');

  const asyncValid = await validateLeaveAdvanceNoticeAsync('2026-12-25', new Date('2026-07-03T12:00:00'));
  assert(asyncValid.valid, 'validateLeaveAdvanceNoticeAsync deve aceitar 175 dias');
  assert(asyncValid.requiredDays === 40, 'validateLeaveAdvanceNoticeAsync deve retornar requiredDays=40 mesmo quando válido');

  // Email do Carlos Gallo (fallback)
  const carlosEmail = await getCarlosGalloEmail();
  console.log(`  Email do Carlos Gallo (fallback): ${carlosEmail}`);
  assert(carlosEmail === 'carlos.gallo@groupabz.com', `Email default deve ser carlos.gallo@groupabz.com (recebido: ${carlosEmail})`);

  // Emails extras (deve incluir Carlos Gallo)
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
