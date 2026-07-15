## Reembolso — Fluxo de emails (aprovação / fiscal)

- **Listas no admin** (`/admin/reimbursement-settings`)
  - Aprovadores `@groupabz.com` (`recipients`) — add/remove livre
  - Aprovadores outros domínios (`externalRecipients`) — add/remove livre
  - Financeiro/fiscal pagamento (`financeEmails`) — add/remove livre (mín. 1)

- **Verificação**
  - `npx tsx scripts/test-reimbursement-email-routing.ts`
  - Salvar configs no admin e criar reembolso groupabz vs externo
