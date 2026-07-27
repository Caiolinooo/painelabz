# IA Tools — DOX

## Purpose

Ferramentas LLM do portal (`tools.ts`, cliente Microsoft Graph, geradores Excel/PDF, sinais KPI via e-mail/Teams, **KPI Quadro Branco**). Contrato de extração sob demanda + registry modular (Fase 3).

## Ownership

- `src/lib/ia/tools.ts` — caminho ativo do chat (`executeToolCall`)
- `src/lib/ia/microsoft/client.ts` — Graph (paginação, filtros, Teams search)
- `src/lib/ia/kpi-comms-signals.ts` — scan e-mail/Teams correlato a pendências/conclusões
- `src/lib/ia/kpi-board.ts` + `kpi-board-shared.ts` + `kpi-board-harness.ts` — CRUD/Zod + **role harness**
- `src/app/api/ia/kpi-boards/route.ts` — list/create/update + resolve dataSources
- `src/app/kpi/page.tsx` + `src/components/KPI/KpiBoardRenderer.tsx` — render allowlisted (+ `html_sandbox` iframe)
- `src/lib/ia/registry/` — modules + bridge no `default` de `executeToolCall`
- `src/lib/ia/portal-action-bus.ts` + `/api/ia/companion` — navegação Companion + `OPEN_KPI_BOARD`
- `src/lib/ia/portal-navigation.ts` — catálogo de rotas, fuzzy/typos, contextos
- `src/lib/ia/user-memory.ts` — LTM `ia_user_memory`
- `src/lib/ia/user-skills.ts` — skills procedurais `ia_user_skills` (Hermes Agent–like)

## Local Contracts

### Graph — extração conforme solicitação

- `limite=0` → até `GRAPH_HARD_CAP` (1000) com `@odata.nextLink`
- Emails: `de`, `para`, `assunto`, datas, pasta, não lidos, anexos, corpo
- Teams: `listTeamsChats(user)`, `searchTeamsMessages(user, consulta)`

### KPIs + comunicação

- `buscar_kpis_sistema`: pendências férias/reembolso/compras/avaliações/EPI; se houver pendências (ou `incluir_comunicacao=true`), varre e-mail+Teams
- `analisar_kpis_negocio`: anomalias vs meta + scan Graph opcional
- `buscar_sinais_kpi_comunicacao`: scan explícito por domínio (`ferias|reembolso|compras|...`)

### KPI Quadro Branco v1 + harness de roles

- Spec Zod em `ia_kpi_boards.spec` — widgets `metric|table|list|chart|markdown|html_sandbox`
- **Harness** (`kpi-board-harness.ts`): enforcement server-side em create/update (tools + API); prompts sozinhos NÃO bastam
  - ADMIN: liberdade máxima; `html_sandbox` (iframe `sandbox="allow-scripts"` **sem** `allow-same-origin`); max 24 widgets; conteúdo experimental OK
  - MANAGER: work-only; max 16; sem sandbox/jogos; dataTools de equipe/ops; markdown sem scripts
  - USER: work-own-only; max 8; só dataTools pessoais; sem sandbox/jogos
- `dataSource.tool` filtrado pelo allowlist do papel; execução ainda RBAC
- Tools: `criar_quadro_kpi`, `atualizar_quadro_kpi`, `listar_quadros_kpi`, `abrir_quadro_kpi`
- `render_dashboard` persiste board + `_metadata.dashboard` + `portalCommands` (`OPEN_KPI_BOARD` + `NAVIGATE /kpi`)
- `/kpi` usa AuthContext `user.id` / `profile.id` (não `abz_user_id` localStorage)
- `html_sandbox`: nunca `dangerouslySetInnerHTML` no origin; CSP no srcdoc; size cap ~100KB
- `ia_dashboard_cache` = summary TTL apenas (não confundir com boards)

### Status corretos

- Férias: `PENDING_LEADER` | `PENDING_MANAGER`
- Reembolso: `pendente` / valor `valorTotal`

### Fase 3 tools (non-admin + write)

