# Módulo de Férias — Guia do Desenvolvedor

Documentação do fluxo de solicitação, aprovação, notificações e PDFs do módulo de férias (v5.27.x).

## Visão Geral

O módulo cobre o ciclo completo de férias:

```
Colaborador (/ferias)
    → POST /api/leave/requests (validação de antecedência)
    → Notificações (líder, RH, lista DP, colaborador)
    → Aprovação em etapas (líder → gerente → final)
    → PDF comprovante / formulário em branco
```

Configurações administrativas ficam em `/admin/leave-settings` e são persistidas em `app_secrets`.

## Configuração

### Painel Admin (`/admin/leave-settings`)

| Campo | Chave `app_secrets` | Default | Descrição |
|-------|---------------------|---------|-----------|
| E-mail do RH | `HR_EMAIL` | `rh@groupabz.com` | Destinatário principal |
| E-mails adicionais | `LEAVE_EXTRA_NOTIFY_EMAILS` | — | Lista separada por vírgula (DP, fiscais, etc.) |
| Prazo de antecedência | `LEAVE_ADVANCE_NOTICE_DAYS` | `40` | Dias mínimos antes do início |

### Camadas de fallback (`src/lib/leaveConfig.ts`)

1. Banco (`app_secrets`) — configurável via admin
2. Variável de ambiente (`LEAVE_ADVANCE_NOTICE_DAYS`, `LEAVE_EXTRA_NOTIFY_EMAILS`)
3. Constante hardcoded (`DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS = 40`)

Após escrita no admin, `clearCredentialCache()` invalida o cache (TTL 1 min em `secure-credentials.ts`).

### Funções principais

```typescript
import {
  getAdvanceNoticeDays,
  getLeaveNotificationRecipients,
  validateLeaveAdvanceNoticeAsync,
  getMinLeaveStartDateAsync,
} from '@/lib/leaveConfig';
```

| Função | Uso |
|--------|-----|
| `getAdvanceNoticeDays()` | Prazo efetivo (async, lê banco) |
| `getLeaveNotificationRecipients()` | RH + lista adicional (sem duplicatas) |
| `validateLeaveAdvanceNoticeAsync(date)` | Validação server-side |
| `getMinLeaveStartDateAsync()` | Data mínima para input `type="date"` |

> Versões síncronas (`LEAVE_ADVANCE_NOTICE_DAYS`, `validateLeaveAdvanceNotice`) estão `@deprecated` — preferir async.

## API Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/leave/config` | Usuário | Prazo + data mínima (`Cache-Control: no-store`) |
| `POST` | `/api/leave/requests` | Usuário | Criar solicitação |
| `GET` | `/api/leave/[id]/pdf` | ACL | Comprovante PDF de solicitação existente |
| `GET` | `/api/leave/form-pdf` | Usuário | Formulário em branco |
| `GET/POST` | `/api/admin/leave-settings` | Admin | Ler/gravar configurações globais |
| `GET/POST` | `/api/admin/leave-requests` | Admin | Gestão de solicitações |
| `GET/POST` | `/api/admin/leave-approvals` | Manager+ | Aprovações |

### Erro de antecedência insuficiente

`POST /api/leave/requests` retorna `400` quando a data viola o prazo:

```json
{
  "error": "...",
  "code": "INSUFFICIENT_ADVANCE_NOTICE",
  "minDate": "2026-08-23",
  "requiredDays": 40
}
```

## Notificações (`src/services/leaveNotifications.ts`)

**Princípio (v5.27.2+)**: todos os destinatários configurados (RH + lista adicional) recebem e-mail em **todas** as etapas:

- Nova solicitação
- Avanço líder → gerente
- Aprovação final
- Rejeição

O colaborador também é notificado em cada etapa relevante. Líder/gerente recebem apenas quando é sua vez de aprovar.

### Templates ABZ (`src/lib/emailTemplates.ts`)

| Template | Evento |
|----------|--------|
| `leaveRequestCreatedTemplate` | Confirmação ao colaborador |
| `leaveNewRequestNotificationTemplate` | Nova solicitação para RH/DP |
| `leavePendingManagerTemplate` | Pendência para aprovador |
| `leaveApprovedTemplate` | Aprovação ao colaborador |
| `leaveRejectedTemplate` | Rejeição ao colaborador |
| `leaveApprovalPendingTemplate` | Aprovação parcial |

Destinatários globais vêm de `getLeaveNotificationRecipients()`.

## PDFs (`src/lib/leavePDFGenerator.ts`)

Dois tipos de documento no padrão visual ABZ (logo, header azul, tabelas):

1. **Comprovante** — dados de uma solicitação existente
2. **Formulário em branco** — impressão/preenchimento manual

### Download na UI

| Página | Botão |
|--------|-------|
| `/ferias` | "Formulário" (header) + "Comprovante" por solicitação |
| `/admin/leave-requests` | "Comprovante (PDF)" no modal de detalhes |

## Frontend (`src/app/ferias/page.tsx`)

No mount, carrega `GET /api/leave/config` e aplica:

- Atributo `min` no input de data de início
- Banner âmbar com prazo e data mínima permitida
- Validação client-side antes do submit

## ACL e Permissões

- Módulo registrado como `ferias` no sistema ACL
- Admins têm acesso global às solicitações
- JWT obrigatório em todas as rotas de férias (v5.21.0+)

## Testes

```bash
npx tsx scripts/test-leave-advance-notice.ts
```

Cobre constantes, funções async, validação de antecedência e `getLeaveNotificationRecipients()`.

## Pitfalls Comuns

| Problema | Solução |
|----------|---------|
| Prazo não atualiza após mudança no admin | Cache de credenciais — aguardar TTL (1 min) ou reiniciar; admin chama `clearCredentialCache` |
| Data off-by-one | Parser usa meio-dia local (`12:00:00`) para evitar timezone |
| `advanceNoticeDays = 0` rejeitado | Corrigido em v5.28.0 — aceita `>= 0` |
| E-mails extras não recebem rejeição | Verificar v5.27.2+ — todas as etapas notificam a lista |

## Arquivos Relacionados

- `src/lib/leaveConfig.ts` — regras de negócio centralizadas
- `src/services/leaveService.ts` — CRUD e config por setor
- `src/lib/ia/registry/definitions/ferias.tools.ts` — ferramentas IA
- `CHANGELOG.md` — v5.27.0 a v5.28.0
