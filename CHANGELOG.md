# Changelog

## [5.32.0] - 2026-07-23

### Features
- **Email via Microsoft Graph**: transporte `smtp` | `graph` | `auto` em `/admin/email-settings` e `EMAIL_TRANSPORT`. Para O365 com erro Outlook **535**, preferir Graph (`MS_GRAPH_CLIENT_ID` / `SECRET` / `TENANT_ID` + permissão `Mail.Send`).
- **Fallback automático**: se SMTP falhar com 535 e o Graph estiver configurado, o envio tenta Graph.
- Novo `src/lib/email-graph.ts`; senha SMTP opcional quando o transporte efetivo é Graph.

### Docs
- DOX/admin email-settings, `.env.example` e `AGENTS.md` atualizados com Graph e orientação 535.

## [5.31.0] - 2026-07-23

### Security
- **Next.js 15.5.21** (+ `eslint-config-next@15.5.21`): closes Dependabot Next 14.x advisories; migrated async `cookies`/`headers`/`params`, `serverExternalPackages` in `next.config.js`. Custom `server.js` + Guacamole/WebSocket proxy kept intact.
- **jspdf@4.2.1** (+ `jspdf-autotable@5.0.8` for peer `^4`): remediates jsPDF critical advisories.
- **nodemailer@9.0.3** (+ `@types/nodemailer@^8`): remediates nodemailer high advisories.
- **npm overrides**: `glob@10` → `10.5.0`, `minimatch@9` → `9.0.9`, `postcss` → `8.5.22`, `uuid` → `11.1.1`.
- **Accepted residual (Low)**: `elliptic` via webpack client polyfill (`crypto-browserify` / `browserify-sign` / `create-ecdh`) — no non-breaking fix; do not `npm audit fix --force` (would downgrade Next / break crypto polyfill).
- **Residual (tracked)**: `sharp` (transitive of Next; `audit fix --force` wrongly suggests Next 14), `xlsx` (no fix — migrate later).

### Changed
- App version **5.31.0**; React 18 retained on Next 15.

## [5.30.0] - 2026-07-23

### Security
- **Git history purge**: Removed leaked credential files and literal secrets from branch history (`git filter-repo`); collaborators with old clones should re-clone. Credential **rotation remains mandatory** (O365, JWT, Supabase, etc.) — purge does not revoke exposed keys.
- **No hardcoded secrets**: Email/JWT/WKRadar fallbacks removed; runtime uses `src/lib/email-env.ts`, `src/lib/jwt-secret.ts`, and `WKRADAR_DEFAULT_PASSWORD` (server-side only).
- **Debug routes hardened**: `guardDebugRoute` blocks production access; `/api/email/debug` is admin-only and never returns passwords; TLS SMTP uses `rejectUnauthorized: true`.
- **Secret scanning CI**: `.gitleaks.toml` + `.github/workflows/secret-scanning.yml` (Gitleaks).

### Features
- **Admin email credentials UI**: `/admin/email-settings` (menu Sistema) — ADMIN can view/update SMTP account; password stored encrypted in `app_secrets`.
- **Runtime resolution**: DB (`app_secrets`) → env (`EMAIL_*` bootstrap/fallback) → throw; API `GET/PUT/POST /api/admin/email-settings` with masked password and optional SMTP test.

### Docs
- `SECURITY.md`, `tasks.md`, `AGENTS.md`, and `src/app/api/admin/email-settings/AGENTS.md` document posture, rotation checklist, and DOX contracts.
- `.env.example` documents required vars without real secrets; ops SQL helper `scripts/email-credentials-app-secrets.sql`.

## [5.29.0] - 2026-07-15

### Added
- **Reembolso — Três listas de e-mail no admin**: Em `/admin/reimbursement-settings` agora é possível configurar separadamente aprovadores `@groupabz.com`, aprovadores de outros domínios e e-mails do financeiro/fiscal (pagamento), com add/remove livre em cada lista.
- **Reembolso — Helper de roteamento**: Novo `src/lib/reimbursement-email-routing.ts` centraliza defaults, normalização de configs legadas e resolução de destinatários por domínio.
- **Reembolso — Templates oficiais**: Novos templates em `emailTemplates.ts` no padrão ABZ (`reimbursementApprovalRequestTemplate`, `reimbursementPaymentTemplate`, `reimbursementFinancePendingTemplate`).

### Changed
- **Reembolso — Fluxo de e-mails por domínio**: Solicitantes `@groupabz.com` enviam aprovação inicial para a lista de aprovadores internos (ex.: Andresa); demais domínios usam a lista de aprovadores externos; após qualquer aprovação, o financeiro/fiscal recebe o e-mail para marcar como pago.
- **Reembolso — Defaults alinhados**: Defaults atualizados para `andresa.oliveira@groupabz.com` (aprovação interna) e `fiscal@groupabz.com` (externos e pagamento), substituindo o legado que misturava Andresa+fiscal e usava `financeiro@`.

### Fixed
- **Reembolso — Externos sem destinatário de aprovação**: Solicitantes fora de `@groupabz.com` agora recebem envio correto aos aprovadores externos (antes só o solicitante ou `logistica@`).
- **Reembolso — Fiscal na criação indevida**: Configs antigas com fiscal junto dos aprovadores internos são normalizadas automaticamente (fiscal vai para a lista de pagamento).

### Tests
- `scripts/test-reimbursement-email-routing.ts`: cobre defaults, roteamento groupabz vs externo, listas independentes, migração de configs legadas e regra de domínio desligada.

## [5.28.0] - 2026-07-14

### Added
- **Voice Server — Supertonic 3 TTS**: Substituído o Piper TTS pelo Supertonic 3 (99M parâmetros, 31 idiomas incluindo PT-BR). Roda 100% em CPU via ONNX, sem necessidade de GPU. Vozes preset: M1, M2, M3, F1, F2, F3. Novo `scripts/voice-server/requirements.txt` para dependências do voice server.
- **Voice Server — Teste de conexão SMTP**: Endpoint `GET /api/email/test-connection` agora limpa o cache do transporter antes de testar, garantindo credenciais frescas.

### Changed
- **Email Exchange — Tratamento de erro 535**: Detecta autenticação falhada do Office365 (535 5.7.3) e retorna mensagem orientando sobre credenciais expiradas ou BASIC Auth desabilitado. Removido fallback hardcoded de senha (`[REDACTED]`) — agora exige `EMAIL_PASSWORD` configurado.
- **Email Exchange — Validação pré-conexão**: `createTransport()` valida se `EMAIL_PASSWORD` está configurado antes de tentar conectar, evitando erros genéricos.
- **Auth — Anti-duplicação de erros**: `sendPasswordResetEmail()` e `request-password-reset/route.ts` não envolvem mensagens de erro com prefixos adicionais, eliminando a cadeia "Erro ao enviar email: Erro ao enviar email de redefinição: Erro ao enviar email: ...".
- **Voice Manager — Instalação atualizada**: `abz_voice_manager.sh` instala `supertonic` + `numpy` em vez de `piper-tts`. Download automático do modelo Supertonic 3 na primeira execução.
- **Secure Credentials — Cache com TTL**: Cache de credenciais agora expira após 1 minuto (`CACHE_TTL_MS`), evitando dados stale após atualização via painel admin.
- **Voice Agent error handling**: Tratamento de exceção genérica e HTTP≠200 da tool `processar_texto` retorna mensagens amigáveis e neutras, sem revelar detalhes de erro do gateway.
- **IA System Prompt (context-builder.ts)**: Instrução "INFORME o erro ao usuário" substituída por proibição explícita de frases como "estamos tendo erro", "deu erro" ou "sistema fora do ar". A IA agora reconduz a conversa de forma gentil.
- **IA Client Fallback (client.ts)**: Nota de fallback que citava "dificuldades técnicas" trocada por "(Resposta baseada em cache parcial.)", eliminando exposição de falha interna na resposta.

### Fixed
- **Reembolso — Exclusão por UUID ou protocolo**: `DELETE /api/reembolso/[id]` agora aceita tanto UUID quanto número de protocolo, corrigindo erro 404 ao tentar excluir reembolsos identificados por UUID.
- **Reembolso — Modal de detalhes usa ID**: `ReimbursementDetailModal` usa `reimbursement.id` como identificador na requisição DELETE, evitando problemas com encoding de URL do protocolo.
- **Férias — Validação de antecedência**: Corrigido `advanceNoticeDays >= 0` (antes era `> 0`), permitindo configurar prazo zero quando necessário.
- **Leave Config — Cache-Control**: Endpoint `GET /api/leave/config` agora retorna `Cache-Control: no-store` para evitar cache de dados sensíveis.
- **Voice Agent (agent.py)**: Tool `processar_texto` agora tem fallback para o LLM local (llama.cpp) quando o gateway do portal (`/api/ia/voice/process`) está indisponível. Antes, se o portal estivesse fora do ar, a voz ficava muda. Agora a IA responde mesmo offline.
- **Voice Agent (agent.py)**: Fallback do LLM local envia `chat_template_kwargs: {enable_thinking: false}` + `max_tokens: 400` para evitar que o Qwen gaste o orçamento de tokens raciocinando e devolva conteúdo vazio (voz muda).
- **Voice Agent (agent.py)**: Removida exposição de erros ao usuário — qualquer falha do gateway/disponibilidade cai em mensagem natural e aciona o fallback local.
- **Voice Agent (agent.py)**: A IA deixou de confessar erros técnicos ao usuário. Regra #7 do system prompt alterada de "explique o erro ao usuário" para "NUNCA diga que houve erro; mantenha-se no personagem".

## [5.27.2] - 2026-07-03

