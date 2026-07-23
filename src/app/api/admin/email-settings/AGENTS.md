# Email credentials (admin + runtime)

## Purpose
Persist SMTP / mailbox credentials in `app_secrets` and allow admins to change them in the portal. Prefer Microsoft Graph for Exchange/O365 when SMTP AUTH is blocked (Outlook 535).

## Ownership
- Runtime resolution: `src/lib/email-env.ts`
- Graph send/test: `src/lib/email-graph.ts`
- Storage helpers: `src/lib/secure-credentials.ts` (`getCredential` / `setCredential`, AES for passwords)
- Consumers: `src/lib/email-exchange.ts` (primary), `email-gmail.ts`, `email/service.ts`
- Admin API: `src/app/api/admin/email-settings/route.ts`
- Admin UI: `src/app/admin/email-settings/page.tsx`

## Local Contracts
- Resolution order: **DB (`app_secrets`) → env (`EMAIL_*`) → throw** (never hardcoded secrets)
- Keys: `EMAIL_USER`, `EMAIL_PASSWORD` (encrypted, optional for Graph), `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_PROVIDER`, `EMAIL_TRANSPORT` (`smtp` | `graph` | `auto`)
- Effective transport: `auto` → Graph when `MS_GRAPH_CLIENT_ID` + `MS_GRAPH_CLIENT_SECRET` + `MS_GRAPH_TENANT_ID` (not `common`) and provider is `exchange`; else SMTP
- Graph app env: `MS_GRAPH_*` (Mail.Send application permission + admin consent); sends as `/users/{EMAIL_USER}/sendMail`
- On SMTP 535 with Graph configured: send path falls back to Graph automatically
- GET returns masked data only (`passwordSet` / `passwordMasked`); never return the password
- PUT requires ADMIN JWT; empty password on update keeps the existing secret
- POST `{ action: 'test', to? }` verifies SMTP or Graph and optionally sends a test message
- After PUT: `clearCredentialCache` + `clearResolvedEmailAuthCache` + `resetEmailTransport`

## Work Guidance
- Do not put real passwords in code, SQL seeds, docs, or `.env.example`
- Prefer Graph for O365 after 535 / Security Defaults / SMTP AUTH disabled
- Prefer Admin UI to rotate SMTP credentials; Graph secrets stay in host env only
- Ensure `app_secrets` exists (`scripts/create-app-secrets-table.sql`); inspect keys with `scripts/email-credentials-app-secrets.sql`

## Verification
- Open `/admin/email-settings` as ADMIN
- With `MS_GRAPH_*` set: choose transport `graph` or `auto` → Testar conexão
- Without Graph: SMTP needs Authenticated SMTP + valid password/app password
- Trigger any portal e-mail flow and confirm send uses chosen transport

## Child DOX Index
_(none)_
