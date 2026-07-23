import {
  getDefaultReimbursementEmailSettings,
  normalizeReimbursementEmailSettings,
  resolveFinancePaymentRecipients,
  resolveInitialApprovalRecipients,
} from '../src/lib/reimbursement-email-routing';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

console.log('Testing reimbursement email routing...');

const defaults = getDefaultReimbursementEmailSettings();
assertEqual(defaults.recipients, ['andresa.oliveira@groupabz.com'], 'default recipients = Andresa');
assertEqual(defaults.externalRecipients, ['fiscal@groupabz.com'], 'default external = fiscal');
assertEqual(defaults.financeEmails, ['fiscal@groupabz.com'], 'default finance = fiscal');

// groupabz → Andresa na criação
assertEqual(
  resolveInitialApprovalRecipients('andresa.oliveira@groupabz.com', defaults),
  ['andresa.oliveira@groupabz.com'],
  'groupabz creation → Andresa'
);

// externo → externalRecipients
assertEqual(
  resolveInitialApprovalRecipients('fornecedor@empresa.com', defaults),
  ['fiscal@groupabz.com'],
  'external creation → externalRecipients'
);

// pós-aprovação → finance sempre
assertEqual(
  resolveFinancePaymentRecipients(defaults),
  ['fiscal@groupabz.com'],
  'after approval → finance'
);

// Listas independentes
const custom = {
  enableDomainRule: true,
  recipients: ['andresa.oliveira@groupabz.com', 'gestor@groupabz.com'],
  externalRecipients: ['fiscal@groupabz.com', 'logistica@groupabz.com'],
  financeEmails: ['fiscal@groupabz.com', 'financeiro@outro.com'],
};
assertEqual(
  resolveInitialApprovalRecipients('user@groupabz.com', custom),
  ['andresa.oliveira@groupabz.com', 'gestor@groupabz.com'],
  'custom groupabz recipients'
);
assertEqual(
  resolveInitialApprovalRecipients('ext@other.com', custom),
  ['fiscal@groupabz.com', 'logistica@groupabz.com'],
  'custom external recipients'
);
assertEqual(
  resolveFinancePaymentRecipients(custom),
  ['fiscal@groupabz.com', 'financeiro@outro.com'],
  'custom finance recipients'
);

// Normaliza config legada sem externalRecipients
const legacy = normalizeReimbursementEmailSettings({
  enableDomainRule: true,
  recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com'],
  financeEmails: ['financeiro@groupabz.com'],
});
assertEqual(legacy.recipients, ['andresa.oliveira@groupabz.com'], 'legacy: fiscal removed from recipients');
assert(legacy.financeEmails.includes('fiscal@groupabz.com'), 'legacy: fiscal in financeEmails');
assert(!legacy.financeEmails.includes('financeiro@groupabz.com'), 'legacy: financeiro@ replaced');
assert(legacy.externalRecipients.length > 0, 'legacy: externalRecipients filled');

// Regra de domínio desligada → external mesmo para groupabz
assertEqual(
  resolveInitialApprovalRecipients('caio.correia@groupabz.com', {
    enableDomainRule: false,
    recipients: ['andresa.oliveira@groupabz.com'],
    externalRecipients: ['fiscal@groupabz.com'],
    financeEmails: ['pago@groupabz.com'],
  }),
  ['fiscal@groupabz.com'],
  'domain rule off → external for groupabz too'
);

console.log('All reimbursement email routing tests passed.');