### Added
- **Notificações a TODOS os e-mails em TODAS as etapas**: o RH e a lista de e-mails adicionais (DP e demais responsáveis) agora recebem notificações em todas as etapas do processo de férias — nova solicitação, avanço do líder para o gerente, aprovação final E rejeição. Antes a rejeição e o avanço de etapa não notificavam a lista adicional; agora todos os destinatários configurados são sempre notificados, junto com o colaborador solicitante.
- **E-mails no padrão ABZ**: novos templates formais em `src/lib/emailTemplates.ts` seguindo o mesmo padrão visual dos templates de reembolso (logo, header, footer, cores padronizadas, caixas de destaque): `leaveRequestCreatedTemplate`, `leaveNewRequestNotificationTemplate`, `leaveApprovedTemplate`, `leaveApprovedNotificationTemplate`, `leaveRejectedTemplate`, `leaveRejectedNotificationTemplate`, `leavePendingManagerTemplate`, `leavePendingManagerNotificationTemplate`, `leaveApprovalPendingTemplate`.
- **Comprovante de Férias em PDF (download)**: novo `src/lib/leavePDFGenerator.ts` gera dois documentos no padrão ABZ (header com logo, identificação, períodos, opções, assinaturas):
  - **Comprovante de uma solicitação existente** via `GET /api/leave/[id]/pdf` — disponível para o colaborador, líder/gerente do setor, admin e usuários com ACL `ferias:read/manage/admin`.
  - **Formulário em branco** para preenchimento manual/impressão via `GET /api/leave/form-pdf` — disponível para qualquer usuário autenticado (útil para colaborador, gerente e DP).
  - Botões de download adicionados em `/ferias` (botão "Formulário" no header + botão "Comprovante" em cada solicitação) e em `/admin/leave-requests` (botão "Comprovante (PDF)" no modal de detalhes).

### Changed
- **Configuração simplificada**: removido o campo dedicado do responsável individual do painel admin. Agora há apenas um campo único de "E-mails Adicionais para Notificação" (lista separada por vírgula) que pode conter quantos e-mails forem necessários (DP, diretores, fiscais, etc.).
- **`src/lib/leaveConfig.ts`**: removida a constante e a função do responsável individual. A função `getLeaveExtraNotifyEmails()` agora retorna apenas os e-mails configurados na lista (sem fallback hardcoded). Nova função `getLeaveNotificationRecipients()` retorna RH + lista adicional combinados (usada pelo sistema de notificações).
- **`src/services/leaveNotifications.ts`**: refatorado para usar os templates formais ABZ. Todos os eventos (criação, aprovação, rejeição, avanço) agora notificam RH + lista adicional em paralelo via `sendEmailToMultipleRecipients`. Logging informativo para auditoria.
- **`src/app/api/admin/leave-settings/route.ts`**: removido o campo individual do responsável (GET e POST). A UI agora mostra apenas 3 campos globais: E-mail do RH, E-mails Adicionais (lista), Prazo de Antecedência.
- **`src/app/admin/leave-settings/page.tsx`**: seção "1. Configurações Globais" reorganizada com banner informativo explicando que TODOS os e-mails configurados recebem notificações em TODAS as etapas. Campo de e-mails adicionais renomeado para "E-mails Adicionais para Notificação (DP e responsáveis)" com placeholder mostrando exemplo de lista.

### Tests
- `scripts/test-leave-advance-notice.ts` atualizado para refletir a remoção do fallback do responsável individual: 23 testes (antes 25) cobrindo as constantes restantes, funções async, validações e a nova função `getLeaveNotificationRecipients()` que combina RH + extras.

## [5.27.1] - 2026-07-03

### Added
- **Painel Admin do Módulo de Férias expandido** (`/admin/leave-settings`): agora permite configurar (sem precisar mexer em código/env):
  - E-mail do RH (já existente, mantido)
  - Lista de e-mails adicionais para notificação (separados por vírgula) — DP e demais responsáveis
  - Prazo de antecedência em dias (default 40, configurável de 1 a 365) — novo campo
  - As configurações são persistidas na tabela `app_secrets` com as chaves `LEAVE_ADVANCE_NOTICE_DAYS` e `LEAVE_EXTRA_NOTIFY_EMAILS`.
- **Endpoint público `GET /api/leave/config`**: retorna o prazo de antecedência configurado e a data mínima permitida para o frontend montar as validações client-side dinamicamente. Apenas autenticado (não exige admin), não expõe e-mails.

### Changed
- **`src/lib/leaveConfig.ts`**:
  - Adicionadas funções async `getAdvanceNoticeDays()`, `getMinLeaveStartDateAsync()`, `validateLeaveAdvanceNoticeAsync()` que leem do banco (com fallback para env e default 40).
  - Adicionadas constantes `LEAVE_ADVANCE_NOTICE_DAYS_KEY`, `LEAVE_EXTRA_NOTIFY_EMAILS_KEY` e `DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS`.
  - Versões síncronas `LEAVE_ADVANCE_NOTICE_DAYS`, `getMinLeaveStartDate()`, `validateLeaveAdvanceNotice()` mantidas para compatibilidade, marcadas como `@deprecated` quando aplicável, usando o fallback default.
- **`src/lib/secure-credentials.ts`**: adicionada função `clearCredentialCache(key?)` para invalidar o cache em memória após escrita direta no banco via painel admin.
- **`src/app/api/admin/leave-settings/route.ts`**: GET/POST aceitam e persistem `extraNotifyEmails` e `advanceNoticeDays`. Limpa o cache de credenciais após cada escrita.
- **`src/app/api/leave/requests/route.ts`**: validação do prazo agora usa `validateLeaveAdvanceNoticeAsync()` que lê do banco.
- **`src/app/ferias/page.tsx`**: carrega as configurações do endpoint `/api/leave/config` no mount e usa os valores carregados para o banner âmbar, atributo `min` do input de data e validação client-side.

## [5.27.0] - 2026-07-03

### Added
- **Reembolso Inteligente - Validação de Valores por Tipo**: Novo módulo `src/lib/reimbursementValidation.ts` centraliza limites por tipo de despesa (alimentação: R$ 2.000, transporte: R$ 1.000, hospedagem: R$ 5.000, combustível: R$ 1.000, material: R$ 5.000, outros: R$ 10.000) e total máximo por solicitação (R$ 50.000). Parser robusto aceita `1.234,56`, `1234.56`, `R$ 50,83` e números. Validação timezone-safe de datas (rejeita futuras e >1 ano).
- **Reembolso - Avisos Visuais no Form**: Banners vermelhos para valores acima do limite máximo e banners amarelos com botão "Confirmar valor" para valores acima do típico mas dentro do limite, permitindo que o usuário confirme valores legítimos altos sem bloquear a entrada.
- **Férias - Alertas automáticos por e-mail**: Sempre que uma nova solicitação de férias é aberta, e-mails automáticos são enviados para o RH e para a lista de e-mails adicionais configurada via painel admin. Quando aprovada, o colaborador recebe um e-mail confirmando que as férias foram "programadas conforme solicitado", com o período detalhado. Lista configurável via credencial `LEAVE_EXTRA_NOTIFY_EMAILS` ou variável de ambiente (separados por vírgula).
- **Férias - Prazo de antecedência de 40 dias**: Implementado o prazo mínimo de 40 dias de antecedência para a data de início das férias (solicitação do DP para cumprimento do prazo legal de processamento). Novo módulo `src/lib/leaveConfig.ts` com `LEAVE_ADVANCE_NOTICE_DAYS` configurável via env, `validateLeaveAdvanceNotice()`, `getMinLeaveStartDate()` e `formatDatePTBR()`.
- **Férias - Validação server-side do prazo**: `POST /api/leave/requests` valida a data de início do primeiro período contra o prazo de antecedência e retorna `400` com `code: INSUFFICIENT_ADVANCE_NOTICE`, `minDate` sugerida e `requiredDays` quando rejeitado.

### Changed
- **CurrencyInput - Modo decimal intuitivo**: Substituído o `handleBankingStyleInput`/`formatBankingValue` por `formatDecimalInput` onde `50,83` vira `R$ 50,83` (em vez do "formato bancário" onde `50` virava `R$ 0,50`). Valor é normalizado para `X,XX` no blur. Adicionado `inputMode="decimal"` para abrir o teclado numérico correto no mobile.
- **MultipleExpenses - UX aprimorada**: Removido o texto confuso `* Formato bancário: Digite os números (ex: "50" = R$ 0,50 | "5000" = R$ 50,00)`. Adicionado banner informativo sobre o formato correto (vírgula como separador de centavos). Mostra o limite máximo da categoria abaixo do seletor de tipo.
- **ReimbursementForm - Data com max**: Input de data com `max={getTodayDateString()}` impede seleção de datas futuras no calendário. Valor total enviado ao backend no formato pt-BR (`1.234,56`) para o parser do backend funcionar corretamente.
- **FormFields - InputField com max/min**: InputField agora forward `max`/`min` para o `<input>` subjacente, permitindo limitar seleção de datas.
- **Férias - Email de aprovação mais explícito**: O e-mail de "Férias Aprovadas" agora menciona explicitamente que as férias estão "programadas conforme solicitado" e inclui badges para Abono Pecuniário e 1ª parcela do 13º quando aplicável.
- **Férias - Aviso visual no modal**: O modal "Nova Solicitação de Férias" agora exibe um banner âmbar explicando o prazo de 40 dias de antecedência e mostrando a data mais próxima permitida. Input de "Data de Início" do primeiro período tem `min` configurado para impedir seleção no calendário, com feedback vermelho inline quando o usuário digita uma data próxima.

### Fixed
- **Reembolso - Bug do "formato bancário"**: Corrigido o bug onde digitar `5000,83` (esperando R$ 5000,83) resultava em R$ 5.000.083,00. O novo parser interpreta diretamente o que o usuário digita, com vírgula como separador de centavos.
- **Reembolso - Valores absurdos aceitos**: Corrigido o bug onde uma despesa de alimentação de R$ 5.000.083,00 ou R$ 50.000,83 era aceita sem qualquer alerta. Agora é rejeitada no formulário, no schema e na API.
- **Reembolso - Datas futuras aceitas**: Schema validava mas o calendário permitia selecionar datas futuras. Agora o input tem `max=today` e o schema valida com timezone-safe.
- **Férias - Erro tratado no submit**: Quando a API retorna erro de validação (ex: prazo insuficiente), o erro agora é exibido via toast em vez de mostrar apenas "Failed to submit" genérico.

### Tests
- `scripts/test-reimbursement-validation.ts`: 42 testes unitários cobrindo parsing de valores, formatação, validação por tipo, validação total e validação de data.
- `scripts/test-leave-advance-notice.ts`: 16 testes unitários cobrindo configuração de 40 dias, cálculo de data mínima, validação de antecedência e fallback de emails extras.

## [5.26.5] - 2026-07-01

