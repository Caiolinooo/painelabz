# IA Tools — DOX

## Purpose

Ferramentas LLM do portal (`tools.ts`, cliente Microsoft Graph, geradores Excel/PDF, sinais KPI via e-mail/Teams). Contrato de extração sob demanda + registry modular (Fase 3).

## Ownership

- `src/lib/ia/tools.ts` — caminho ativo do chat (`executeToolCall`)
- `src/lib/ia/microsoft/client.ts` — Graph (paginação, filtros, Teams search)
- `src/lib/ia/kpi-comms-signals.ts` — scan e-mail/Teams correlato a pendências/conclusões
- `src/lib/ia/registry/` — modules + bridge no `default` de `executeToolCall`
- `src/lib/ia/portal-action-bus.ts` + `/api/ia/companion` — navegação Companion
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

### Status corretos

- Férias: `PENDING_LEADER` | `PENDING_MANAGER`
- Reembolso: `pendente` / valor `valorTotal`

### Fase 3 tools (non-admin + write)

- `meus_emails`, `meu_calendario`, `criar_evento_calendario`, `minhas_conversas_teams`, `pesquisar_mensagens_teams`, `navegar_portal`
- Registry: `microsoft.tools`, `calendario.tools`, `chat.tools`, `portal.tools`
- Companion (`/api/ia/companion`): IA real + tools; fuzzy nav (`portal-navigation.ts`); commands via `_metadata.portalCommands`; logo `LC1_Azul.png` estável (crop “abz” + label ABZ; motion só em rings/aura via `companion-logo-motion.ts` + `useReducedMotion`)
- Sub-agente `companion` no `agents-router` (ativado por `[ABZ_COMPANION]` / verbos de navegação)

## Work Guidance

- Não hardcodar `$top=5` em Graph
- Escala MIO read-only; calendário write no portal (+ Outlook opcional)
- Companion: global (`CompanionSessionProvider`); STM localStorage limpa no logout; LTM `ia_user_memory` + tools `salvar_memoria_usuario` / `listar_memorias_usuario`; skills `ia_user_skills` + tools `criar_skill_usuario` / `listar_skills_usuario` / `usar_skill` / `esquecer_skill` (persistem; inject no prompt)
- FAB = pinwheel colorido `abz-icon-color.png` (float + spin suave, `useReducedMotion`); `fixed` sem `relative`
- Sub-agentes: `rh_tripulantes` / `geral` / `companion` incluem `render_dashboard`; nomes alinhados (`analisar_kpis_negocio`, `gerar_planilha_excel`)
- Assistant (`/api/ia/chat` stream) vs Companion (`/api/ia/companion` sync): stream envia status inicial; Companion sync + LTM/skills no prompt
- Skills: memória = fatos curtos sempre no contexto; skills = procedimentos mais longos (índice no prompt; corpo via `usar_skill`). Cap ~30/user; sem secrets. Auto-create heurístico + instrução no system prompt.

## Verification

- KPI com pendências → bloco `comunicacao.email_sinais` / `teams_sinais`
- USER chama `meus_emails` → só a própria mailbox
- `navegar_portal` destino `feririas` → `/ferias` (fuzzy)
- Companion pergunta de dados → resposta via LLM+tools (não canned)
- Registry bridge: tool só no registry ainda responde via `executeToolCall`
- FAB Companion: disco branco + crop `LC1_Azul` (“abz”) + label **ABZ**; idle respira, listening radar, speaking pulse, executing arco — logo estático; sem SVG arcs 3 cores / glow roxo
- Skills: `criar_skill_usuario` grava em `ia_user_skills`; índice no prompt; `usar_skill` devolve procedimento; persiste após logout

## Child DOX Index

_(none)_
