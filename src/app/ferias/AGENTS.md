# Férias — DOX

## Purpose

Módulo de solicitações de férias (`/ferias`): criação, aprovação por setor, histórico (anos/status passados), exportação XLSX/CSV e download do formulário PDF preenchido.

## Ownership

- UI: `src/app/ferias/page.tsx`
- Admin: `src/app/admin/leave-requests/page.tsx`, `leave-settings`, `leave-approvals`
- APIs: `src/app/api/leave/**`, `src/app/api/admin/leave-*`
- Serviços: `src/services/leaveService.ts`, `leaveNotifications.ts`
- PDF: `src/lib/leavePDFGenerator.ts` + `GET /api/leave/[id]/pdf` (preenchido) + `GET /api/leave/form-pdf` (branco)
- Export: `src/lib/leaveExport.ts`
- IA: `buscar_ferias` / `buscar_ferias_global` em `src/lib/ia/tools.ts` (+ registry `ferias.tools.ts`)

## Local Contracts

### Histórico

- Listagens **não** filtram só futuro: incluem aprovadas/rejeitadas/canceladas/passadas
- Filtros UI: **status** + **ano** (gozo = `start_date`)
- Minhas solicitações: default “Todos os status” + “Todos os anos”
- Aprovadores: aba **Histórico da equipe** (`?history=1` em leave-approvals)
- Admin: `GET /api/admin/leave-requests` com `status`, `year`, `limit` (default 500)

### Extração / formulários

- Export XLSX/CSV do conjunto filtrado (colaborador, datas, status, períodos, abono, 13º, observações, datas criação/atualização)
- **Detalhes** → prévia do formulário preenchido + botão **Baixar PDF** → `GET /api/leave/[id]/pdf` (mesmo gerador ABZ, dados reais + líder/gerente do setor)
- Histórico antigo também gera PDF preenchido (mesmo endpoint)
- Formulário em branco: `GET /api/leave/form-pdf`
- Preenchimento PDF: CPF ← `users_unified.tax_id`; cargo ← `position`; setor ← `sectors.name` (fallback `department`); nome ← `name` ou `first_name`+`last_name`; duração recalculada se `periods[].duration` ausente; líder/gerente ← `leave_sector_configs`; **não** há colunas `leader_approved_at`/`manager_approved_at` em `leave_requests` (datas de aprovação ficam “—” até existir audit trail)

### RBAC

- USER: próprias solicitações
- Líder/gerente de setor: fila + histórico do(s) setor(es)
- ADMIN / ACL `ferias:admin|manage|read`: todas; PDF para owner, approver do setor, admin/ACL

### IA Companion

- `buscar_ferias`: default = usuário logado; `ano`, `status`, `incluir_historico` (default true), `limite`
- `buscar_ferias_global`: mesmos filtros + RBAC equipe/global; status DB reais (`PENDING_*` / `APPROVED` / …)

## Work Guidance

- Não inventar segundo UX de formulário: reutilizar `leavePDFGenerator` + Detalhes
- Status DB: `PENDING_LEADER` | `PENDING_MANAGER` | `APPROVED` | `REJECTED` | `CANCELLED`
- Antecedência: `leaveConfig` / `/api/leave/config`

## Verification

- `/ferias` → filtrar ano passado → vê aprovadas/gozadas
- Detalhes (Todas as Solicitações) → prévia + Baixar PDF com nome/datas/status
- Export XLSX/CSV com filtro aplicado
- Companion: “férias do ano passado” → `buscar_ferias` com `ano`

## Child DOX Index

_(none)_
