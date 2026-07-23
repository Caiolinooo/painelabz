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
2. Abrir `/admin/email-settings` como ADMIN e salvar conta + senha rotacionada
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
| [ ] | Atualizar `EMAIL_*` / `WKRADAR_DEFAULT_PASSWORD` no host (Vercel/Netlify) |

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
| `jspdf` | critical | Fix needs major → 4.x — test PDF/cert/receipt flows |
| `xlsx` | high | No fix available — plan migration to `exceljs` / SheetJS Pro |
| `next` | high | DoS advisories; safe bump needs Next 16 major — schedule upgrade |
| `nodemailer` | high | Major → 9.x — test SMTP after bump |
| `eslint-config-next` / `glob` | high | Tied to Next 16 major |

`npm audit fix` (non-force) already applied: **48 → 19** total vulns.

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

