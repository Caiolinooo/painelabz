## Calendário — só compartilhado + revamp visual (2026-08-31)

### Objetivo
`/calendario` não deve mostrar embarques, cursos nem outros eventos operacionais (MIO/`gt_*`). Só feriados oficiais + eventos do calendário compartilhado da empresa. Visual alinhado ao portal (cards rounded-2xl, header DP-like).

### Passos
- [x] Remover fetch `/api/mio/calendar` da página
- [x] Revamp UI + atualizar i18n/DOX; ICS do ano via `from`/`to`

---

## GT — lookup criável, KPIs ativos, docs vencidos, viewport dia/semana (2026-08-31)

### Objetivo
1. Cargo / Empresa / Embarcação / Centro de Custo: busca + criar novo (todas as ocorrências da feature).
2. KPIs da Matriz (total / embarcados / back): só colaboradores `ativo=true` e centros de custo ativos.
3. Conferir e corrigir contagem de documentos vencidos (data real + ativos).
4. Man Schedule: checkbox — ligado = grade por dia; desligado = por semana (atual).

### Passos
- [x] Componente lookup compartilhado + APIs POST + trocar selects
- [x] Dashboard GT filtra ativo + CC ativo; docs vencidos por `data_validade`
- [x] Checkbox viewport dia/semana no `GTManScheduleTab`

---

## DP — menu lateral + dados da tabela/ASO (2026-08-31)

### Problemas
- `/department/dp` sem `layout.tsx`/`MainLayout` → tela full-bleed sem menu lateral
- Colunas Cargo/CC/Empresa liam `cargo.nome` mas a API flatten devolve `cargo_nome`
- Aba ASO lia `/auditoria` (todos os docs, join `gt_colaboradores`) e esperava `colaborador` → N/A em massa; status via `new Date(iso)` UTC

### Passos
- [x] `src/app/department/dp/layout.tsx` com `MainLayout`
- [x] `LIST_SELECT`: `ativo`, regime/escala, `centro_custo(codigo)`
- [x] `GET /aso/notificar-vencimentos` + helper `aso-vencimentos.ts` (data local)
- [x] Página DP usa campos achatados; aba ASO com nome/CPF/cargo; fechamento com totais do mês

---

## MIO 100% histórico local (2026-08-26) — HIGHEST PRIORITY

### Objetivo
Uma fonte canônica no **nosso** banco (`gt_*`). Módulos futuros leem só isso — nunca MIO ao vivo, nunca scrape PoliWeb na feature, nunca blob `mio_cache` como verdade da escala.

Contrato: `src/lib/gestao-tripulantes/gt-canonical.ts` (tabela, origem `mio|poliweb|upload|manual|ocr|local`, join CPF/`colaborador_id`).

### Feito
- [x] Inventário READ vs WRITE da API MIO (insomnia `scratch/mio_api_doc.html`)
- [x] Cliente pull-only; `POST /sms-aso` (inclusão) bloqueado; GET probes de ASO allowlisted
- [x] Pull: integrantes qualquer status, treinamentos, ASOs (treino classificado + probe), anexos com retry/`arquivo_ausente`, LGP 1990→+5y (chunk se vazio), extras FI/DBA/STB/OFF-C em `gt_historico_embarques`, afastamentos, entidades (férias/benefício/dependente/sispat/timesheet/turmas)
- [x] Man Schedule lê `gt_historico_embarques` (lazy-load intacto). Select usa `gt_embarcacoes`, nunca coluna inexistente `base`.
- [x] `gt_afastamentos` + `gt_acidentes` criadas no projeto Painel_ABZGroup (migrações do repo não estavam aplicadas).
- [x] Contrato canônico: `src/lib/gestao-tripulantes/gt-canonical.ts` + seção em `src/app/api/gestao-tripulantes/AGENTS.md`.
- [x] PoliWeb permanece ingest (`origem=poliweb`); runtime consulta `gt_documentos_aso`

### Como rodar
```bash
npm run mio:assert-local-first
npm run mio:pull:dry
npm run mio:pull
# ou autenticado: POST /api/gestao-tripulantes/mio/sync
```

### Hard-limits da API MIO (evidência no insomnia + probe em runtime 2026-08-26)

- **ASO lista**: insomnia só documenta `POST /sms-aso` (inclusão — nunca chamado). Probe GET/POST `/sms-aso-get`, `/sms-aso-registro-get`, `/sms-aso`, `/sms-exames-get`, `/sms-exame-registro-get`, `/int-aso-get`, `/sms-atestado-get`, `/sms-saude-get` → **HTTP 404** `{"success":false,"message":"Este EndPoint não existe mais."}`. ASOs canônicos = treino classificado como ASO + upload local + ingest PoliWeb (`origem=poliweb`).
- **LGP histórico antigo**: janela 15 anos OK; chunk `2006-01-01..2010-12-31` → **404**. `lgp_range.apiLimit` grava o cap. Embarques materializados em `gt_historico_embarques` (não `mio_cache`).
- **Afastamentos**: docs têm `GET /sms-afastamento-get`; live → **404**. Tabela `gt_afastamentos` existe para ingest futuro / lançamento local.
- **Benefício / SISPAT / RTPE turma**: live **404** (`/int-integrantes-beneficio-get`, `/lgp-sispat-get`, `/lgp-rtpe-turma-get`). Docs ainda citam max 200 para benefício/dependente/sispat.
- **Férias GET**: 401 após refresh de token (endpoint existe, auth/filtro instável neste pull).
- **Anexos**: insomnia não documenta download binário estável. Sem URL e sem `Contém Anexo?` → `arquivo_ausente=true` + `gt_mio_anexo_misses` (sem 6 GETs). Com flag/URL, tenta os GETs allowlisted.

---

## Poliweb 503 overlay on GT navigation (2026-08-26)

### Problema
- `GET /api/gestao-tripulantes/poliweb/asos-pendentes` scrapeava Poliweb sem timeout (~5s) e devolvia **503**
- `fetchWithToken` fazia `console.error` → overlay vermelho do Next.js via GlobalErrorHandler / HelpWidget

### Passos
- [x] Abort + timeout 2.5s no client Poliweb (`poliweb-scraper.ts`)
- [x] GET da página lista o banco (sem scrape); `?sync=1` tenta Poliweb e degrada com **200** + `data: []` + `warning` (nunca 503 de upstream)
- [x] `AsoReviewPanel` trata falha sem throw / sem `console.error`
- [x] Verificar curl no endpoint (401 sem token; 200 autenticado em ~3s, sem 503)

---

## MIO local-first (superseded by “MIO 100% histórico local” above)