### Fixed
- **Voice Audio Server (TTS Output)**: Synchronized `audio_server.py` with the locally-tested corrected version. Critical fixes:
  - **DEFAULT_VOICE** changed from `M1` to `F1` (better Portuguese pronunciation quality).
  - **NumPy array handling**: Replaced naive `flatten()` with robust multi-dimensional array squeeze + 1D mono enforcement. Prevents `ValueError` and distorted audio when Supertonic 3 returns arrays with shapes like `(1, N)` or `(2, N)`.
  - **Dynamic sample rate inference**: Instead of hardcoding `22050` (incorrect for Supertonic 3), the server now calculates the actual sample rate from the synthesized audio duration and number of samples, falling back to `24000` Hz. Produces correct playback speed.
  - **Duration logging fix**: Removed `:.2f` format specifier that caused `TypeError` when `duration` is a numpy array instead of a float.
  - **Heuristic language detection**: TTS endpoint now detects Portuguese vs English input from common English words, instead of always forcing `lang="pt"`. Prevents garbled pronunciation of English phrases.

- **Voice Agent (STT & Greeting)**: Synchronized `agent.py` with the locally-tested corrected version:
  - **STT language forced to `pt`**: `openai.STT` now receives `language="pt"` parameter to prevent Whisper hallucinations and unwanted English translations of Portuguese speech.
  - **Greeting disabled**: Commented out `session.generate_reply()` greeting that caused HTTP 500 errors. The Qwen LLM via llama.cpp requires `role=user` in Jinja template context; system-only prompts from `generate_reply` crash the Jinja renderer. The user now initiates the conversation.

### Added
- **Voice Agent Auto-Restart Script**: Added `run_agent_loop.sh` to the repository. Wraps `agent.py start` in a `while true` loop with 2-second backoff. Automatically restarts the LiveKit Agent if it crashes or disconnects, ensuring voice service availability without manual intervention.

## [5.26.4] - 2026-07-01

### Fixed
- **Voice Pipeline Stability**: Comprehensive fixes for the LiveKit Voice Agent pipeline:
  - Fixed TTS `response_format` to use `pcm` instead of `mp3` to comply with `livekit-plugins-openai` expectations for raw byte streaming.
  - Fixed `audio_server.py` to stream raw bytes correctly.
  - Fixed `abz_voice_manager.sh` to initialize the agent using `python3 agent.py start`.
  - Added robust error handling and status logging to the Next.js API route (`route.ts`) for proper `createDispatch` error propagation.

## [5.26.3] - 2026-07-01

### Fixed
- **Voice Agent Dependencies Versioning**: Corrected the version constraint for `supertonic` in `requirements.txt` from `>=3.0.0` to `>=1.3.0`. The python library for Supertonic 3 is versioned under `1.3.x` on PyPI, causing dependency installation failures.

## [5.26.2] - 2026-07-01

### Fixed
- **Voice Agent Dispatch**: Fixed an issue in `route.ts` where explicit dispatching to LiveKit was calling `createDispatch()` with an empty `agentName` instead of `'abz-voice'`, preventing the registered agent from joining the room.

## [5.26.1] - 2026-07-01

### Fixed
- **Voice Agent Dependencies**: Added missing `aiohttp` dependency to `requirements.txt` to prevent runtime `ModuleNotFoundError` crashes when the LiveKit voice agent invokes the Portal ABZ AI gateway API (`processar_texto`).

## [5.26.0] - 2026-06-18

### Added
- **Relatório de Estoque de EPI (PDF)**: Nova funcionalidade para geração de relatórios de estoque em formato PDF. O relatório consolida níveis de estoque atuais, alertas de estoque baixo (abaixo do mínimo) e histórico de movimentações (Entradas, Saídas, Ajustes e Devoluções).
- **Detalhamento do Relatório**: Inclusão de colunas dedicadas de CA (Certificado de Aprovação), Data de Validade do CA e Local de Armazenamento na tabela consolidada do PDF.
- **Filtros Avançados no Modal**: Adicionados filtros de Nome do EPI, Número do CA, Data Limite de Validade do CA e Estoque Máximo Permitido na interface de configuração do relatório.
- **Filtros e Estoque em Tipos de EPI**: Implementada a barra de filtros (Nome, CA, Validade, Estoque Máximo) na aba "Tipos de EPI", integrando a exibição em tempo real da quantidade em estoque e local de armazenamento no card de cada equipamento.
- **Variações de Tamanho e Sub-divisões de EPI**: Adicionada a capacidade de definir tamanhos ou sub-divisões (ex: "38, 39, 40" ou "P, M, G") no cadastro de Tipos de EPI. O sistema gera automaticamente as variações de estoque associadas a cada tamanho.
- **Cadastro Direto de Variações (Pai/Filho)**: Nova opção no modal de criação de EPI para selecionar um EPI Pai existente e cadastrar diretamente uma única variação de tamanho/medida (child), preenchendo automaticamente categoria e descrição herdadas.
- **Edição de Tipos e Variações de EPI**: Adicionada a possibilidade de editar qualquer tipo de EPI ou variação de tamanho de forma individual através do ícone de edição (lápis) nas abas administrativas, executando a atualização (PUT) em tempo real.
- **Visualização Hierárquica de Estoque**: Os cards da aba "Tipos de EPI" agora agrupam de forma hierárquica as variações de tamanho sob o EPI principal (pai), exibindo o estoque de cada tamanho individualmente, além do estoque total agregado e status de estoque baixo consolidado do equipamento.
- **Filtros e Hierarquia na Aba Estoque**: Implementados os mesmos filtros avançados (Nome, CA, Validade, Estoque Máximo) e visualização em cascata (recuada) na listagem da aba "Estoque", consolidando os dados sob o EPI pai.
- **Seletor de EPI com Busca e Grade no Estoque**: Nova caixa de seleção unificada (combobox) no modal de "Nova Movimentação". A busca por texto agora fica integrada dentro do próprio dropdown, que lista apenas os EPIs principais. Caso o EPI escolhido possua variações de tamanho, um seletor secundário é exibido para escolher a grade, agilizando e organizando a inserção.
- **Função de Reset de Dados Completa**: Atualizada a função de reset do módulo para garantir a remoção total de níveis de estoque (`epi_stock`) e histórico de movimentações (`epi_stock_movements`) no banco de dados, em conjunto com registros e assinaturas.
- **Filtros Personalizados de Relatório**: Adicionado modal para selecionar o tipo de visualização (Estoque Completo, Estoque Baixo ou Histórico de Movimentações) e filtros de data (início/fim) para o histórico.

### Changed
- **Filtros de Data na API de Estoque**: Atualizada a rota `GET /api/epi/stock` e a função `getStockMovements` do backend para aceitar filtros de data de início e fim.

## [5.25.4] - 2026-06-17

### Added
- **e-Social XML Auto-Cura (Auto-Rebuild)**: Added an automatic fallback mechanism in `preEnvioGateway.ts`. If an event stored in the database has an older, structurally broken XML (e.g., missing `<nmMed>` or `<dtExm>`), the gateway now detects the failure and forcibly completely rebuilds the XML payload right before sending, allowing older events to self-heal.
- **e-Social Safe Matrícula Sync**: Updated the e-Social processing pipeline (`consultar-lote/route.ts`). Employee matricula (`matricula_esocial`) is now safely synchronized *only* when the e-Social server returns a `PROCESSADO` (success) status for the event, avoiding contaminating the employee's registry with rejected/invalid matriculas. Removed the eager update from `corrigir-matricula/route.ts`.

### Fixed
- **S-2220 Missing Elements**: Fixed an issue where tags like `<nmMed>`, `<nrCRM>`, and `<dtExm>` could be generated completely empty despite the data existing. `eSocialService.ts` now properly merges root-level fields (which is how flat payloads structure the ASO data) with the `dadosEspecificos` payload, ensuring all required physician and exam tags are correctly populated.
- **S-2220 Strict Validator Rules**: Added strict structural validation checks for `<dtExm>` and `<nmMed>` directly inside `esocialValidator.ts` to block and report XML failures locally instead of sending them to the e-Social XSD schema validator.## [5.25.3] - 2026-06-09

### Fixed
- **S-2220 XML Schema Validation**: Resolved a schema error (`invalid child element 'resAso'`) caused by the omission of the `<dtAso>` element when date source fields are empty. Implemented robust date fallbacks including additional fields (`esp.dtAso`, `esp.data_aso`, `esp.dataAso`) and a default fallback to the current date.

## [5.25.2] - 2026-06-09

### Added
- **e-Social Matrícula Correction Workflow**: Added a `matricula_esocial` column to the `gt_colaboradores` table to store confirmed e-Social registration numbers (in case they mismatch local MIO/WK records).
- **Correct Matrícula API**: New POST endpoint `/api/e-social/corrigir-matricula` that allows correcting an employee's matrícula, updating `gt_colaboradores.matricula_esocial`, and automatically regenerating the event XML and resetting it to review status.
- **Badges and Warnings in Modal**: Modified `NovoEventoModal.tsx` to query and show badges indicating if a matrícula is confirmed in e-Social, imported from MIO/WK, or missing altogether.
- **Correction UI Banner**: Modified `EventoRevisao.tsx` to detect "contract not found" errors returned by the government, displaying a warning banner with clear portal-lookup instructions and a 1-click text input to correct the matrícula and recompile the XML.

### Changed
- **Matrícula Priority Logic**: Updated XML generation functions in `eSocialService.ts` and `xml-generator.ts` as well as the background generation service `eSocialAutoService` to prioritize `matricula_esocial` if it exists.
- **Pre-flight Validation**: Added a check requiring the employee's matrícula for S-2200, S-2220, and S-2240 events before submission.

## [5.25.1] - 2026-06-08

### Added
- **S-2240 Form UI & XML compliance**: Expanded `S-2240` event manual entry in `NovoEventoModal.tsx` to collect all standard fields: condition start date (`dtIniCondicao`), environment description (`dscAmb`), local environment type (`localAmb`), multiple risk factors list (`riscos` array), EPC/EPI efficacy and CA details, and technical responsible details (`respReg`). Corrected the XML generation in `eSocialService.ts` to output standard nested `<infoExpRisco>` layouts instead of invalid flat `<dadosAmb>` layouts.
- **Client-Side OCR Data Extraction**: Modified `/api/gestao-tripulantes/documentos/[id]/ocr` to automatically run `extrairDadosTexto` via regex parser and populate structured document data when receiving raw pre-extracted text (`clientText`) from the browser.

### Changed
- **UF CRM Select Expansion**: Expanded the doctor UF dropdown list from 11 states to include all 27 Brazilian states.
- **e-Social Deduplication Hardening**: Added `'pendente_revisao'` to duplicate check in `/api/gestao-tripulantes/documentos/[id]/esocial` to prevent duplicate event submissions on rapid click spamming.

