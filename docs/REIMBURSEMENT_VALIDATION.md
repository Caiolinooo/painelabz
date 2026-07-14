# Reembolso — Validação Inteligente de Valores

Documentação do módulo `src/lib/reimbursementValidation.ts` (v5.27.0+).

## Problema Resolvido

O antigo "formato bancário" do input de valor causava erros graves:

- Digitar `50` virava `R$ 0,50` (esperava-se `R$ 50,00`)
- Digitar `5000,83` podia virar `R$ 5.000.083,00`
- Despesas de alimentação com valores absurdos eram aceitas sem alerta

A validação inteligente substitui esse comportamento por entrada decimal intuitiva (`50,83` → `R$ 50,83`) com limites por categoria.

## Arquitetura

```
CurrencyInput (formatDecimalInput)
    ↓
MultipleExpenses / ReimbursementForm
    ↓ validateExpenseValue, validateTotalValue, validateExpenseDate
src/lib/schema.ts (Zod)
    ↓
POST /api/reembolso/create
    ↓ validação server-side (mesmas funções)
```

Validação é **compartilhada** entre frontend, schema Zod e API — nunca duplicar regras inline.

## Limites por Tipo

| Tipo (`tipoReembolso`) | Máximo (R$) | Aviso acima de (R$) |
|------------------------|-------------|---------------------|
| `alimentacao` | 2.000 | 200 |
| `transporte` | 1.000 | 300 |
| `hospedagem` | 5.000 | 800 |
| `combustivel` | 1.000 | 300 |
| `material` | 5.000 | 1.000 |
| `outros` | 10.000 | 2.000 |

Constantes em `EXPENSE_TYPE_LIMITS`. Tipos desconhecidos caem em `outros`.

### Limites globais

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `MAX_TOTAL_REIMBURSEMENT` | R$ 50.000 | Total máximo por solicitação |
| `MIN_EXPENSE_VALUE` | R$ 0,01 | Valor mínimo por despesa |

## Funções Públicas

```typescript
import {
  parseCurrencyValue,
  formatBRLValue,
  validateExpenseValue,
  validateTotalValue,
  validateExpenseDate,
  getTodayDateString,
  EXPENSE_TYPE_LIMITS,
  EXPENSE_TYPES,
} from '@/lib/reimbursementValidation';
```

### `parseCurrencyValue(value)`

Aceita múltiplos formatos:

| Entrada | Resultado |
|---------|-----------|
| `"1.234,56"` | `1234.56` |
| `"1234.56"` | `1234.56` |
| `"R$ 50,83"` | `50.83` |
| `50.83` (number) | `50.83` |

### `validateExpenseValue(tipo, valor)`

Retorna `ExpenseValidationResult`:

```typescript
{
  valid: boolean;      // false se acima do máximo
  warning: boolean;    // true se acima do warningThreshold mas dentro do max
  errorMessage?: string;
  warningMessage?: string;
  limit: ExpenseTypeLimit;
}
```

### `validateExpenseDate(dateString)`

- Rejeita datas futuras
- Rejeita datas com mais de 1 ano
- Usa meio-dia local para evitar off-by-one de timezone

## UX no Formulário

### `CurrencyInput` — modo decimal

- `50,83` → `R$ 50,83` (não mais formato bancário)
- `inputMode="decimal"` para teclado numérico mobile
- Normalização no blur

### `MultipleExpenses`

- Banner vermelho: valor acima do limite máximo (bloqueia submit)
- Banner amarelo + botão "Confirmar valor": acima do típico mas dentro do limite
- Limite da categoria exibido abaixo do seletor de tipo
- Dica sem exemplos numéricos confusos (v5.27.2)

### `ReimbursementForm`

- Input de data com `max={getTodayDateString()}`
- Total enviado ao backend em formato pt-BR (`1.234,56`)

## Integração Server-Side

`src/app/api/reembolso/create/route.ts` valida cada despesa:

```typescript
const validation = validateExpenseValue(expense.tipoReembolso, expense.valor);
if (!validation.valid) {
  return NextResponse.json({ error: validation.errorMessage }, { status: 400 });
}
```

O schema Zod em `src/lib/schema.ts` aplica as mesmas regras no parse.

## Ajustar Limites

Edite `EXPENSE_TYPE_LIMITS` em `src/lib/reimbursementValidation.ts`. Não há painel admin para limites — mudanças exigem deploy.

Para adicionar um novo tipo:

1. Adicionar entrada em `EXPENSE_TYPE_LIMITS`
2. Adicionar em `EXPENSE_TYPES` (select do formulário)
3. Atualizar traduções se necessário
4. Rodar testes

## Testes

```bash
npx tsx scripts/test-reimbursement-validation.ts
```

42 testes cobrindo parsing, formatação, validação por tipo, total e datas.

## Pitfalls Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Valor interpretado errado | Formato bancário legado | Confirmar `formatDecimalInput` no `CurrencyInput` |
| Data futura aceita no calendário | `max` não forwardado | `InputField` deve passar `max`/`min` ao `<input>` |
| Warning não bloqueia mas confunde usuário | Comportamento intencional | Valores altos legítimos exigem confirmação explícita |
| DELETE 404 por protocolo | UUID vs protocolo | v5.28.0 — `DELETE /api/reembolso/[id]` aceita ambos |

## Arquivos Relacionados

- `src/components/MultipleExpenses.tsx` — validação inline + banners
- `src/components/ReimbursementForm.tsx` — formulário principal
- `src/components/CurrencyInput.tsx` — input decimal
- `docs/REIMBURSEMENT_EMAIL_SETUP.md` — configuração de e-mails (separado)