- `meus_emails`, `meu_calendario`, `criar_evento_calendario`, `minhas_conversas_teams`, `pesquisar_mensagens_teams`, `navegar_portal`
- Registry: `microsoft.tools`, `calendario.tools`, `chat.tools`, `portal.tools` (inclui board tools)
- Companion (`/api/ia/companion`): IA real + tools; fuzzy nav (`portal-navigation.ts`); commands via `_metadata.portalCommands`; logo `LC1_Azul.png` estável (crop “abz” + label ABZ; motion só em rings/aura via `companion-logo-motion.ts` + `useReducedMotion`)
- Sub-agente `companion` no `agents-router` (ativado por `[ABZ_COMPANION]` / verbos de navegação)

## Work Guidance

- Não hardcodar `$top=5` em Graph
- Escala MIO read-only; calendário write no portal (+ Outlook opcional)
- Companion: global (`CompanionSessionProvider`); STM localStorage limpa no logout; LTM `ia_user_memory` + tools `salvar_memoria_usuario` / `listar_memorias_usuario`; skills `ia_user_skills` + tools `criar_skill_usuario` / `listar_skills_usuario` / `usar_skill` / `esquecer_skill` (persistem; inject no prompt); boards `ia_kpi_boards` + índice no prompt
- FAB = pinwheel colorido `abz-icon-color.png` (float + spin suave, `useReducedMotion`); `fixed` sem `relative`
- Sub-agentes: `rh_tripulantes` / `geral` / `companion` / `analytics` incluem `render_dashboard` + board tools onde aplicável
- Assistant (`/api/ia/chat` stream) vs Companion (`/api/ia/companion` sync): stream envia status inicial; Companion sync + LTM/skills/boards no prompt
- Skills: memória = fatos curtos sempre no contexto; skills = procedimentos mais longos (índice no prompt; corpo via `usar_skill`). Cap ~30/user; sem secrets. Auto-create heurístico + instrução no system prompt.
- **Companion NAVIGATE contract**: nunca prometer navegação sem emitir `NAVIGATE`. Fast-path (`isNavigationIntent` / `isTourIntent` + `resolvePortalNavigation`) + safety net `ensureNavigationCommand` (injeta se reply promete abrir/levar e não há command). Tour → primeiro hop `/dashboard`. Widget despacha `data.commands` (fallback `navigation` high-confidence).
- **KPI board contract**: após criar/atualizar, Companion deve emitir `OPEN_KPI_BOARD` + `NAVIGATE /kpi` (via tools). Não executar JS/HTML no origin do portal (`html_sandbox` = iframe sandboxed).
- **KPI harness**: ADMIN pode minigame/HTML via `html_sandbox` no board; USER/MANAGER → recusar jogos/HTML livre + oferecer widgets de trabalho. Nunca “salve .html” / dump HTML fora do portal.

## Verification

- KPI com pendências → bloco `comunicacao.email_sinais` / `teams_sinais`
- USER chama `meus_emails` → só a própria mailbox
- `navegar_portal` destino `feririas` → `/ferias` (fuzzy)
- `navegar_portal` / `resolvePortalNavigation("kpi")` → `/kpi` (não `/dashboard`)
- Companion "me leva ao dashboard" (ex.: de `/ferias`) → `commands` com `NAVIGATE` `/dashboard`
- Companion "tour pelo portal" / "modulo em modulo" → `NAVIGATE` `/dashboard` imediato (não só texto)
- Companion "me leva ao kpi" → `/kpi`
- Companion "monte um quadro KPI com minhas pendências" → `criar_quadro_kpi` ou `render_dashboard` + `OPEN_KPI_BOARD` + `/kpi` mostra widgets
- Resposta com "vou te levar… Home/Dashboard" sem tool → server injeta `NAVIGATE` via `ensureNavigationCommand`
- Companion pergunta de dados → resposta via LLM+tools (não canned)
- Registry bridge: tool só no registry ainda responde via `executeToolCall`
- FAB Companion: disco branco + crop `LC1_Azul` (“abz”) + label **ABZ**; idle respira, listening radar, speaking pulse, executing arco — logo estático; sem SVG arcs 3 cores / glow roxo
- Skills: `criar_skill_usuario` grava em `ia_user_skills`; índice no prompt; `usar_skill` devolve procedimento; persiste após logout
- Boards: `criar_quadro_kpi` grava em `ia_kpi_boards`; harness rejeita html_sandbox/jogos para non-admin; `/kpi` resolve dataSources allowlisted do papel
- ADMIN: `html_sandbox` renderiza em iframe sandboxed (sem same-origin / sem cookies do portal)

## Child DOX Index

_(none)_