## [5.25.0] - 2026-05-29

### Added
- **GT Man Schedule Tab**: New `GTManScheduleTab` component (1000+ lines) embeds the Man Schedule directly into the Gestão de Tripulantes page with a tab system (Matriz de Conformidade / Man Schedule). Includes full filtering, vessel/position/company selectors, export to XLSX, and click-to-open collaborator details.
- **Client-Side Tesseract.js OCR**: `pdf-to-images-client.ts` now loads Tesseract.js v5.1.0 from CDN for client-side OCR on scanned PDFs and images. New `extractTextFromPdfOrImageClient()` unified function extracts text from digital PDFs (text layer) or runs Tesseract on scans, entirely in the browser.
- **OCR Text Flow**: `/api/gestao-tripulantes/documentos/[id]/ocr` now accepts a `text` field directly from client-extracted text, alongside the existing `images` array. Enables client-side Tesseract extraction without LLM Vision overhead.
- **ASO Tab — e-Social Event Display**: `ASOTab` now shows both regular ASO documents AND direct e-Social S-2220 events that aren't linked to a document. Displays combined ASO count. Auto-runs OCR after document upload to trigger reassociation.
- **Colaborador API — e-Social ASOs**: `GET /api/gestao-tripulantes/colaboradores/[id]` now fetches e-Social S-2220 events for the collaborator's CPF, returned as `esocial_asos` array.

### Changed
- **Man Schedule Real-Time Fallback**: `GET /api/man-schedule/realtime` now requires JWT authentication. When cache is empty or incomplete, fetches data directly from MIO API in real-time and updates cache in background. Also integrates local/manual embarkations from `gt_historico_embarques`.
- **MIO Cache Selective Update**: `POST /api/mio/cache/atualizar` now supports selective type updates via query parameter (`?tipo=integrantes,lgp_reports`) or body field. Per-type rate limiting (10s per type). Response includes `updated` and `skipped` arrays.
- **MIO Enrich Cache Freshness**: Both `colaboradores/route.ts` and `eSocialAutoService.ts` now check cache freshness (5-minute threshold) before falling back to direct MIO API. Prevents unnecessary API calls when cache is recent.
- **Gestão de Tripulantes Page**: Redesigned with full-width layout and tab system for Matriz de Conformidade vs Man Schedule views.
- **ASOTab OCR Flow**: OCR now sends extracted text instead of images to the API, using client-side Tesseract for scan detection and digital text extraction.

### Fixed
- **e-Social S-2220 ordExame Field**: XML generation now includes `ordExame` (exam order) field with proper parsing from string ("inicial"/"sequencial") or number formats. Correctly distinguishes admissional (1) vs other exam types.

## [5.24.1] - 2026-05-29

### Added
- **ImportarASOModal — Client-Side PDF Rendering**: e-Social ASO import modal now renders PDFs in the browser via Canvas API before sending to OCR, matching the client-side approach used in ASOTab and TreinamentosTab. Progress bar shows real-time status during rendering and OCR processing.
- **ASO Auto-Reassociation by CPF/Name**: `extrairDadosASODoTexto()` now checks if the extracted CPF or full name belongs to a different collaborator. If a match is found, the document is automatically reassigned to the correct collaborator (`gt_documentos.colaborador_id` updated). Logs reassociation action for audit trail.

## [5.24.0] - 2026-05-29

### Added
- **Client-Side PDF Rendering**: New `pdf-to-images-client.ts` library renders PDF pages to JPEG images directly in the browser using PDF.js + Canvas API. Resolves Vercel serverless limitation where native `canvas` module is unavailable. Each page is rendered at configurable scale (default 1.5x) with JPEG compression (quality 0.82).
- **Client-Rendered OCR Pipeline**: New `processarImagensPreRenderizadas()` function processes browser-rendered images via LLM Vision. Supports multi-page PDFs (up to 5 pages) sent in a single LLM request with automatic fallback to individual page processing if the model rejects batch input.
- **ASO Tab — Client-Side OCR**: `ASOTab` component now renders PDFs in the browser before sending to OCR API. Shows real-time progress status ("Renderizando PDF no navegador...", "Enviando para IA..."). Supports both PDF and image documents.
- **Treinamentos Tab — Client-Side OCR**: `TreinamentosTab` component now uses client-side PDF rendering for OCR processing, matching the ASO Tab behavior.
- **OCR API — Dual Flow**: `/api/gestao-tripulantes/documentos/[id]/ocr` now accepts both client-rendered images (new flow) and server-side processing (legacy). Automatically detects request format and routes accordingly.

### Changed
- **OCR Route Timeout**: `maxDuration` increased from 120s to 300s (5 minutes) for LLM vision processing of large documents.
- **OCR Export**: Added `processarImagensPreRenderizadas` to OCR module exports.

## [5.23.8] - 2026-05-29

### Fixed
- **OCR Tesseract.js Serverless Detection**: Added `isServerless` environment detection (`VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`) to skip Tesseract.js in serverless environments. Tesseract.js uses WASM which doesn't work on Vercel/AWS Lambda. LLM Vision remains the primary strategy for scanned PDFs in production, with local Tesseract fallback only available in Node.js/development environments.
- **OCR Image Processing Pipeline**: Updated `processarDocumentoOCR()` to respect serverless detection — Tesseract fallback for images is now skipped in serverless, falling back to raw text extraction instead.

## [5.23.7] - 2026-05-28

### Changed
- **OCR LLM Vision — PDF-to-Image Conversion**: New `converterPDFParaImagens()` function converts PDF pages to PNG using pdfjs-dist + canvas before sending to LLM Vision. Supports multi-page PDFs (up to 5 pages). Each page is rendered at 2x scale for optimal OCR accuracy. Falls back to direct PDF send if conversion fails.
- **OCR LLM Vision — Multi-Image API Payload**: `extrairTextoViaLLMVisao()` now sends multiple image buffers in a single LLM request when processing multi-page PDFs. Content parts array contains one text prompt + N image_url entries (one per page), replacing the previous single-image approach.
- **OCR PDF Pipeline — Streamlined Cascade**: Simplified `ocrPdfDigitalizado()` by moving PDF-to-image conversion into the LLM Vision strategy. Strategy 3 (pdfjs-dist + Tesseract) now serves as local-only fallback without per-page canvas rendering duplication.
- **IA Sessions — Auto-Cleanup**: `GET /api/ia/sessions` now automatically soft-deletes sessions inactive for more than 30 days. Runs on each list request, keeping session history clean.
- **IA Context Manager — LRU Eviction**: Memory store now caps at 100 concurrent users. When capacity is exceeded, the least-recently-updated user's cache is evicted to prevent memory leaks in long-running processes.

## [5.23.6] - 2026-05-28

### Changed
- **OCR LLM Vision — Multi-Format Support**: `extrairTextoViaLLMVisao()` now accepts a `mimeType` parameter, enabling LLM Vision to process not only PDFs but also images (PNG, JPG, WebP, GIF). Images are now processed via LLM Vision first (90% confidence) with Tesseract as fallback, significantly improving OCR accuracy on image-based documents.
- **OCR PDF Pipeline — Per-Page LLM Vision**: Each rendered PDF page is now processed by LLM Vision first before falling back to Tesseract. This replaces the previous Tesseract-only approach for pdfjs-dist rendered pages, combining the best of both worlds: LLM understanding for complex layouts and Tesseract for reliable fallback.
- **Gestão de Tripulantes — ASO Data in Documents API**: The `GET /api/gestao-tripulantes/colaboradores/[id]` endpoint now enriches ASO documents with structured data from `gt_documentos_aso`. Clients receive `aso_data` field populated with exam details (type, result, physician, clinic) directly in the documents list.
- **OCR Extract Route — Extended Timeout**: `maxDuration` increased from 60s to 300s for the OCR extract endpoint, supporting larger scanned documents that require more processing time for multi-strategy extraction.

## [5.23.5] - 2026-05-28

### Fixed
- **OCR LLM Vision — llama.cpp mmproj Support**: Removed model-name-based vision detection that incorrectly skipped vision for llama.cpp providers. Now when `provider === 'llamacpp'`, LLM Vision is always attempted (users who configure llama.cpp with mmproj intend to use vision). Cloud/lmstudio providers still use model-name detection as fallback. This fixes the "Modelo não parece suportar visão" false negative for custom llama.cpp setups with multi-modal projection.

## [5.23.4] - 2026-05-28

### Fixed
- **OCR LLM Vision — Non-Vision Model Detection**: `extrairTextoViaLLMVisao()` now detects whether the configured LLM model likely supports vision before attempting to send images. Checks model name against known vision models (GPT-4o, Claude 3/4, Gemini, LLaVA, etc.). Non-vision models (llama.cpp text-only, DeepSeek-V3, etc.) are skipped early with a clear log message, avoiding unnecessary 400/500 errors from the LLM server. Removed unsupported `type: "file"` content format that caused "unsupported content[].type" errors with most providers.
- **PoliWeb ASOs Pendentes — Config Error Handling**: Changed HTTP status from 500 to 503 (Service Unavailable) when PoliWeb is not configured. Added `configured: false` flag and `hint` field in response with setup instructions. Added `maxDuration = 120` for longer processing. Improved error message in catch block.

## [5.23.3] - 2026-05-28

### Fixed
- **OCR PDF Pipeline — Scanned PDF Fix**: Complete rewrite of `ocrPdfDigitalizado()` to fix failure on scanned PDFs (no text layer) in Vercel/serverless environments.
  - **LLM Vision Multi-Format**: `extrairTextoViaLLMVisao()` now tries multiple API formats for maximum provider compatibility: first `type:"file"` with `file_data` (OpenAI/Claude format), then `type:"image_url"` with PDF data URI. Each format is tried independently with proper error handling.
  - **CDN Worker for pdfjs-dist**: Strategy 3 now uses CDN-hosted worker URL (`cdnjs.cloudflare.com`) instead of local file path, enabling pdfjs-dist to work on Vercel where local worker files are not included in the serverless bundle.
  - **Direct Tesseract Fallback**: Added strategy 4 — sends raw PDF buffer directly to Tesseract.js as last resort before throwing error.
  - **Improved Error Messages**: Error message now distinguishes between "scanned document without selectable text" and "LLM not configured", guiding users to the correct fix.
  - **Better Logging**: Each strategy logs its attempt and result, making it easier to diagnose which step fails in production.

