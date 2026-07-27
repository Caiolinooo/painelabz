# IA Tools — DOX

## Purpose

Ferramentas LLM do portal (`tools.ts`, cliente Microsoft Graph, geradores Excel/PDF, sinais KPI via e-mail/Teams). Contrato de extração sob demanda + registry modular (Fase 3).

## Ownership

- `src/lib/ia/tools.ts` — caminho ativo do chat (`executeToolCall`)
- `src/lib/ia/microsoft/client.ts` — Graph (paginação, filtros, Teams search)
- `src/lib/ia/kpi-comms-signals.ts` — scan e-mail/Teams correlato a pendências/conclusões
- `src/lib/ia/registry/` — modules + bridge no `default` de `executeToolCall`
- `src/lib/ia/portal-action-bus.ts` + `/api/ia/companion` — navegação Companion

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

## Work Guidance

- Não hardcodar `$top=5` em Graph
- Escala MIO read-only; calendário write no portal (+ Outlook opcional)
- Companion: preferir `commands` tipados (`NAVIGATE` / `HIGHLIGHT_ELEMENT`)

## Verification

- KPI com pendências → bloco `comunicacao.email_sinais` / `teams_sinais`
- USER chama `meus_emails` → só a própria mailbox
- `navegar_portal` destino `ferias` → `commands[0].target` `/ferias`
- Registry bridge: tool só no registry ainda responde via `executeToolCall`

## Child DOX Index

_(none)_
