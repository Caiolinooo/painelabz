# Employee Hub — DOX

## Purpose

Ponto único de leitura do colaborador no portal: `gt_*` + usuário (`users_unified`) + férias + reembolsos + e-Social.

## Ownership

- `src/lib/employee-hub/employee-hub-service.ts`
- `src/app/api/employee-hub/`

## Local Contracts

- Join por `gt_colaboradores.id`, `user_id` ou CPF dígitos.
- Documentos: validade civil + papel vigente/histórico (`validade-civil.ts` / `documentos-alertas.ts`).
- Módulos externos (`leave_requests`, `reembolsos`) são fail-soft: tabela ausente ou erro → lista vazia.
- GET `/api/employee-hub/[id]` devolve o record plano (não `{ data }`).
- UI: aba **Ficha unificada** no `CollaboratorModal`.

## Work Guidance

- Novos módulos com vínculo de colaborador entram aqui; não criar segundo hub.

## Verification

- `npx tsx scripts/verify-docs-alertas.ts` → `DOCS_ALERTAS_VERIFY_OK`
- Abrir perfil com KPI > 0 cai na ficha e lista o documento vigente vencido.

## Child DOX Index

_(none)_