## [5.23.2] - 2026-05-28

### Changed
- **API Routes Dynamic Rendering**: Added `export const dynamic = 'force-dynamic'` to 15 API routes (leave-approvals, leave-settings, leave-requests, auth/exchange, avaliacao/[id], avaliacao/settings, ia/autonomous/control, ia/chat, ia/config, ia/dashboard, ia/feature-toggles, ia/knowledge-base, ia/models, ia/sessions, user/integrations). Prevents Next.js from caching responses and ensures fresh data on every request.

## [5.23.1] - 2026-05-28

### Changed
- **OCR API Error Responses**: All 4 OCR API routes (`gestao-tripulantes/ocr`, `gestao-tripulantes/ocr/extract`, `ocr/document/process`, `ocr/extract`) now return the actual error message instead of generic "Erro interno do servidor".
- **OCR Route Timeout**: Added `maxDuration = 120` to gestão de tripulantes OCR route for extended processing on large documents.

### Fixed
- **pdf-parse Import Path**: Fixed import from `pdf-parse/lib/pdf-parse.js` to `pdf-parse` (2 locations in `ocr-processor.ts`).
- **Supabase Storage Auth**: `obterConteudoArquivo()` now sends `Authorization: Bearer <service_role_key>` header when downloading files from `supabase.co/storage/` URLs, preventing 403 errors on private buckets.

## [5.23.0] - 2026-05-28

### Added
- **LLM Vision OCR Strategy**: New `extrairTextoViaLLMVisao()` function sends PDF as base64 image to a vision-capable LLM (DeepSeek/Qwen/etc.) for text extraction. Works in any environment (Vercel, local, serverless) — requires only an HTTP call. Handles `<think>` block removal and returns extracted text.

### Changed
- **OCR PDF Pipeline Restructured**: 3-strategy cascade updated:
  1. **pdf-parse custom render** — Primary, serverless-safe text extraction
  2. **LLM Vision** — New middle tier, sends PDF as base64 to vision model, 90% confidence
  3. **pdfjs-dist + canvas + Tesseract** — Local-only fallback (dev/Node environments)
- Removed direct Tesseract.js fallback on raw PDF buffer (unreliable). Error message now suggests configuring LLM vision or using selectable-text PDFs.

## [5.22.0] - 2026-05-28

### Changed
- **OCR PDF Pipeline Complete Rewrite**: `ocrPdfDigitalizado()` now uses a 3-strategy cascade for maximum compatibility across environments:
  1. **pdf-parse with custom render**: Primary strategy using `pdf-parse/lib/pdf-parse.js` with a custom `pagerender` function that captures all text items with Y-coordinate-aware line breaking. Serverless-safe, no worker dependency.
  2. **pdfjs-dist + canvas**: Fallback for local/Node environments only. Checks `pdf.worker.mjs` existence before importing pdfjs-dist. Includes binarization (threshold=128) for improved OCR accuracy on scanned pages.
  3. **Tesseract.js direct**: Last-resort fallback processes the raw PDF buffer through Tesseract when both pdf-parse and pdfjs-dist fail.
- **Next.js Server Configuration**: Removed `outputFileTracingIncludes` for pdfjs-dist. Added `pdf-parse` to `serverComponentsExternalPackages`. Added webpack externals for `canvas` and `pdfjs-dist` on server side to prevent bundling issues.

## [5.21.2] - 2026-05-28

### Changed
- **Next.js Output File Tracing**: Added `outputFileTracingIncludes` for `pdfjs-dist` build files in `next.config.js`. Ensures PDF.js worker (`pdf.worker.mjs`) is properly bundled for serverless/Vercel deployments.
- **OCR PDF Worker Configuration**: Removed manual `GlobalWorkerOptions.workerSrc` setup in `ocr-processor.ts`. PDF.js now resolves its fake worker internally, relying on Next.js output tracing to include the correct files.

## [5.21.1] - 2026-05-28

### Changed
- **OCR LLM Prompt Refinement**: Enhanced ASO extraction prompt with 9 business rules. Added "Empresa x Clinica" rule to prevent contractor company (ABZ/aguas) from being misidentified as the clinic. CNPJ field marked as optional. Medical examiner vs PCMSO coordinator distinction clarified.
- **Next.js Server External Packages**: Added `pdfjs-dist` and `canvas` to `serverComponentsExternalPackages` alongside existing `tesseract.js` for proper server-side rendering of PDF and image processing modules.

## [5.21.0] - 2026-05-28

### Added
- **Authentication Hardening for Leave APIs**: All vacation/leave API endpoints now require JWT token authentication via `Authorization: Bearer` header. Endpoints validate caller identity and ACL permissions before processing requests. Affected routes: `leave-approvals`, `leave-requests`, `leave-settings`, `ferias/admin-access`, `leave/requests`.
- **`checkAclPermission()` Function**: New centralized ACL permission checker in `src/lib/auth.ts`. Queries PostgreSQL with JOINs across `acl_permissions`, `user_acl_permissions`, and `role_acl_permissions` tables. Supports both individual (with expiration) and role-based permissions. Admins always return `true`.
- **Global Leave Access**: `leaveService.ts` now accepts `hasGlobalAccess` parameter. When `true`, admins/managers see all pending requests across all sectors without sector-specific configuration. Self-approval protection remains enforced.
- **ACL → `ferias_admin` Mapping**: Effective permissions endpoint now auto-grants `ferias_admin = true` to ADMIN users and maps ACL `ferias:admin/manage` permissions to the `ferias_admin` module.
- **IA Feedback Module**: New feedback tools system for the AI assistant — `buscar_feedbacks`, `atualizar_status_feedback`, `excluir_feedback` (ADMIN only). Module registered in IA config manager with 💬 icon. Context builder injects pending feedback count for admin users.
- **IA Contract/Attendance Tools**: New tools `obter_link_contracheque` (external WK Radar WebNet link), `buscar_contratos` (contract documents with role-based filtering), `buscar_ponto` (employee attendance records), `buscar_lista_presenca` (available attendance lists).
- **OCR LLM Extraction**: `ocr-processor.ts` now supports intelligent ASO data extraction via LLM (DeepSeek/Qwen). Sends raw OCR text with structured prompt, parses JSON response, and merges with regex results (LLM takes priority). Handles thinking blocks and markdown formatting.
- **3 New IA Module Configs**: `feedback`, `contratos`, and `lista-presenca` modules added to default IA configuration with appropriate read/write role assignments.

### Changed
- **OCR Processor Priority**: In `gestao-tripulantes/ocr-processor.ts`, LLM-extracted data now takes priority over regex extraction for exam type, result, date, physician data, clinic name, and exam list. Regex serves as fallback only.
- **Auth Context Resilience**: `SupabaseAuthContext.tsx` now implements 5-layer try/catch fallback pattern for profile queries. If `sectors` table join fails, falls back to plain `select('*')`. Prevents authentication failures due to missing tables or RLS issues. `sessionStorage.clear()` added on logout.
- **UserEditor ACL Persistence**: ACL permission changes are now batched and persisted on form submit instead of per-click. Reduces database calls from N (one per toggle) to 1 (on save). Includes diff-based add/remove logic.
- **IA Context Builder**: Enhanced with feedback data injection for admins, updated tool usage instructions for contracts, attendance, and paystub access. Simplified pendencias instructions to use `buscar_dados_usuario` with "resumo" type.
- **Leave Requests API**: Now validates JWT token, checks ADMIN role or ACL `ferias:admin/manage` permission for listing/deleting all requests.
- **Leave Settings API**: Now requires ADMIN role for reading/modifying vacation settings.
- **Leave Approvals API**: Validates that the caller is the actual approver (not just any admin) and checks ACL permissions.

### Fixed
- **`requireModule` Corrections**: Fixed wrong module names in IA tools — `reembolsos` → `reembolso`, `avaliacoes_desempenho` → `avaliacao`, `suprimentos` → `compras` (3 tools).
- **OCR RG/CPF False Positive**: `ocr-processor.ts` now cleans both RG and CPF (removes dots, spaces, dashes) and checks if extracted RG is contained within CPF — discards false matches.
- **OCR Birth Date Extraction**: Now uses prefix-specific regex (`DN`, `NASC`, `NASCIMENTO`, etc.) first, then falls back to generic date regex with year < 2015 filter to prevent exam dates from being mistaken for birth dates.
- **PDF.js Worker Check**: Added `fs.existsSync(workerPath)` verification before configuring PDF.js worker. Uses fake worker fallback in serverless/Vercel environments.

### Removed
- **`analisar_kpis_negocio` Tool**: Removed from IA tools (feature toggle `kpi_analysis` removed).

## [5.19.0] - 2026-05-25

### Added
- **Enhanced Contract Signing Identity Validation**: New multi-factor identity verification layer for electronic signatures. Server-side validation now checks CPF format, email match, CPF match, and birth date match before allowing signature. Returns distinct error codes for each validation failure (EMAIL_MISMATCH, CPF_MISMATCH, BIRTH_DATE_MISMATCH).
- **Centralized Identity Utility (`src/lib/utils/identity.ts`)**: New shared identity helper library providing `normalizeCpf()`, `formatCpf()`, `isValidCpf()`, `maskCpf()`, `namesMatch()` (fuzzy name comparison), `formatBirthDate()`, and `birthDatesMatch()` for consistent identity handling across frontend and backend.
- **Signer Identity Fields in Database**: Added `birth_date` to `users_unified`, `external_signer_tax_id` and `external_signer_birth_date` to `solicitacoes_assinatura` with proper indexes for strong identity verification.
- **Enhanced Signature Auth Page**: 6-layer frontend validation (required fields, CPF format, email match, CPF match, birth date match, fuzzy name match) with per-field error styling and progressive validation feedback.
- **Pending Fields Blocker**: Signature page now blocks submission until all text/checkbox fields are filled, with warning banner listing unfilled fields and direct links.
- **Profile Page Identity Fields**: New CPF (auto-masked) and birth date fields on the profile page for self-registration of identity data used in electronic signatures.
- **Contract Detail Signer Identity**: Added CPF (auto-formatting) and birth date inputs for external signer assignment with identity reinforcement.

### Changed
- **Contract Assign API**: Now accepts `external_signer_tax_id` and `external_signer_birth_date`, normalizes CPF and email before storage.
- **Contract Sign API**: Extended audit metadata to store `assinante_data_nascimento` alongside CPF.
- **Sign Access Token API**: Response now includes `target_birth_date` for frontend validation.