The previous “honest gaps” (no ASO GET / metadata-only files / Man Schedule from mio_cache) are **not** the end state. Canonical `gt_*` is the source of truth. See the top task.

---

## GT modal — editar todos os campos + export treinamentos (2026-08-26)

### Problemas
- [x] Bug 1: Dados Pessoais em modo edição só libera Estado Civil, Email, Telefone (identidade + profissionais ficam texto)
- [x] Bug 2: Após Exportar Planilha de treinamentos, modal do colaborador não carrega mais dados (GET 200)

### Passos
- [x] DadosPessoaisTab: inputs para identidade + profissionais (FKs cargo/empresa/embarcação/CC)
- [x] PUT `/colaboradores/[id]`: whitelist de todas as colunas editáveis + validação CPF (não pular campos)
- [x] TreinamentosTab export: `getToken` + download isolado (sem `fetchWithToken.clone`), sem mutar estado compartilhado
- [x] CollaboratorModal: não zerar `data` em erro de fetch; error boundary na aba; fetch `?include=all`

---

## GT performance — GET colaborador + Man Schedule (2026-08-26)

### Problemas
- [ ] `GET /api/gestao-tripulantes/colaboradores/[id]` 10–27s (2 GETs paralelos 1ms apart via `_t`)
- [ ] Página `/department/gestao-tripulantes` ~21s; aba Man Schedule pesada ao abrir módulo

### Passos
- [x] GET [id]: sair da view pesada, 2 waves paralelas, payload sem `mio_data`/`ocr_texto`/`xml_gerado`; `?include=`
- [x] Dedup client: promise in-flight no modal (Strict Mode)
- [x] List GET: tabelas base + `?cpf=&lite=1`; debounce da busca
- [x] Man Schedule: dynamic import, mount só ao selecionar aba, cache 60s, lookup CPF lite, xlsx só no export
- [x] Medir GET [id] no localhost:3000 (curl autenticado)

### Medição (localhost:3000, id `ad6053bc-…`)
- Antes (logs do usuário): 10328–2793ms, picos 27308 / 19566ms com 2 GETs paralelos
- Depois servidor (log `[GT GET]`): **745–1155ms** full (2 waves); **299ms** `?include=profile`
- Depois HTTP client: **3011ms** full warm; **1832ms** profile; 1ª compile 4925ms
- Gap HTTP vs log: overhead Next.js dev (~2s), not the query plan

### Não mexer
- Editabilidade de campos, export de treinamentos, Poliweb 503, pipeline OCR

---

## GT OCR — scanned passport PDF fight (2026-08-26)

### Problema
Scanned passport PDF: pdf-parse 0 chars → vision with `llamacpp` + format `llamacpp_image_url` for model `gemini-3.5-flash` (mismatch, fetch failed) → reconvert same PNG → send empty/weak text into `chatCompletion` with 106 tools. canvasFactory deprecation.

### Passos
- [x] Tesseract/local OCR on PNG first; regex for passaporte
- [x] Vision LLM only if local OCR weak AND `visaoLlmCompativel` (skip llamacpp+gemini)
- [x] Convert PDF→PNG once; reuse buffers for vision
- [x] Never send empty text to tools-enabled chat; structured extract is tools-free
- [x] pdf.js `CanvasFactory` class instead of `canvasFactory` instance
- [x] Keep document saved + editable if OCR still fails
- [x] Tests: `scripts/test-gt-ocr-routing.ts` (mismatch + skip LLM) + `scripts/test-gt-doc-upload-helpers.ts`

### Restante
Vision still needs a real Gemini/OpenAI image endpoint + API key (provider must match the model).

---

## GT documentos — upload 400, OCR all types, passport edit, colaborador edit (2026-08-26)

### Problemas
- [x] Upload `POST /documentos/upload` retorna 400 (MIME / tipo inválido / datas)
- [x] OCR só roda de fato para ASO (LLM + persistência de campos)
- [x] Passaporte: edição inline + PUT dos campos
- [x] Botão Editar colaborador: save + refetch completo

### Passos
- [x] Relaxar MIME (extensão + magic bytes) e mapear tipos UI (`visto`/`ctm`/…) para CHECK do banco
- [x] Upload: não exigir datas; status `pendente`; não inventar `data_emissao` = hoje
- [x] OCR: extrair + persistir `numero_documento`, `orgao_emissor`, datas para TODOS os tipos
- [x] Gate identidade: sem CPF em não-ASO → `unknown` (não quarentena)
- [x] PassaportesTab: upload → refresh → OCR cliente (não bloquear); PUT campos
- [x] DocumentosTab + quick upload: tipos válidos + OCR
- [x] DadosPessoaisTab: save + refetch; PUT colaboradores devolve view completa
- [x] Verificar upload/OCR/PUT (script + API localhost)

---

## Companion — quality-gated polish 5.58.0 (2026-07-28)

### Feito
- [x] Rebuild body-only `.riv`: 17 poses (exec_point/read/stretch), SM mix **500ms**, idle step **≥2.5s**, calmer float
- [x] Runtime: longer Rive-like crossfades/blend; stop face prefetch when overlays off; no Framer double-bob on Rive
- [x] Validate `scratch/validate-companion-mascot-riv.mjs` OK; `.riv` ~441 KB (<600 KB)
- [x] Bones prep cutouts + README (`docs/assets/companion-mascot/cutouts/`) — human Editor still required
- [x] 3D NO-GO docs kept (`3d-spike-2026/SPIKE.md`); CHANGELOG + **v5.58.0**

### Gate
- No double-face; API wait = executing; reduced-motion static; FAB 60 readable

### Leftover
- True bone-skinned mesh deformation in Rive Editor (cutouts are prep only)

---

## Companion — image-to-3D spike (2026-07-28)

### Feito
- [x] Research Meshy / Tripo / Rodin / Luma / CSM / Sculptor (+ Hunyuan3D-2)
- [x] Env scan: no `MESHY_*` / `TRIPO_*` / `LUMA_*` / `FAL_*` keys
- [x] Free gen: HF `tencent/Hunyuan3D-2` shape GLB → `docs/assets/companion-mascot/3d-spike-2026/`
- [x] Verdict **NO-GO** — runtime stays 2D (Rive / Fase 0); do not wait for 3D
- [x] `SPIKE.md` + previews; uncommitted evidence (no runtime change)

### Próximo (só se revisitar)
- Paid Meshy/Tripo multi-view + textured export that passes face/limbs/side bar
- Hand-model low-poly book as alternative to AI mesh

---

## Companion — calm natural motion runtime (2026-07-28)

