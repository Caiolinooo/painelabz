## Documentação de Engenharia (automação)

- [x] `docs/VOICE_AGENT.md` — pipeline LiveKit, Supertonic 3, fallback offline
- [x] `docs/MODULO_FERIAS.md` — config admin, notificações, PDFs, API
- [x] `docs/REIMBURSEMENT_VALIDATION.md` — limites por tipo, parser, validação
- [x] `docs/MODULO_EPI.md` — estoque hierárquico, PDF, movimentações
- [x] Índice em `docs/DEVELOPER_GUIDE.md` e DOX (`docs/AGENTS.md`, root `AGENTS.md`)

## Poliweb Antigo - Auto-login e Proxy

- **Diagnóstico inicial**
  - Verificar logs de `POST /api/poliweb-antigo/login` (status, cookies, mensagens de erro).
  - Confirmar se o HTML de `Login.aspx` expõe `__VIEWSTATE/__EVENTVALIDATION` ou se é apenas um loader sem formulário.

- **Ajuste do fluxo de login**
  - Relaxar a validação de sucesso: só tratar como erro quando houver mensagem clara de erro na página.
  - Aceitar login quando houver cookies válidos (após merge de `initialCookies` e `sessionCookies`) mesmo sem `__VIEWSTATE`.
  - Registrar em log a quantidade total de cookies após o merge para facilitar debug futuro.

- **Integração com proxy**
  - Garantir que `storeSession` seja chamado com todos os cookies mesclados para a versão `antigo`.
  - Validar que o proxy `poliweb-antigo-proxy` envie os cookies armazenados em todas as requisições subsequentes.

- **Verificação fim a fim**
  - No ambiente local, abrir o módulo Poliweb Antigo no portal e confirmar:
    - `POST /api/poliweb-antigo/login` retorna `success: true`.
    - As requisições subsequentes via `/api/poliweb-antigo-proxy/...` retornam conteúdo autenticado (não mais a tela de login).
  - Adicionar/rodar smoke test (Playwright) cobrindo o fluxo básico de abertura do Poliweb Antigo dentro do portal.