### Fixed
- **News Post Editor**: Protected against downgrading published posts to draft status — published posts can no longer be accidentally reverted to draft.

## [5.18.0] - 2026-05-25

### Added
- **E-Social Compliance Module**: Complete integration with Brazilian government's e-Social system for digital transmission of labor, tax, and social security obligations.
  - **Event Management**: Full CRUD for e-Social events (S-2200, S-2205, S-2206, S-2210, S-2220, S-2230, S-2240, S-2298, S-2299, S-2300, S-2399, S-2400, S-3000).
  - **XML Generation**: Automatic XML generation for supported events with proper headers, namespaces, and event IDs following official e-Social layouts (v1.3).
  - **Digital Signing**: Enveloped XML digital signing using `xml-crypto` with RSA-SHA256 algorithm and X509 certificates.
  - **SOAP Web Service Integration**: Mutual TLS communication with e-Social production/homologation environments using PFX digital certificates.
  - **Certificate Management**: Upload, activate/deactivate, and manage A1/A3 digital certificates with AES-256-CBC encrypted password storage in Supabase.
  - **Event Lifecycle**: Complete status flow (draft → pending review → approved/rejected → queued → sending → sent → processed/error/returned).
  - **Review Workflow**: Approval/rejection queue with detailed error processing.
  - **Dashboard**: Summary metrics with real-time event counts by status.
  - **Configuration**: Environment selection (homologation/production), web service URLs, timeout settings, and autonomy controls.
  - **ASO Import Pipeline**: Multi-step import with PDF upload, OCR extraction, data review, and S-2220 event generation.
  - **Official Tables**: Import and lookup of Tabela 27 (medical exam codes) and Tabela 50 (CBO occupation codes) from CSV.
  - **Risk Factors**: Seeded database of 22 occupational risk factors for S-2240 events.
  - **Auto-Generation Service**: Automatic S-2200 and S-2240 event generation when collaborators are registered, with MIO enrichment.

- **Global OCR Module**: New document processing pipeline for text extraction and structured field parsing.
  - **Multi-format Support**: PDF (digital and scanned via Tesseract.js), DOCX, XLSX, TXT/CSV, and images (PNG/JPG/WebP/GIF).
  - **Field Extraction**: Intelligent extraction of CPF, RG, name, birth date, CTPS, CNH, PIS/PASEP, address, CEP by document type.
  - **ASO-specific Extraction**: Type of exam, result (apto/inapto/apto_condicional), exam date, physician data (name, CRM, UF), clinic data (CNPJ, name), and complementary exam codes.
  - **Configurable Pipeline**: Quality settings, language selection (default: Portuguese), and external fallback API support.

- **New Dependencies**: `node-forge` (certificate crypto), `tesseract.js` (OCR engine), `xml-crypto` (XML signing).

### Changed
- **Admin Layout**: Added E-Social and Gestão de Tripulantes entries to admin menu navigation.
- **Cards API**: Added icon mappings for `gestao-tripulantes` (FiUsers) and `e-social` (FiBriefcase).

### Database
- **e-Social Tables**: `esocial_eventos_catalogo`, `esocial_eventos`, `esocial_certificados`, `esocial_configuracoes`, `esocial_envios_log`, `esocial_fatores_risco`, `esocial_tabela_27`, `esocial_tabela_50` with RLS policies.
- **OCR Config**: `settings` table seeded with global OCR configuration.
- **Storage Bucket**: `esocial-certificados` for encrypted PFX certificate storage.

## [5.17.0] - 2026-05-25

### Added
- **Gestão de Tripulantes Module (Crew Management)**: Complete offshore crew management system with comprehensive data model and workflows.
  - **Collaborator Management**: Full CRUD with 7-tab registration form (Personal Data, Documents, Address, Contact, Banking, Employment Bond, e-Social).
  - **Employee Matrix**: Interactive table (`GTMatrix`) with filters (company, vessel, position, cost center, status, standby, expiring documents), color-coded status badges, and real-time search.
  - **Document Management**: Upload, OCR, and validation for 14 document types (ASO, training, passport, CNH, birth/marriage certificates, CTPS, etc.) with automatic validity calculation and expiry notifications.
  - **ASO Pipeline**: Import ASO documents via PDF upload + OCR → data review → e-Social S-2220 event generation.
  - **Embarkation History**: Complete timeline with vessel, type (normal/substitution/double rotation/standby/training), dates, flights, and statistics.
  - **Back-Substitution Algorithm**: Intelligent replacement suggestion system with 8 weighted criteria (30pts cost center, 20pts company, 15pts vessel, 10pts position, 35pts standby, etc.).
  - **Dashboard**: Real-time metrics (total collaborators, onboard, available, expiring documents).
  - **MIO Bidirectional Sync**: Full integration with MIO ERP — import collaborators, training records, embarkations; export manually created collaborators; auto-link by CPF.
  - **PoliWeb Scraper**: Automated ASO import from PoliWeb occupational clinic system with deduplication and e-Social event generation.
  - **Notifications**: Automated expiry warnings (configurable days in advance), embarkation alerts, and substitution notifications via in-app, email, and push channels.
  - **Admin Configuration**: 8-tab admin panel (General, MIO Integration, PoliWeb, Notifications, OCR, Back Algorithm, Autonomy, Dashboard).
  - **Permission System**: 8 granular features (view, manage, admin, documents.edit, documents.ocr, back.suggest, poliweb.scrape, notifications.manage).

### Database
- **Crew Management Tables**: 13 tables with `gt_` prefix — `gt_centros_custo`, `gt_empresas`, `gt_embarcacoes`, `gt_cargos`, `gt_colaboradores` (50+ columns), `gt_documentos`, `gt_documentos_aso`, `gt_documentos_treinamento`, `gt_historico_embarques`, `gt_historico_substituicoes`, `gt_notificacoes_log`, `gt_cron_log`, `gt_configuracoes`.
- **Views**: `gt_vw_colaboradores_completo` (with JOINs to all related tables + subqueries for document counts), `gt_vw_dashboard_resumo` (aggregated metrics).
- **Storage Bucket**: `gestao-tripulantes-documentos` for document file storage.
- **Additional Columns**: 50+ cadastro fields added to `gt_colaboradores` (RG, CTPS, CNH, PIS/PASEP, voter registration, certificates, salary, contract type, shift patterns).
- **PCMSO Fields**: Medical coordinator and UF columns added to `gt_documentos_aso`.

### API
- **18 REST Endpoints**: Health check, CRUD for cargos/centros_custo/empresas/embarcacoes/colaboradores, documents (upload/CRUD/OCR/e-Social), dashboard, configurations, PoliWeb integration, back suggestion algorithm, notifications, and cron jobs.

## [5.16.0] - 2026-05-25

### Added
- **MIO Cache System**: Unified caching layer that replaces direct MIO API calls with a Supabase-backed cache, polled every 15 seconds for real-time data availability.
  - **Cache Architecture**: `mio_cache` Supabase table with 4 data rows (`integrantes`, `treinamentos`, `embarques`, `lgp_reports`) + `__meta__` row for sync tracking.
  - **Update Endpoint (`POST /api/mio/cache/atualizar`)**: Fetches all MIO data in parallel (4 simultaneous requests), respects 10-second rate limit, requires ADMIN/MANAGER auth.
  - **Read Endpoint (`GET /api/mio/cache`)**: Serves cached data by tipo(s), supports role-based filtering (ADMIN full, USER filtered by CPF), single or multi-tipo response.
  - **Frontend Hook (`useMIOData`)**: React hook with 15s polling interval using SWR pattern for reactive data consumption.
  - **Module Integration**: Man Schedule route (`/api/man-schedule/realtime`) migrated from direct MIO calls to cache reads; `revalidate` reduced from 60s to 10s.
  - **RLS Policies**: SELECT allowed for all roles; INSERT/UPDATE/DELETE restricted to service_role only.

- **MIO Client Enhancements**:
  - Added generic `post()` and `put()` HTTP methods for full REST support.
  - `getTreinamentos()` completely rewritten with full Portuguese-to-English field mapping (34 fields).
  - `getEmbarques()` enhanced with rich field mapping (20+ fields: RT{P,E} status, flight info, cost centers, project numbers).
  - New `getAllTreinamentos()` and `getAllEmbarques()` methods for bulk cache sync.
  - New `MIOEmbarque` and `MIOASO` TypeScript interfaces with comprehensive field definitions.

- **MIO Sync Rewrite (`src/lib/mio/sync.ts`)**: Complete employee provisioning pipeline.
  - Creates Supabase Auth users and `users_unified` records for MIO employees not in the database.
  - Auto-creates default permissions for 9 modules (dashboard, manual, procedimentos, politicas, calendario, noticias, reembolso, contracheque, ponto).
  - Logs access history with REGISTERED action and protocol tracking.
  - Sends email verification links for users with valid email addresses.
  - Deduplication logic prevents duplicate user creation.
  - Active/inactive status synced from MIO `situacao` field.

### Changed
- **MIO Types**: `MIOTreinamento` expanded from 8 to 34 fields; new `MIOEmbarque` (20+ fields) and `MIOASO` interfaces added.
- **Man Schedule**: Now reads from `mio_cache` instead of direct MIO API calls; faster refresh (10s revalidate).

## [5.15.0] - 2026-05-25

### Added
- **New Dependencies**:
  - `node-forge` (^1.4.0) — Certificate cryptography and PFX/P12 decoding for E-Social digital signatures.
  - `tesseract.js` (^7.0.0) — OCR engine for document text recognition (ASOs, passports, certificates).
  - `xml-crypto` (^6.1.2) — XML digital signing for E-Social event transmission.
  - `@types/node-forge` (^1.3.14) and `@types/xml-crypto` (^1.4.6) for TypeScript support.

- **ACL Hierarchical System Extension**: Enhanced permission system with new module support for Gestão de Tripulantes and E-Social.
  - **8 Gestão de Tripulantes Permissions**: `view`, `manage`, `admin`, `documents.edit`, `documents.ocr`, `back.suggest`, `poliweb.scrape`, `notifications.manage`.
  - **5 E-Social Permissions**: `view`, `prepare`, `review`, `send`, `admin`.
  - **Role Defaults**: ADMIN gets all permissions for both modules; MANAGER gets selective GT permissions + esocial.view; USER gets none.
  - **Layer 4 ACL in Effective Permissions**: New permission layer reads from `user_acl_permissions` + `role_acl_permissions` tables, maps to `acl_permissions` resources, and enables modules accordingly. Graceful fallback if ACL tables don't exist.
  - **Reactive ACL Loading**: Auth context now loads ACL modules on mount, listens for `permissions-updated` window events, and re-fetches on profile updates.
  - **Permission Change Events**: `useACLPermissions` hook dispatches custom `permissions-updated` event after successful permission mutations.