### Feito
- [x] API wait → `executing` (thinking), never `speaking` during wait (`AICompanionWidget`)
- [x] Lip-sync ~2.5 Hz only when `speaking`; no `viseme=0` open-A on idle (Rive player)
- [x] Face overlay off by default; body crossfades 280–340ms; status blend
- [x] Framer float/aura off when Rive drives; calm presets otherwise; reduced-motion OK
- [x] DOX + CHANGELOG + **v5.57.0**

### Como testar
- Idle: boca fechada, poses lentas
- Enviar mensagem → thinking (executing), sem flicker de boca
- Reduced-motion → estático

---

## Companion — Fase 0 compositor body+face (2026-07-28)

### Feito
- [x] Composite body + face overlay (`AnimatedABZLogo` + `companion-mascot-frames.ts`)
- [x] Idle blink (intervalo aleatório) + speaking fake lip-sync (`viseme_a/e/i/u` + rest)
- [x] Ciclos listening/executing mais ricos; prefetch PNGs; `useReducedMotion`
- [x] Face overlays re-bake em `public/images/companion-mascot/face/*` + `frames.json` v2
- [x] DOX + CHANGELOG + **v5.54.0**

### Como testar
- FAB idle → bob + blink ocasional dos olhos
- Enviar mensagem → speaking com boca ciclando visemes
- `prefers-reduced-motion` → frame estático (sem blink/lip-sync)

### Tweak visemes
1. Ordem/lista: `MASCOT_VISEMES` em `src/components/IA/companion-mascot-frames.ts` (ou `frames.json` → `lipSync.visemes`)
2. FPS boca: `MASCOT_LIP_SYNC_FPS` (default 6)
3. Alinhamento face: `MASCOT_FACE_OVERLAY` (`x/y/w/h` ou `%` left/top/width/height)
4. Trocar PNGs: `public/images/companion-mascot/face/viseme_*.png` + `face_blink.png`
5. Re-bake overlays: `python scratch/build_face_overlays.py`

---

## Companion — Fase 1A Rive / Rive-like (2026-07-28)

### Feito
- [x] `CompanionMascotRiveLike` — crossfade + face layer + fake lip-sync (viseme)
- [x] Gate `CompanionMascotRive` + lazy `@rive-app/react-canvas-lite` quando `.riv` presente
- [x] Drop-in docs `public/rive/README.md` (SM `CompanionSM`, `status` + `viseme`)
- [x] `AnimatedABZLogo` API intacta; FAB/session/bus intactos
- [x] DOX + CHANGELOG + **v5.55.0**

### Como testar
- FAB idle → crossfade suave entre poses + blink ocasional
- Enviar mensagem → speaking com boca/visemes animados
- `prefers-reduced-motion` → estático

---

## Companion — natural body-only motion (2026-07-28)

### Feito
- [x] Kill double-face: `.riv` body-only (14 body PNGs, no face overlays)
- [x] Soft opacity crossfades + float-idle/sway/breathing; SM mix ~420ms
- [x] API wait → `executing` (not speaking/viseme spam)
- [x] `MASCOT_USE_FACE_OVERLAY=false` + Rive-like body-only
- [x] Docs motion + CHANGELOG + **v5.57.0**

### Como testar
- Idle: face limpa (sem gray skull), bob suave, crossfade lento
- Enviar mensagem → pose think/exec (sem boca epiléptica)
- reduced-motion → estático

### Regenerar
1. `cd scratch/rive-gen && npm install rive-mcp-server@0.4.1`
2. `node scratch/build-companion-mascot-riv.mjs`
3. `node scratch/validate-companion-mascot-riv.mjs`

---

## Companion — ship real companion-mascot.riv (2026-07-28)

### Feito
- [x] Headless generate via `rive-mcp-server` `createRiv` (`scratch/build-companion-mascot-riv.mjs`)
- [x] `public/rive/companion-mascot.riv` — SM `CompanionSM`, Number `status`/`viseme` (superseded by 5.57 body-only)
- [x] Validate with official runtime (headless Chrome + RiveHost)
- [x] CHANGELOG + **v5.56.0**

---

## Companion — mascote livro azul (2026-07-28)

### Feito
- [x] Chroma/knockout do sheet transparente → RGBA em `public/images/companion-mascot/body|face/`
- [x] `frames.json` + `companion-mascot-frames.ts` (idle/listen/speak/exec)
- [x] Drop-in `AnimatedABZLogo` (props `status`/`size`/`className`); FAB/header/hero intactos
- [x] DOX `src/lib/ia/AGENTS.md` + CHANGELOG + **v5.53.0**

### Como testar
- Abrir Companion FAB → mascote idle (bob + troca lenta de poses)
- Enviar mensagem → speaking/executing ciclo de frames
- `prefers-reduced-motion` → frame estático

### Tweak frames
- Editar `MASCOT_STATUS_CYCLES` em `src/components/IA/companion-mascot-frames.ts` ou `public/images/companion-mascot/frames.json`
- Trocar PNGs em `body/*.png` (ids: `idle_stand`, `listen_ear`, `speak_*`, `exec_*`)

---

## IA — Graph email/Teams rich payloads (2026-07-28)

### Feito
- [x] `graph-comms-format.ts` — enrichers e-mail/Teams (ISO+pt-BR, participantes, preview, webLink, corpo truncado)
- [x] Expandir `$select` Graph + mapear em `microsoft/client.ts`
- [x] Tools: `meus_emails`, `ler_email_funcionario`, `pesquisar_emails_outlook`, Teams + `buscar_sinais_kpi_comunicacao`
- [x] `formatToolResultForLLM` — cap maior + preservar arrays detalhados
- [x] DOX `src/lib/ia/AGENTS.md` + root preference + CHANGELOG + **v5.52.0**

### Como testar
- Companion: "quais meus últimos e-mails?" → tool `meus_emails` com `data_recebido` + `de` + `preview`
- ADMIN: `pesquisar_emails_outlook` / `ler_email_funcionario` → campos completos por item
- Teams: `minhas_conversas_teams` / `pesquisar_mensagens_teams` → datas + participantes

---

## Férias — assinaturas no PDF (2026-07-28)

### Feito
- [x] Carregar `signature_url` (colaborador + líder/gerente) via supabaseAdmin em `GET /api/leave/[id]/pdf`
- [x] Carimbar PNG no `leavePDFGenerator`; missing → “Assinatura não cadastrada”; blank `form-pdf` inalterado
- [x] DOX `ferias/AGENTS.md` + CHANGELOG + **v5.51.0**

### Como testar
- Perfil com assinatura cadastrada → Detalhes → Baixar PDF → imagem na coluna Colaborador
- Sem assinatura → caption “Assinatura não cadastrada”
- Formulário (branco) → linhas vazias

---

## Férias — signature registration prompt (2026-07-28)

