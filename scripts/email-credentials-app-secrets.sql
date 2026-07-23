-- Email credentials in app_secrets (no schema change required if table already exists).
-- Run only if app_secrets is missing — see scripts/create-app-secrets-table.sql
--
-- Runtime resolution (src/lib/email-env.ts):
--   1) app_secrets (DB)
--   2) process.env EMAIL_*
--   3) throw (never hardcoded)
--
-- Admin UI: /admin/email-settings
-- API: GET/PUT/POST /api/admin/email-settings
--
-- Keys managed by the admin panel (EMAIL_PASSWORD stored with is_encrypted=true):

-- Optional bootstrap inserts (placeholders only — replace via Admin UI):
-- INSERT INTO app_secrets (key, value, description, is_encrypted)
-- VALUES
--   ('EMAIL_USER', 'your_mailbox@yourcompany.com', 'Conta SMTP', false),
--   ('EMAIL_HOST', 'smtp.office365.com', 'Host SMTP', false),
--   ('EMAIL_PORT', '587', 'Porta SMTP', false),
--   ('EMAIL_SECURE', 'false', 'SMTP secure', false),
--   ('EMAIL_FROM', '"ABZ Group" <your_mailbox@yourcompany.com>', 'From', false),
--   ('EMAIL_REPLY_TO', 'your_mailbox@yourcompany.com', 'Reply-To', false),
--   ('EMAIL_PROVIDER', 'exchange', 'exchange|gmail|sendgrid', false)
-- ON CONFLICT (key) DO NOTHING;
--
-- Do NOT insert EMAIL_PASSWORD via SQL in plaintext when possible —
-- use Admin → Credenciais de E-mail (AES-256-CBC via setCredential).

SELECT key, is_encrypted, left(value, 8) AS value_prefix, description, updated_at
FROM app_secrets
WHERE key LIKE 'EMAIL_%'
ORDER BY key;