- **i18n Localization**: Complete Portuguese and English translations for both new modules.
  - **`gestaoTripulantes` namespace**: ~233 entries covering all UI text (filters, table, legend, status, profile tabs, documents, OCR, embarkations, substitutions, back algorithm, notifications).
  - **`eSocial` namespace**: ~233 entries covering event management, review, certificates, configuration, and dashboard.
  - **Menu and module list entries**: `menu.gestaoTripulantes`, `modules.gestao-tripulantes`, `modules.e-social`.

- **Database Schema Extension**: Added `birth_date` column to `users_unified` table (DATE, nullable) with index for identity validation in electronic signatures.

### Changed
- **Next.js Configuration**: Added `serverComponentsExternalPackages: ['tesseract.js']` to enable native Node.js module loading for OCR in server components.
- **TypeScript Configuration**: Added `baseUrl: "."` for root-based imports complementing existing `@/` path aliases.
- **Permissions Type System**: `PermissionFeatures` interface extended with 13 new optional fields for both modules.
- **`PERMISSIONS` constant**: Added `GESTAO_TRIPULANTES` (8 keys) and `ESOCIAL` (5 keys) permission groups.
- **`PERMISSION_DESCRIPTIONS`**: 13 new Portuguese descriptions for permission tooltips and admin UI.
- **`DEFAULT_PERMISSIONS_BY_ROLE`**: Updated for all three roles (ADMIN, MANAGER, USER) with new module and feature entries.
- **Admin Layout Menu**: Added navigation entries for Gestão de Tripulantes (FiAnchor) and E-Social (FiSend) in the admin sidebar.
- **Cards API**: Added icon mappings for both new modules in dashboard card system.
- **Effective Permissions API**: Extended debug output with `_debug.acl` source info and `_debug.acl_modules_applied` array.
- **Auth Context**: `UserProfile` interface extended with `tax_id`, `bio`, `birth_date`, and `cover_url` fields.
- **package.json Scripts**: Added 6 new database setup scripts:
  - `db:setup-esocial` — Storage bucket creation for E-Social certificates
  - `db:seed-esocial-riscos` — Risk factors seeding
  - `db:setup-mio-cache` — MIO cache table setup
  - `db:cadastro-fields` — Cadastro migration for GT module
  - `db:setup-gestao-tripulantes` — Main GT module migration

### Infrastructure
- **Module Registration**: Both `gestao-tripulantes` and `e-social` registered in `src/config/modules.ts` and `src/constants/modules.ts` with proper roles and categories.
- **ACL Init**: ACL system seeded with all 13 new permissions for both modules.
- **Unified Data Hook**: Admin users now bypass sector restrictions in `useUnifiedData`.
- **Supabase Types**: `birth_date` field added to `users_unified` Row, Insert, and Update types.
- **Centralized Identity Utility**: New `src/lib/utils/identity.ts` for CPF normalization, formatting, validation, and masking — shared across frontend and backend for electronic signature identity verification.
- **CSS**: Global stylesheet updates for new UI components.
- **Gitignore**: Updated to exclude temporary and environment-specific files.

## [5.14.0] - 2026-05-20
- **ACL Hierarchical System Overhaul**: Refactored permission system with modular architecture. New `getFullPermissionsForRole()` consolidates module access across ADMIN, MANAGER, and USER roles. Permissions now split into `modules` (access flags) and `features` (fine-grained actions) for each role.
- **New Permission Categories**: Added granular permissions for `ferias` (read/create/approve/manage/admin), `lista-presenca` (read/create/manage/admin), and `contratos` (read/sign/manage) with full i18n descriptions.
- **Contracts Templates System**: Complete template management with CRUD API, role-based signer mapping, and template-to-envelope workflow. Templates support predefined roles (e.g., Colaborador, Gestor, RH) with auto-assignment.
- **Multi-Field Document Signing**: Contracts now support `texto` (text input), `checkbox` (boolean selection), `assinatura` (signature), and `rubrica` (initial) field types with visual position overlay. Batch signing processes all pending fields for a signer in a single transaction.
- **PDF Editor Service Enhancement**: New `embedFieldsAndSignaturesOnPdf()` service handles batch embedding of signatures, rubrics, text fields, and checkboxes across multiple pages in a single PDF pass.
- **Real IA Chat Streaming**: Migrated from simulated SSE streaming to real `chatCompletionStream` with recursive tool processing, dashboard metadata extraction, and content persistence.
- **New System Modules**: Added `ferias` (vacation management), `biblioteca` (document library), `ajuda` (help center), `compras` (purchase orders), `poliweb` (occupational clinic), `man-schedule` (offshore crew management), `chat` (internal communication), `wkradar` (legacy system access), `integracao-erp` (ERP integration), and `ia-assistant` modules with dedicated permissions.
- **Module Categories**: Extended module categorization with `department`, `core`, and `content` categories alongside existing `system`, `business`, and `hr`.
- **i18n Expansion**: Added 636+ new translation entries in `en-US.ts` and 314+ in `pt-BR.ts` covering all new modules, permissions, contracts workflows, and ACL management UI.
- **Signer Reuse**: Contract detail page now remembers the last used signer (internal or external), with toggle to reuse or reset between assignments.
- **Email Templates**: Added 61 new email template variations for contracts, vacations, and attendance list notifications.

### Changed
- **Permissions Data Model**: `DEFAULT_PERMISSIONS_BY_ROLE` restructured from flat `Record<string, boolean>` to nested `{ modules: Record<string, boolean>, features: Partial<PermissionFeatures> }` for cleaner separation of module access vs. feature-level permissions.
- **Available Modules API**: `GET /api/admin/available-modules` now sources from `SYSTEM_MODULES` config instead of hardcoded Supabase card fallback, ensuring single source of truth for module definitions.
- **Effective Permissions Endpoint**: Simplified to delegate role defaults to `getFullPermissionsForRole()` from `@/config/modules`, removing duplicated inline permission maps.
- **Signature Position Overlay**: Enhanced with dynamic tipo detection (auto-detects checkbox, rubric, text, or signature based on field dimensions/label). Updated visual status colors to amber/emerald/gray for pending/signed/rejected states.
- **Document Upload Modal**: Complete UI overhaul with tabbed interface (Envelope / Templates), template selector inside envelope creation, and dedicated template management section with role-based signer configuration.
- **Contracts Detail Page**: Added support for text/checkbox field input, collapsible signer groups, advanced signer search, and CC (carbon copy) email fields.
- **Poliweb Page**: Refactored to use per-tab state management (`tabStates`) instead of shared state, fixing credential save flow across multiple tabs.
- **Purchase Requests/Orders**: Enhanced approval workflow with improved error handling, stage tracking, and permission validation.
- **Voice Server Scripts**: Updated `agent.py` and `audio_server.py` with improved SSE handling, TTS parameter validation, and LiveKit SDK compatibility.

### Fixed
- **IA Chat Streaming**: Resolved issue where streaming used fake chunking of non-streaming API response; now properly uses `chatCompletionStream` for genuine SSE streaming with tool calls.
- **Effective Permissions**: Fixed missing modules in effective permissions by centralizing module definitions in `SYSTEM_MODULES`.
- **Signature Overlay Colors**: Updated visual feedback colors to improve accessibility and clarity of field status (pending, signed, rejected).
- **Contract Signing Flow**: Fixed batch signing to properly update all sibling fields for the same signer, including text/checkbox values alongside signature/rubric.
- **Poliweb Credential Persistence**: Resolved bug where credential updates in one tab would reset state in another tab.

## [5.13.0] - 2026-05-15

### Added
- **Infraestrutura de Voz Local (Cluster L4/Xeon)**: Estabilização do servidor de áudio local (Piper/Whisper) com suporte a streaming real-time compatível com o protocolo OpenAI.
- **Diagnóstico de Voz WebRTC**: Implementação de hooks de telemetria no `VoiceAssistantModal.tsx` para monitorar SID de participantes, estados de trilha de áudio e transições de estado do agente.

### Changed
- **Pipeline de Áudio PCM16**: Otimização do `audio_server.py` e `agent.py` para utilizar PCM raw de 24kHz. Isso reduz a latência de ponta a ponta ao eliminar a necessidade de decodificação MP3/AAC no agente LiveKit.
- **Orquestração LiveKit SDK v1.0**: Atualização do `agent.py` para suportar a arquitetura `AgentSession` (v1.0+) mantendo fallback para `VoicePipelineAgent` (v0.x), garantindo compatibilidade em diferentes ambientes de deploy.

### Fixed
- **Bug de Estol "Thinking"**: Resolvida a falha onde o agente permanecia em loop de pensamento devido ao mismatch entre o formato SSE (Server-Sent Events) esperado pelo plugin default e os raw bytes enviados pelo servidor local. Forçado uso de `model="tts-1"` para stream binário direto.
- **Validação de Parâmetros TTS**: Adicionado suporte aos campos `stream_format`, `speed` e `instructions` no `audio_server.py` para evitar erros de validação (422 Unprocessable Entity) disparados pelo plugin OpenAI.

## [5.12.0] - 2026-05-14

### Added
- **Agente de Voz em Tempo Real (LiveKit)**: Integração de canal WebRTC de alto desempenho para conversa em áudio em tempo real com a IA.
- **Resiliência de Canal**: Adicionado suporte ao estado `useConnectionState` no visualizador de voz, mantendo a interface viva e permitindo auto-recuperação suave de rede em vez de desmontar o modal.

### Changed
- **Identidades de Sessão Dinâmicas**: Tokens LiveKit agora geram identidades com sufixo randômico para eliminar colisões de ID ("reconnection loops") em múltiplos navegadores ou atualizações rápidas.
- **Restrição de Notificações de EPI**: Otimizada a consulta de envio de alertas de estoque baixo, direcionando os e-mails unicamente para os responsáveis cadastrados no painel administrativo (`epi_sector_responsibles`).

## [5.11.0] - 2026-05-14