### Feito
- [x] Soft banner + soft-gate em `/ferias` (Nova Solicitação / Baixar PDF) quando `!hasSignature`
- [x] CTA reutiliza `useSignature().requestSignature` → SignatureModal global (`SignatureProvider`)
- [x] Dismiss sessionStorage `ferias_signature_prompt_dismissed` (não bloqueia o módulo)
- [x] DOX ferias + root preference + CHANGELOG + **v5.51.1**

### Como testar
- Usuário sem assinatura → `/ferias` → vê banner; Nova Solicitação / Baixar PDF → soft-gate → Cadastrar → modal global
- “Continuar sem assinatura” → fluxo segue; não reaparece na mesma sessão
- `/profile` → Assinatura ainda salva via `POST /api/user/signature`

---

## Férias — PDF download fix (2026-07-28)

### Feito
- [x] Causa real (Vercel): `GET /api/leave/[id]/pdf` 404 — `column users_unified_1.cpf does not exist`
- [x] Fix query `tax_id` (5.50.1) + harden download body/toasts/logo (5.50.2)
- [x] Blank `form-pdf` já 200; filled volta a gerar após deploy

### Como testar
- `/ferias` → Formulário (branco) → baixa PDF
- Detalhes → Baixar formulário PDF → baixa preenchido (owner/admin/aprovador)

---

## Férias — PDF fill audit (2026-07-28)

### Feito
- [x] Audit fill path: blank `form-pdf` vs filled `[id]/pdf` + `leavePDFGenerator`
- [x] Fix CPF (`tax_id`), nome/setor fallbacks, duração recalculada, observações + assinaturas
- [x] DOX `ferias/AGENTS.md` + CHANGELOG + **v5.50.1**

### Pendente
- [ ] Colunas/audit de `leader_approved_at` / `manager_approved_at` em `leave_requests` (hoje não existem)
- [ ] Prévia Detalhes: CPF/cargo (UI ainda não mostra; só no PDF)

---

## Férias — histórico + formulário PDF (2026-07-27)

### Feito
- [x] Filtros status + ano (minhas / equipe / admin); histórico não filtrado para “só futuro”
- [x] Export XLSX/CSV (`leaveExport.ts`) do conjunto filtrado
- [x] Detalhes → prévia formulário preenchido + Baixar PDF (`/api/leave/[id]/pdf`)
- [x] IA `buscar_ferias` / `buscar_ferias_global` com `ano` / `incluir_historico` / `status`
- [x] DOX `src/app/ferias/AGENTS.md` + CHANGELOG + **v5.50.0**

---

## IA Companion — data path audit (2026-07-27)

### Feito
- [x] Audit matrix: see / consultar / raciocinar / manipular (Companion + `/api/ia/chat` + tools)
- [x] Anti-alucinação hard em Companion + context-builder
- [x] `buscar_ferias` / `buscar_reembolsos` default usuário logado + JSON estruturado
- [x] `buscar_kpis_sistema` escopo RBAC para non-ADMIN
- [x] Mutate tools `aprovar_*` / `reprovar_*` (férias/reembolso) + status corretos nas actions
- [x] `tool-result-format.ts` + loop 12/10 rodadas; remove abort prematuro
- [x] Companion allowlist + globals + mutate; ghost `gerenciar_notificacoes` corrigido
- [x] Export KPI stubs → Excel/PDF reais; DOX + CHANGELOG + **v5.49.0**

### Pendente / leftovers
- [ ] Migrar restante do monolito `tools.ts` para registry
- [ ] Playwright E2E Companion pendências + approve flow
- [ ] Unificar status APPROVED vs aprovado no caminho legado `/api/reimbursement/approve`
- [ ] `ponto.tools.ts` placeholder ainda stub

---

## KPI / IA cards — empty data fix (2026-07-27)

- [x] Root cause: LLM widget shapes (`label`/`value`, Chart.js labels) + resolve preferring empty `w.data` over tool result; Companion dropped `dashboard`
- [x] `normalizeWidgetData` / `adaptToolResultToWidget` / `isEmptyWidgetData` in `kpi-board-shared.ts`
- [x] Fix `resolveWidgetData` + GenerativeDashboard empty-states; persist normalize on create
- [x] Companion API + FAB render dashboard
- [x] DOX + CHANGELOG + v5.48.1

## KPI Quadro Branco — delete (2026-07-27)

### Feito
- [x] Soft-delete `deleted_at` + migration `20260727_000004_ia_kpi_boards_deleted_at.sql`
- [x] `deleteUserBoard` / `deleteAllUserBoards` / `findUserBoard` (fuzzy titulo)
- [x] Tools `excluir_quadro_kpi` + `excluir_todos_quadros_kpi` (tools.ts + portal.tools + agents-router)
- [x] API `DELETE /api/ia/kpi-boards?id=` / `?all=1`
- [x] UI `/kpi` lixeira com confirm; limpa active se excluído
- [x] Prompts Companion: nunca dizer que delete é indisponível
- [x] DOX + CHANGELOG + v5.48.0

---

## KPI Quadro Branco — harness de roles (2026-07-27)

### Feito
- [x] `kpi-board-harness.ts` — `getKpiBoardCapabilities` / `assertBoardSpecAllowed` / prompt por role
- [x] Widget `html_sandbox` (ADMIN) — iframe `sandbox="allow-scripts"` sem same-origin + CSP
- [x] Enforcement em create/update (tools + `/api/ia/kpi-boards`) — non-admin não smuggling
- [x] Prompts Companion / context-builder / agents-router por role
- [x] KpiBoardRenderer renderiza sandbox; strip html_sandbox no GET non-admin
- [x] DOX + CHANGELOG + v5.47.0

### Feito (v1 anterior)
- [x] Migration `ia_kpi_boards` + script `apply-ia-kpi-boards-migration.js`
- [x] `kpi-board.ts` / `kpi-board-shared.ts` — Zod spec, CRUD, prompt block
- [x] API `/api/ia/kpi-boards` + resolve dataSources allowlisted
- [x] Tools criar/atualizar/listar/abrir_quadro_kpi + `render_dashboard` persiste
- [x] `/kpi` BoardRenderer + AuthContext identity (sem localStorage quebrado)
- [x] `OPEN_KPI_BOARD` no portal-action-bus + Companion metadata
- [x] Prompt hardening: forbid HTML dump / “salve .html” / “não consigo injetar” — board tools + `/kpi`
- [x] v5.46.0

### Fora de escopo (v2+)
- [ ] Vega-Lite, team sharing UI polish, postMessage data inject bridge
- [ ] Fix completo dos stubs do agente autónomo / PDF placeholders

---

