# Email credentials (admin + runtime)

## Purpose
Persist SMTP account credentials in `app_secrets` and allow admins to change them in the portal. Environment variables remain bootstrap/fallback only.

## Ownership
- Runtime resolution: `src/lib/email-env.ts`
- Storage helpers: `src/lib/secure-credentials.ts` (`getCredential` / `setCredential`, AES for passwords)
- Consumers: `src/lib/email-exchange.ts` (primary), `email-gmail.ts`, `email/service.ts`
- Admin API: `src/app/api/admin/email-settings/route.ts`
- Admin UI: `src/app/admin/email-settings/page.tsx`

## Local Contracts
- Resolution order: **DB (`app_secrets`) → env (`EMAIL_*`) → throw** (never hardcoded secrets)
- Keys: `EMAIL_USER`, `EMAIL_PASSWORD` (encrypted), `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_PROVIDER`
- GET returns masked data only (`passwordSet` / `passwordMasked`); never return the password
- PUT requires ADMIN JWT; empty password on update keeps the existing secret
- POST `{ action: 'test', to? }` verifies SMTP and optionally sends a test message
- After PUT: `clearCredentialCache` + `clearResolvedEmailAuthCache` + `resetEmailTransport`

## Work Guidance
- Do not put real passwords in code, SQL seeds, docs, or `.env.example`
- Prefer Admin UI to rotate credentials after O365/Gmail incidents
- Ensure `app_secrets` exists (`scripts/create-app-secrets-table.sql`); inspect keys with `scripts/email-credentials-app-secrets.sql`

## Verification
- Open `/admin/email-settings` as ADMIN
- Save user/password → confirm `source: db` on reload
- POST test connection (and optional test recipient)
- Trigger any portal e-mail flow and confirm send uses DB credentials

## Child DOX Index
_(none)_