### Added
- **Globalized Multi-Language Expansion (i18n)**: Full English/Portuguese translation coverage for essential modules including Contracts & Signatures, Attendance Lists, Reimbursement Dashboards, and structural UI components (`en-US.ts`, `pt-BR.ts`).
- **Advanced Date/Time Locality Framework**: Patched native JavaScript Date APIs in the `I18nContext` to override hardcoded locales, enforcing consistent time-zone and format alignments globally based on the user's language settings.
- **Self-Hosted High-Performance PDF.js Workers**: Configured secure offline/firewalled processing of multi-page PDF rendering via pre-compiled local workers (`public/workers/`), eliminating third-party CDN dependency and increasing signature view speed.
- **Netlify Dynamic URL Continuity Scripts**: Implemented continuous integration configuration utilities (`fix-netlify-env.bat/sh`) to automate runtime hostname injections and fix preview deployment URL issues.

### Changed
- **Contract Signatures Workflow**: Re-engineered signature verification envelopes, refined tracking telemetry, and improved visual representation badges for active contract workflows (`AuditInfoPanel.tsx`, `envelopeDispatcher.ts`).
- **Form and Dialog Polish**: Refined dynamic language selection UX, multi-language fallback behaviors, and consistent component layouts during language swapping transitions (`LanguageDialog.tsx`).

## [5.10.0] - 2026-05-13

### Added
- **SSH Connectivity for Local LLMs**: SSH management implementation for local LLM servers (`node-ssh`), including Start/Stop remote lifecycle controls.
- **Dynamic AI Dashboard Framework**: Split-view UI management that allows AI to render complex, interactive widgets (metrics, tables, lists) within the sidebar context.

### Changed
- **Contracts Module Access**: Enforced the `hasPermission` hierarchy recursively in both the sidebar visibility (`MainLayout.tsx`) and the page component route to restrict unauthorized access.
- **Sidebar CSS Overflows**: Fixed visual bug related to `max-h` CSS constraints clipping the "Meu RH" dropdown menu items in the sidebar.
- **Sidebar Notification Badges**: Removed hardcoded generic news badges; notifications now rely solely on module-specific metadata.
- **Email Templates**: Added dynamic variables for recipient name and company logo. Updated links to explicitly point to `portal.groupabz.com`.
- **System Version**: Bumped version uniformly across `package.json` and internal app config from 5.9.0 to 5.10.0.

### Fixed
- **API 404 Route Errors**: Fixed conflicts causing 404s in various API routes.
- **PDF Generation**: Restored functionality for downloading "Lista de Presença" PDFs, and formatted the document's Pauta/Subject field.

## [5.9.0] - 2026-05-08

### Added
- **Motor de Agente Autônomo para KPIs**: Nova arquitetura e ciclo contínuo de monitoração, análise e tomada de decisões periódicas (`src/lib/ia/autonomous-loop.ts`).
- **Orquestrador Avançado de IA**: Planejamento e cálculo de prioridades baseado em múltiplos fatores com etapas de ação e estimativa de impacto (`src/lib/ia/advanced-orchestrator.ts`).
- **Gerenciador de Contexto e Memória**: Nova tabela `ia_memory` para armazenamento de interações, detecção de padrões de uso e previsões comportamentais (`src/lib/ia/context-manager.ts`).
- **Hook de Controle KPI**: Hooks React para controle de ciclo de vida, eventos e presets dinâmicos (`src/hooks/useKPIAutonomous.ts` e `src/hooks/useAutonomousConfig.ts`).
- **Painel de Controle e Renderizador de Dashboard**: Interface completa com play/pause/stop, presets predefinidos e logs em tempo real (`src/components/KPI/AutonomousKPIRenderer.tsx` e `src/components/KPI/KPIAutonomousHeader.tsx`).
- **API de Controle Autônomo**: Endpoint para inicialização, controle e persistência de estado do agente (`src/app/api/ia/autonomous/control/route.ts`).

### Changed
- **Integração de KPIs de Dashboard**: Geração de relatórios e pendências com cache inteligente de dashboard de 15 minutos (`src/lib/ia/dashboard-service.ts` e `src/lib/ia/agent-service.ts`).
- **Estabilidade e Correções de Tipagem**: Ajustes de types na biblioteca IA e componentes React para garantir integridade e zero erros de build do Next.js (`src/lib/ia/client.ts`, `src/lib/ia/tools.ts`, `src/types/ia.ts`).

## [5.8.0] - 2026-05-04

### Fixed
- **Correção de Status de Férias**: Status usavam `pending/approved` (minúsculas), schema usa `PENDING_LEADER/APPROVED` (maiúsculas). Corrigido em:
  - `context-builder.ts`: Filtros ajustados para `PENDING_LEADER`, `PENDING_MANAGER`, `APPROVED`
  - `tools.ts`: Filtros de status corrigidos
  - `ferias.tools.ts`: Status ajustados para schema
  - `dashboard-service.ts`: Filtros corrigidos
- **Correção de Status de Reembolso**: Status usavam `PENDING/APPROVED` (maiúsculas), schema usa `pendente/aprovado` (minúsculas). Corrigido em:
  - `context-builder.ts`: Filtros ajustados para `pendente`, `aprovado`
  - `tools.ts`: Campos e filtros corrigidos
  - `reembolso.tools.ts`: Reescrito com normalização de status
  - `dashboard-service.ts`: KPIs corrigidos
  - `agent-service.ts`: Taxa de aprovação corrigida
- **Correção de Schema Reimbursement**: Campo `user_id` não existe no schema (tabela usa `email`). Corrigido para buscar usuário via email.
- **Correção de Campo**: Campo `valor_total` não existe (schema usa `valorTotal` em camelCase). Corrigido em todas as consultas.

### Changed
- **Modal de Férias Responsivo**: Modal de solicitação de férias agora é auto-adaptável:
  - Largura: `max-w-lg` (antes `max-w-md`)
  - Altura: `max-h-[90vh]` com scroll interno
  - Padding e botões responsivos
  - Acessível em qualquer resolução/zoom

## [5.7.0] - 2026-05-04

## [5.7.1] - 2026-05-04

### Added
- MVP de IA agentic com pendências por fonte (Teams, Emails, Calendar) e Knowledge como fonte adicional opcional.
- Endpoints MVP por fonte: /api/ia/pendencias/teams, /api/ia/pendencias/emails, /api/ia/pendencias/calendar, /api/ia/pendencias/knowledge (opcional).
- Endpoint consolidado: /api/ia/pendencias/overview para visão geral por fonte.
- Orquestrador skeleton para decisão de plano (em futuras iterações evolutivas).

### Changed
- Mantidas as alterações de MVP anteriores; inclusão de patches para suporte a pendências por fonte (agora com estrutura padronizada).

### Fixed
- Correções de rotas API para pendências com fallback seguro para cenários sem dados.

### Added
- **Agente IA Proativo**: Novo motor de automação (`agent-service.ts`) que executa tarefas agendadas e proativas.
- **Base de Conhecimento Corporativa**: Sistema de memória persistente (`ia_knowledge_base`) com injeção dinâmica de contexto baseada em cargo e departamento.
- **Dashboard de KPIs Modulares**: Nova interface `/kpi` para acompanhamento de metas em tempo real com suporte a múltiplos setores.
- **Centro de Comando Admin**: Novas interfaces para gestão de `Feature Toggles` e `Knowledge Base` no painel administrativo.
- **Integração Avançada MS Graph**:
  - Suporte a busca profunda de e-mails via OData filters (removido limite de 5 e-mails).
  - Criação de notas no OneNote e tarefas no Microsoft To Do.
  - Sincronização híbrida de calendário e documentos (SharePoint + Banco Local).
- **Exportação de Relatórios**: Geração automática de relatórios de performance em formatos PDF e XLSX (Excel).
- **Tool Toggles Globais**: Capacidade de ativar/desativar ferramentas da IA individualmente via banco de dados.

### Changed
- **src/lib/ia/tools.ts**: Expansão massiva do conjunto de ferramentas para suportar ações de escrita e automação.
- **src/lib/ia/context-builder.ts**: Injeção de instruções proativas e dados da base de conhecimento no prompt do sistema.
- **RLS Policies**: Endurecimento de segurança com políticas granulares para todas as novas tabelas de IA.

### Fixed
- Erros de cast de tipo (UUID vs Text) em queries complexas do Supabase.
- Limite restritivo de busca de e-mails que impedia visibilidade completa de conversas.
- Falhas de sincronização no dashboard de BI.

## [5.6.0] - 2026-04-28

### Added
- Enhanced IA system context memory (increased from 6000 to 25000 characters)
- Increased message history limit (from 16 to 30 messages)
- Real PDF generation capability for reports
- Real email sending capability with attachments
- Debug logging for IA context building
- Improved session management using React refs

### Changed
- **src/lib/ia/context-builder.ts**: 
  - Increased MAX_CONTEXT_TOKENS_ESTIMATE from 6000 to 25000
  - Increased MAX_HISTORY_MESSAGES from 16 to 30
  - Added debug logging for session context
  - Updated database table references (avaliacoes → avaliacoes_desempenho)
  - Fixed various text strings (accent removal for consistency)
  
- **src/components/IA/ChatWindow.tsx**:
  - Added useRef for activeSessionId to avoid React latency issues
  - Added useEffect to sync ref with state
  - Modified handleSend to use ref for session_id
  - Corrected session_id handling in streaming and non-streaming paths
  - Fixed activeSessionId updates when receiving new session IDs

- **src/lib/ia/tools.ts**:
  - Completely rewrote gerar_relatorio_pdf to generate real PDFs
  - Completely rewrote enviar_email_relatorio to send real emails
  - Added proper data fetching from database for report generation
  - Implemented actual PDF generation using existing pdf-generator utilities
  - Implemented actual email sending using nodemailer/SMTP
  - Added proper error handling and success responses
  - Added import for sendEmailWithNodemailer

- **src/lib/ia/email-tool.ts**:
  - Enhanced getTransporter() with debug logging
  - Added fallback values for development when env vars missing
  - Default to Office 365 SMTP configuration for development
  - Maintained compatibility with existing email sending logic

### Fixed
- IA system now properly maintains conversation history (30 messages vs previous limit)
- Session ID persistence between messages in the same conversation
- PDF generation now creates actual PDF files instead of simulating
- Email sending now actually sends emails instead of simulating
- React state update latency issues affecting session management
- Database query corrections for various data types

### Removed
- None