## IA Companion global + memória/skills Hermes (2026-07-27)

### Feito
- [x] `CompanionSessionProvider` global (sobrevive troca de módulo)
- [x] STM `localStorage` — limpa só no logout
- [x] LTM `ia_user_memory` + inject no prompt + tools + extract heurístico
- [x] Migration SQL LTM aplicada via service role (`scripts/apply-ia-memory-skills-migration.js`)
- [x] Skills procedurais Hermes Agent–like (`ia_user_skills`) + tools + inject + auto-create
- [x] Migration SQL skills aplicada + v5.45.0

### Ops
- [x] Tabelas `ia_user_memory` e `ia_user_skills` confirmadas no Supabase

---

## IA Companion UX (2026-07-27)

### Feito
- [x] Logo Companion = `LC1_Azul.png` estável (crop “abz”) + anéis/aura de status (Framer Motion + `useReducedMotion`) + label tipográfico ABZ no FAB
- [x] Motion só em rings/aura/segmento — marca nunca gira; cores brand `#005B96` / `#0B72E7` (sem glow roxo)
- [x] Removido SVG morto `PortalLogo` (arcs 3 cores) de `MainLayout`
- [x] Companion conectado à IA real (`chatCompletion` + tools), sem respostas canned
- [x] `portal-navigation.ts` — fuzzy/typos/contextos + `navegar_portal` unificado
- [x] Commands de `navegar_portal` propagados via `_metadata.portalCommands`
- [x] Sub-agente `companion` no router

### Pendente
- [ ] Playwright: companion NAVIGATE com typo ("feririas") + pergunta real à IA
- [x] FAB sumiu: `fixed`+`relative` no mesmo botão — removido `relative` (2026-07-27)
- [x] FAB = pinwheel colorido oficial flutuante (`abz-icon-color.png`) — 2026-07-27
- [x] FIX KPI nav: catálogo `kpi` → `/kpi` (não `/dashboard`) em `portal-navigation.ts` — 2026-07-27
  - [x] FIX Companion tour/nav: "disse que navega mas não navega" — `isTourIntent` + `ensureNavigationCommand` injeta NAVIGATE; prompt proíbe promessa sem tool; widget fallback — 2026-07-27
  - [x] FIX Companion chat: ao abrir / após hidratação, scroll para o fim (mensagens recentes); `behavior: auto` no open, smooth no chat — 2026-07-27

---

## IA Tools — Auditoria e correções (2026-07-27)

### Feito
- [x] FIX `buscar_kpis_sistema` — status férias `PENDING_LEADER|PENDING_MANAGER`, reembolso `pendente`
- [x] FIX `gerar_planilha_excel` — configs `ponto`, `compras`, `eventos`, `cursos`
- [x] FIX `gerar_relatorio_pdf` — configs `ponto`, `epis`, `compras`
- [x] FIX `buscar_reembolsos` — user_id + fallback email; coluna `valorTotal`
- [x] Graph: paginação + filtros + `limite=0` até hard cap 1000 (`microsoft/client.ts`, `ler_email_funcionario`, `pesquisar_emails_outlook`)
- [x] P2 tools: tripulantes, afastamentos, acidentes, fatores risco, escalas, EPI estoque/vencimento/entrega, ponto resumo/inconsistências, academy matrícula/certificados/quizzes
- [x] KPIs expandidos + sinais e-mail/Teams (`kpi-comms-signals.ts`, `buscar_sinais_kpi_comunicacao`)
- [x] Fase 3: `meus_emails`, `meu_calendario`, `criar_evento_calendario`, Teams search, `navegar_portal`, registry microsoft/calendario/chat/portal + bridge

### Pendente
- [ ] Migrar restante do monolito `tools.ts` para registry (ferias/reembolso/etc. já parciais)
- [ ] Workflows tools
- [ ] Playwright: companion NAVIGATE + KPI scan com mailbox de teste

---

## Reembolso — Fluxo de emails (aprovação / fiscal)

- **Listas no admin** (`/admin/reimbursement-settings`)
  - Aprovadores `@groupabz.com` (`recipients`) — add/remove livre
  - Aprovadores outros domínios (`externalRecipients`) — add/remove livre
  - Financeiro/fiscal pagamento (`financeEmails`) — add/remove livre (mín. 1)

- **Verificação**
  - `npx tsx scripts/test-reimbursement-email-routing.ts`
  - Salvar configs no admin e criar reembolso groupabz vs externo

---

## Email credentials no portal (admin → DB) — 2026-07-23

### Feito
- [x] `src/lib/email-env.ts` — resolve `app_secrets` → env (nunca hardcode)
- [x] `secure-credentials.setCredential` + encrypt AES para `EMAIL_PASSWORD`
- [x] Consumers: `email-exchange.ts`, `email-gmail.ts`, `email/service.ts` + `resetEmailTransport`
- [x] API admin `GET/PUT/POST /api/admin/email-settings` (senha mascarada; teste SMTP)
- [x] UI `/admin/email-settings` + item no menu Sistema
- [x] `.env.example` documenta `EMAIL_*` como bootstrap; DOX em `src/app/api/admin/email-settings/AGENTS.md`

### Manual (ops)
1. Confirmar tabela `app_secrets` (senão: `scripts/create-app-secrets-table.sql`)
2. Abrir `/admin/email-settings` como ADMIN — para O365 com erro **535**, preferir transporte **Graph** (`MS_GRAPH_*` + `Mail.Send`) ou salvar senha SMTP só se Authenticated SMTP estiver ativo na caixa
3. Rodar “Testar conexão” (opcional: enviar e-mail de teste)
4. Inspecionar keys: `scripts/email-credentials-app-secrets.sql` no SQL Editor
5. Após OK em DB, pode remover `EMAIL_PASSWORD` do host env (manter só bootstrap se quiser)

---

## Security — Exposição O365 / GitHub (relatório DPO 22/07/2026)

Fonte: `Relatorio_Vulnerabilidade_O365_GitHub_Ativo_DPO.pdf`  
Achado: credencial O365 em repo **público** `Caiolinooo/EmployeeHub` (`src/lib/email-exchange.ts`). PoC de login validada.

### In-repo (código) — feito / pendente

