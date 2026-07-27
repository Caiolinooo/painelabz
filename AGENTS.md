# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

- **Reembolso emails**: três listas no admin — `recipients` (@groupabz.com), `externalRecipients` (outros domínios), `financeEmails` (pós-aprovação/pago). Ver `src/app/api/reembolso/AGENTS.md`.
- **Secrets / credenciais**: nunca hardcodar senhas, app passwords, JWT secrets ou fallbacks reais em código, docs ou scripts. Usar `src/lib/email-env.ts`, `src/lib/jwt-secret.ts`, `WKRADAR_DEFAULT_PASSWORD`. CI: Gitleaks (`.gitleaks.toml`). Incidentes de exposição: seguir `tasks.md` + `SECURITY.md`.
- **Email no portal**: admin em `/admin/email-settings`; `app_secrets` (senha AES); runtime DB → env; transporte `smtp` | `graph` | `auto` (O365 com erro 535 → preferir Graph + `MS_GRAPH_*`). Ver `src/app/api/admin/email-settings/AGENTS.md`.
- **IA Graph**: extrair dados conforme solicitação do usuário (filtros + `limite=0` até hard cap 1000). KPIs com pendências disparam scan e-mail/Teams. Ver `src/lib/ia/AGENTS.md`.
- **IA Companion**: global em todos os módulos; STM em `localStorage` (limpa só no logout); LTM `ia_user_memory` (persiste); skills procedurais `ia_user_skills` (Hermes Agent–like, persistem); FAB pinwheel. Navegação: nunca prometer abrir módulo sem `NAVIGATE` (`isTourIntent` / `ensureNavigationCommand`; tour → `/dashboard`; kpi → `/kpi`). Quadro branco KPI: `ia_kpi_boards` + harness por role (`kpi-board-harness.ts`) — ADMIN livre (`html_sandbox`); USER/MANAGER só trabalho; tools board (criar/atualizar/listar/abrir/**excluir**/excluir_todos) + `OPEN_KPI_BOARD` → `/kpi` (nunca “salve .html” / dump HTML fora do portal; nunca dizer que delete é indisponível). Cards IA: `normalizeWidgetData` (KPI + chat + Companion); resolve `dataSource` no refresh `/kpi`. Ver `src/lib/ia/AGENTS.md`.
- **Deploy / hosting**: produção e previews no **Vercel** apenas. Não usar Netlify (legado); ao falar de deploy, env vars, cron ou build, referir Vercel.

## Child DOX Index

- `src/app/api/reembolso/AGENTS.md` — fluxo de emails e status de reembolso
- `src/app/api/admin/email-settings/AGENTS.md` — credenciais SMTP no admin (app_secrets)
- `src/app/api/gestao-tripulantes/AGENTS.md` — ASO identity gate, e-Social sync, Man Schedule tipos/cores/observações
- `src/lib/ia/AGENTS.md` — tools LLM, Graph, Companion (`portal-navigation` fuzzy + IA real)

## Index of Modules