| Status | Item |
|--------|------|
| [x] | Extrair PDF + mapear findings |
| [x] | Remover fallbacks de senha email (`email-env.ts`, exchange/gmail/ia) |
| [x] | TLS SMTP `rejectUnauthorized: true` |
| [x] | `/api/email/debug` admin-only, sem retornar senha |
| [x] | JWT sem `fallback-secret` (`jwt-secret.ts`) |
| [x] | WKRadar: `WKRADAR_DEFAULT_PASSWORD` server-side only |
| [x] | Redigir docs/scripts (O365/Gmail/SendGrid) |
| [x] | `.gitleaks.toml` + `.github/workflows/secret-scanning.yml` |
| [x] | Atualizar `.env.example`, `.gitignore`, `SECURITY.md`, `AGENTS.md` |
| [x] | Verificação pós-remediação (tsc focado, build, spot-checks) — ver seção abaixo |
| [x] | Commit + version bump **v5.30.0** + push `portal` (force-with-lease pós-purge) — 2026-07-23 |
| [ ] | Deploy com secrets rotacionados |

### Manual — O365 / Entra ID (Suporte) — PENDENTE

| Status | Ação |
|--------|------|
| [ ] | Tornar **privado/remover** `https://github.com/Caiolinooo/EmployeeHub` agora |
| [ ] | Checar forks/caches (grep.app, Sourcegraph, GitHub code search) |
| [ ] | **Reset senha** `***REMOVED***` (+ qualquer reutilização, ex. WKRadar) |
| [ ] | Entra ID → **Revoke sessions** da conta |
| [ ] | Revogar App Passwords / refresh tokens / credenciais de app |
| [ ] | Habilitar **MFA** (+ Conditional Access se possível) |
| [ ] | Auditar **Sign-in logs** no período de exposição pública |
| [ ] | Rotacionar Gmail app password antiga (se ainda válida) |
| [ ] | Revogar SendGrid API key antiga (mencionada em docs — já redigida) |
| [ ] | Atualizar `EMAIL_*` / `WKRADAR_DEFAULT_PASSWORD` no host (Vercel) |

### Manual — GitHub org / histórico — PENDENTE

| Status | Ação |
|--------|------|
| [ ] | Secret Scanning + Push Protection na org/repo |
| [ ] | Dependabot alerts em `EmployeeHub` e `painel-abz` |
| [ ] | Varredura histórica gitleaks em todos os repos |
| [x] | `git filter-repo` no branch `portal` + force-push (2026-07-23) — rotacionar chaves ainda é obrigatório |
| [x] | **Fix false-positive purge damage (2026-07-23):** `replace-text` also mangled valid code (`JSON.stringify({`, `document.getElementById(`, `background-color:`, `process.env.*`) into `***REMOVED***` → Vercel build failed on `962ac2e`. Restored from pre-rewrite SHA `fae8e307` + heuristics; secrets not reintroduced; `npm run build` OK |

### Manual — DPO / LGPD — PENDENTE

| Status | Ação |
|--------|------|
| [ ] | Avaliar incidente LGPD (tempo de exposição + acesso potencial) |
| [ ] | Mapear dados pessoais acessíveis via mailbox/OneDrive/Teams |
| [ ] | Decidir comunicação ANPD / titulares com jurídico |
| [ ] | Registrar incidente + evidências |

---

## Security audit — open items (2026-07-23)

### Critical — rotate immediately (secrets were in git history)

Secrets were committed in `.env.production`, `.env.backup*`, `fix-netlify-env.*`, docs/scripts. Working tree scrubbed; **git history on `portal` was purged** (2026-07-23). Keys that ever leaked must still be rotated (purge ≠ revoke).

Rotate and invalidate:

1. `JWT_SECRET` (re-login all sessions)
2. Supabase `service_role` key (+ revoke old key in dashboard)
3. `DATABASE_URL` / Postgres password
4. `ADMIN_PASSWORD` (and any accounts that used the leaked default)
5. Email SMTP / app password (`EMAIL_PASSWORD`) — **obrigatório após relatório O365**
6. Twilio SIDs/tokens
7. MIO API credentials
8. Redis URL password
9. Google Drive API key (if still active)
10. Netlify/host env vars — re-set from secure vault, not from old scripts
11. SendGrid API key (se a chave antiga ainda existir no painel SendGrid)

Post-rotation:

- Confirm production host env has new values only
- Consider `git filter-repo` / BFG to purge history (coordinate with team)
- Enable GitHub secret scanning + Dependabot alerts on `Caiolinooo/EmployeeHub`

### High — dependency upgrades (breaking / no patch)

| Package | Severity | Notes |
|---------|----------|--------|
| `jspdf` | critical | **DONE v5.31.0** → `jspdf@4.2.1` + `jspdf-autotable@5.0.8` |
| `xlsx` | high | No fix available — plan migration to `exceljs` / SheetJS Pro |
| `next` | high | **DONE v5.31.0** → `next@15.5.21` + `eslint-config-next@15.5.21` (async params/cookies/headers; `serverExternalPackages`) |
| `nodemailer` | high | **DONE v5.31.0** → `nodemailer@9.0.3` |
| overrides | — | **DONE**: `glob@10`→10.5.0, `minimatch@9`→9.0.9, `postcss`→8.5.22, `uuid`→11.1.1, `sharp`→0.35.3 |
| `elliptic` | low | **DONE**: removed unused webpack `crypto-browserify` polyfill (`next.config.js` → `crypto: false`); tree empty; `npm run build` OK. No upstream elliptic fix ≤6.6.1; do **not** `audit fix --force` (downgrades crypto-browserify). |
| `sharp` | high | **DONE**: direct + override `sharp@0.35.3` (libvips GHSA-f88m-g3jw-g9cj / CVE-2026-33327/33328/35590/35591). Was transitive `next@15.5.21` → `0.34.5`. Do **not** `audit fix --force` (downgrades Next→14.2.35). |

### sharp / libvips (Dependabot #247)

1. [x] Confirm tree: `npm ls sharp` → was `next@15.5.21` → `sharp@0.34.5`
2. [x] Fixed range: advisory `<0.35.0`; patch `>=0.35.0` (applied `0.35.3`, ships `@img/sharp-libvips-*@1.3.2`)
3. [x] Safest fix without Next downgrade: `dependencies.sharp` + `overrides.sharp` = `0.35.3`
4. [x] Verify: `npm ls sharp` / `npm audit` no longer flags those CVEs

Verification (2026-07-23): `npm ls next jspdf nodemailer` → 15.5.21 / 4.2.1 / 9.0.3; `npm run build` exit 0; push `main` + `portal`.

`npm audit` after remediations: Dependabot elliptic (#155) + sharp cleared; residual `xlsx` (high, no npm fix).

Combined verify (2026-07-23, **v5.33.0**): remediations coexist (`sharp` dep+override `0.35.3`, `crypto: false`, `crypto-browserify` removed); `npm ls sharp` → 0.35.3; `npm ls elliptic` empty; `npm audit` → only `xlsx` high; `npm run build` exit 0; `next/image` OK; no client `'use client'` imports of Node `crypto`.

### Medium — remaining code hygiene

- `dangerouslySetInnerHTML` still in SocialFeed, ChangelogModal, HelpWidget, RichTextEditor, IA dashboard, test pages — ensure DOMPurify on all user/HTML paths
- Debug routes under `/api/debug/*` now require non-production + admin; remove entirely when no longer needed
- Unauthenticated CORS `*` not found in `src/` — keep monitoring new proxies
- GitHub Dependabot/code/secret scanning: not enabled / 404 on API — enable in repo settings
- Longo prazo: OAuth2 para O365 SMTP; cofre de segredos; pre-commit gitleaks; treinamento secrets

### Done in this audit (committed as v5.30.0)

- Scrubbed `.env.production` / `.env.backup*` (not committed); history purge on `portal`
- Scrubbed hardcoded secrets in Netlify scripts, SQL admin helpers, docs, JWT fallbacks
- Locked debug APIs (`guardDebugRoute`)
- Removed `ADMIN_PASSWORD` / WKRadar / email hardcoded fallbacks
- Biblioteca text content no longer uses raw `dangerouslySetInnerHTML`
- Email libs use `email-env.ts`; JWT uses `jwt-secret.ts`; admin UI `/admin/email-settings`
- Gitleaks CI workflow + custom rules for email/JWT hardcoded patterns
- Relatório O365 DPO: remediações in-repo aplicadas; ações Entra/GitHub/DPO documentadas acima

---

## Verification — security remediations (2026-07-23)

| Check | Result | Notes |
|-------|--------|-------|
| Git status / diff summary | PASS | ~112 files; secrets scrubbed; new libs untracked; `.env*` backups deleted (staged) |
| `npx tsc --noEmit` (remediation paths) | PASS | No errors in email-env / jwt-secret / wkradar / debug-guard / ensure-admin / exchange / credentials |
| `npx tsc --noEmit` (full repo) | FAIL (pre-existing) | Only `src/lib/ia/client.ts` `tool_calls` typing — **not introduced by remediations**; `ignoreBuildErrors: true` in next.config |
| Focused eslint on remediated files | PASS | 0 errors / 51 pre-existing `any` warnings |
| `npm run lint` (full) | FAIL (pre-existing) | ~126 prefer-const / no-var errors elsewhere; none in new security modules |
| `npm run build` | PASS | Compiled successfully (exit 0); ESLint/TS ignored during build per next.config |
| Imports: `email-env`, `jwt-secret`, `wkradar-defaults`, `debug-route-guard` | PASS | Exports/callers aligned; `email.ts` re-exports `email-exchange` → `email-env` |
| Runtime spot-check (`scratch/verify-security-modules.ts`) | PASS | JWT prod throw / dev fallback; email resolve + EMAIL_PASS alias; WKRadar throw/get/username; debug 403 contract |
| `.env.example` required vars | PASS | Documents `JWT_SECRET`, `EMAIL_*`, `WKRADAR_DEFAULT_PASSWORD`, `ADMIN_*`, `ALLOW_EMAIL_DEBUG` |
| Login/auth JWT paths | PASS | `auth.ts` / `jwt.ts` / middleware use `getJwtSecret()`; login-password requires env JWT |
| Email send paths | PASS | exchange/gmail/ia/debug use `resolveEmailAuth` + TLS `rejectUnauthorized: true` |
| WKRadar credentials API | PASS | Uses `tryGetWkradarDefaultPassword`; UI shows error if unset (no hardcoded password) |
| Debug routes production guard | PASS | `guardDebugRoute` returns 403 when `NODE_ENV=production`; wired on debug/* + create-admin + debug-admin-token |
| Hardcoded secret scan in `src/` | PASS | No matches for former fallbacks (`Abz@2025`, `fallback-secret`, `Caio@2122`, `HxRMTY`) |
| Leftover scrub in `email.ts.bak` | FIXED | Removed ethereal/O365 leftovers during verification |
| `ensure-admin` TS break from removing ADMIN_PASSWORD fallback | FIXED | Requires `ADMIN_EMAIL` + `ADMIN_PHONE_NUMBER` + `ADMIN_PASSWORD` with clear 500 |

### Verdict

- **Safe to run locally**: YES, if `.env.local` has rotated `JWT_SECRET`, `EMAIL_USER`/`EMAIL_PASSWORD`, and (for WKRadar defaults) `WKRADAR_DEFAULT_PASSWORD`. Without email env, SMTP paths throw clear errors (no silent hardcoded fallback).
- **Ready for commit**: YES from a build/typecheck-remediation standpoint — **after** confirming no real secrets remain in the commit set. Do **not** treat as production-ready until manual credential rotation (O365/JWT/Supabase/etc.) in `tasks.md` is done.
- **Not done by verification**: Playwright UI smoke (no long session); live SMTP send; Entra/GitHub/DPO manual items.

## Git history credential purge (2026-07-23) — PUSHED (v5.30.0)

History rewrite on branch `portal` completed with `git filter-repo`; remediations committed as **v5.30.0**. Push used `--force-with-lease` (or `--force` if lease failed for expected rewrite).

### Push command used
```bash
git push -u --force-with-lease origin portal
```

### What was purged from ALL history
- Paths removed: `.env.production`, `.env.backup`, `.env.backup-20251201-084439`, `fix-netlify-env.sh`, `fix-netlify-env.bat`, `netlify-env-update.md`, `scripts/add-service-key-to-secrets.sql`, `scripts/get-supabase-service-key.js`, `public/admin-token.html`, `resolver`
- Literal secret values replaced with `***REMOVED***` across remaining history (68 entries; JWT/service-key dumps)

### Collaborator impact
- Anyone with a prior clone must **re-clone** or reset hard to the new remote history; old commits remain dangerous if shared elsewhere.
- Rotate all credentials that ever appeared in git (Supabase service/anon JWTs, JWT_SECRET, email/app passwords, SendGrid, etc.) — history purge does not revoke leaked keys.

### WIP / recovery
- Pre-purge WIP was stashed as `pre-history-purge-wip`, then restored after rewrite.
- Backup patch (secrets scrubbed): `.git-purge-work/pre-history-purge-wip.patch`
- Remediations restored in working tree (uncommitted). `public/admin-token.html` / `scripts/add-service-key-to-secrets.sql` intentionally left absent (purged); recreate only without secrets if needed.
- Other prior stashes may have been dropped during rewrite/gc — check carefully before assuming old stashes exist.
- Remote `origin` was re-added after filter-repo removed it. Upstream tracking not set until force-push: `git push -u --force-with-lease origin portal`

### Verification (local)
- `git log --all -- .env.production` → 0 commits
- Remaining `eyJhbGciOi` hits only truncated 10-char prefix in `kilo_code_task_aug-22-2025_6-21-39-pm.md` (not a full JWT)
- Reflog expired; `git gc --prune=now` completed

## Gestão Tripulantes — ASO + Escala personalizável (2026-07-23)

**Verificação combinada (2026-07-23):** PASS (código). Sem conflict markers em `AGENTS.md` / `tasks.md` / GT. Migrations `000001` + `000002` coexistentes (sem overlap de schema). Fix: `embarques/route.ts` importava `findColaboradorByCpf` de `cpf` → corrigido para `cpf-lookup`. `tsc` em `src/` sem erros GT (falha residual só em `scratch/regenerate_xml.ts`, fora do escopo). **Ainda pendente:** aplicar ambas migrations no Supabase + Playwright/manual UI.

### ASO (análise → implementação) — checklist

**Status análise (2026-07-23):** cross-person ASOs no perfil (ex.: Adalberto vendo Vinicius/Wendel) — ver relatório do agent. Hipótese: upload/import no perfil errado + OCR reassociation falha (CPF formatado vs dígitos / primeiro CPF no PDF / nome frágil). Títulos com nome alheio vêm de `ImportarASOModal` (`ASO - ${filename}`).

- [x] Análise: causa ASOs de outras pessoas no perfil errado
- [x] Fluxo alvo: cadastro/import → envio E-Social (S-2220) → disponibilidade global só se enviado/processado
- [x] Normalizar CPF em lookups (OCR, PoliWeb, e-Social) via `src/lib/gestao-tripulantes/cpf.ts` + `cpf-lookup.ts` (digits + máscara). Backfill SQL opcional abaixo.
- [x] Hard-block vínculo: CPF OCR ≠ perfil → reassign por CPF ou quarentena; **sem** reassociação só por nome; freeze após pendente/enviado/processado
- [x] UI ASOTab / ImportarASOModal: nome/CPF OCR + match; rascunhos vs disponíveis; bloqueio envio se CPF mismatch; título não é identidade
- [x] Schema: migration `20260723_000001_aso_identity_gate.sql` (`cpf_documento`, `identity_match`, CHECK com `quarentena|erro_validacao|pendente_revisao`)
- [x] API global `GET /api/gestao-tripulantes/aso?cpf=` (só enviado/processado); `algoritmo-back` prefere ASO pós-envio
- [x] Sync loop: enviar/consultar S-2220 → `gt_documentos_aso.esocial_status` via `aso-esocial-sync.ts`
- [ ] Data fix (manual): auditar Adalberto / Vinicius / Wendel — limpar vínculos errados em `gt_documentos` / `gt_documentos_aso`; re-OCR ou quarentena; opcional backfill CPF:
  ```sql
  -- Opcional: normalizar CPF em colaboradores (rodar no SQL Editor após backup)
  UPDATE gt_colaboradores
  SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g'), updated_at = now()
  WHERE cpf IS NOT NULL AND cpf ~ '[^0-9]';
  ```
- [ ] Verificação: Playwright perfil ASO + S-2220 + regressão cross-person; aplicar migration em staging/prod

### Escala personalizável (marcadores/cores/preview comentário)

**Status implementação (2026-07-23):** tabela `gt_tipos_evento_escala` + CRUD admin; realtime merge só `origem=local`; OFF-C round-trip; observações na grade; PUT embarques. **Pendente:** aplicar migration no Supabase + verificação Playwright.

#### Fase 0 — Contratos / modelo
- [x] Análise: tipos hardcoded vs configuráveis + mapa de arquivos
- [x] Definir modelo: tabela `gt_tipos_evento_escala` (recomendado) **ou** JSON em `gt_configuracoes.escala_tipos`
- [x] Migration: relaxar/substituir CHECK de `gt_historico_embarques.tipo`; seed ON/FI/DBA/STB/OFF-C (`20260723_000002_gt_tipos_evento_escala.sql`)
- [x] Preservar códigos MIO (`normal|fi|dba|stb|offc`) como `codigo` / `is_system` + `maps_to_db_tipo`

#### Fase 1 — Admin (tipos + cores + labels)
- [x] API CRUD tipos de marcador (list/create/update/delete ou soft-disable)
- [x] Tab em `/admin/gestao-tripulantes` → **Marcadores Escala**
- [x] Campos: código curto, label, cor fundo, cor texto, ordem, ativo, mapeamento MIO opcional
- [x] Modal "Adicionar Evento" carrega tipos do DB (não `<option>` fixos)

#### Fase 2 — Grade + API realtime
- [x] `GET /api/man-schedule/realtime`: devolver `observacoes` + `tipo_codigo` sem sobrescrever `embarque_status`; merge só `origem='local'`; CPF normalize
- [x] Corrigir round-trip `offc` → não virar `fi` após save (`mapCodigoToDbTipo` → `offc`)
- [x] Células: cor/label dinâmicos; tooltip/hover com observações; indicador se há comentário
- [x] Legenda dinâmica a partir dos tipos ativos presentes na grade
- [x] Export XLSX usar mesmas cores configuráveis

#### Fase 3 — CRUD eventos completo
- [x] PUT/PATCH `/api/gestao-tripulantes/embarques/[id]` (hoje só DELETE)
- [x] Modal: preload observações/datas/tipo ao editar; não limpar `formObs` em open de evento existente
- [x] Evitar create-always no Salvar quando já existe UUID local

#### Fase 4 — Verificação
- [ ] UI: criar tipo custom → cor na grade → comentário no hover/tooltip _(após migration)_
- [ ] Round-trip OFF-C / tipos custom + soft-delete _(após migration)_
- [ ] Playwright: modal + grade em `/department/gestao-tripulantes` tab Man Schedule

### Conferência cross-módulo
- [x] Mapa Tripulantes / ASO / E-Social / Man Schedule / MIO _(merge local-only; CPF normalize)_
- [x] Merge verify ASO+Escala (imports/migrations/docs) — 2026-07-23; fix `embarques`→`cpf-lookup`
- [ ] Guardrails de identidade (CPF / MIO id) — ver checklist ASO (Playwright + data fix ainda abertos)
- [ ] Aplicar migrations staging/prod: `20260723_000001_aso_identity_gate.sql` → `20260723_000002_gt_tipos_evento_escala.sql`

### Supabase migrations aplicadas (2026-07-23)
- [x] `20260723_000001_aso_identity_gate.sql` (cpf_documento, identity_match, colaborador_id nullable)
- [x] `20260723_000002_gt_tipos_evento_escala.sql` (5 marcadores seed ON/FI/DBA/STB/OFF-C)
- Script: `node scripts/run-aso-escala-migrations.js`
