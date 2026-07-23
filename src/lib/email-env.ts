/**
 * Resolução segura de credenciais de e-mail.
 * Ordem: app_secrets (DB) → variáveis de ambiente → erro (nunca hardcode).
 * Usar apenas no servidor.
 */

import { getCredential } from './secure-credentials';

export type EmailProvider = 'exchange' | 'gmail' | 'sendgrid';

export type ResolvedEmailAuth = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string;
  provider: EmailProvider;
  /** Origem efetiva das credenciais de user/pass */
  source: 'db' | 'env';
};

export const EMAIL_SECRET_KEYS = [
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_SECURE',
  'EMAIL_FROM',
  'EMAIL_REPLY_TO',
  'EMAIL_PROVIDER',
] as const;

export type EmailSecretKey = (typeof EMAIL_SECRET_KEYS)[number];

const DEFAULT_HOST_BY_PROVIDER: Record<EmailProvider, string> = {
  exchange: 'smtp.office365.com',
  gmail: 'smtp.gmail.com',
  sendgrid: 'smtp.sendgrid.net',
};

const DEFAULT_PORT_BY_PROVIDER: Record<EmailProvider, number> = {
  exchange: 587,
  gmail: 465,
  sendgrid: 587,
};

let resolvedAuthCache: ResolvedEmailAuth | null = null;
let resolvedAuthCacheAt = 0;
const RESOLVED_AUTH_TTL_MS = 30_000;

function parseProvider(raw: string | null | undefined): EmailProvider {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'gmail') return 'gmail';
  if (value === 'sendgrid') return 'sendgrid';
  return 'exchange';
}

function envPass(): string | undefined {
  return process.env.EMAIL_PASSWORD?.trim() || process.env.EMAIL_PASS?.trim() || undefined;
}

async function secretOrEnv(key: EmailSecretKey, envValue?: string): Promise<{
  value: string | null;
  fromDb: boolean;
}> {
  const dbValue = await getCredential(key);
  if (dbValue?.trim()) {
    return { value: dbValue.trim(), fromDb: true };
  }
  const env = envValue?.trim();
  if (env) {
    return { value: env, fromDb: false };
  }
  return { value: null, fromDb: false };
}

/**
 * Resolve credenciais SMTP: DB → env.
 * Cache curto em memória; limpar com clearResolvedEmailAuthCache após admin update.
 */
export async function resolveEmailAuth(): Promise<ResolvedEmailAuth> {
  if (resolvedAuthCache && Date.now() - resolvedAuthCacheAt < RESOLVED_AUTH_TTL_MS) {
    return resolvedAuthCache;
  }

  const [userRes, passRes, hostRes, portRes, secureRes, fromRes, replyRes, providerRes] =
    await Promise.all([
      secretOrEnv('EMAIL_USER', process.env.EMAIL_USER),
      secretOrEnv('EMAIL_PASSWORD', envPass()),
      secretOrEnv('EMAIL_HOST', process.env.EMAIL_HOST),
      secretOrEnv('EMAIL_PORT', process.env.EMAIL_PORT),
      secretOrEnv('EMAIL_SECURE', process.env.EMAIL_SECURE),
      secretOrEnv('EMAIL_FROM', process.env.EMAIL_FROM),
      secretOrEnv('EMAIL_REPLY_TO', process.env.EMAIL_REPLY_TO),
      secretOrEnv('EMAIL_PROVIDER', process.env.EMAIL_PROVIDER),
    ]);

  const user = userRes.value;
  const pass = passRes.value;

  if (!user) {
    throw new Error(
      'EMAIL_USER não configurado. Defina no Admin → Credenciais de E-mail ou em EMAIL_USER no ambiente.'
    );
  }
  if (!pass) {
    throw new Error(
      'EMAIL_PASSWORD não configurado. Defina no Admin → Credenciais de E-mail ou em EMAIL_PASSWORD no ambiente.'
    );
  }

  const provider = parseProvider(providerRes.value);
  const host = hostRes.value || DEFAULT_HOST_BY_PROVIDER[provider];
  const port = parseInt(portRes.value || String(DEFAULT_PORT_BY_PROVIDER[provider]), 10);
  const secure =
    secureRes.value === 'true' ||
    (secureRes.value == null && provider === 'gmail' && port === 465);
  const from = fromRes.value || user;
  const replyTo = replyRes.value || user;
  const source: 'db' | 'env' = userRes.fromDb || passRes.fromDb ? 'db' : 'env';

  const resolved: ResolvedEmailAuth = {
    host,
    port: Number.isFinite(port) ? port : DEFAULT_PORT_BY_PROVIDER[provider],
    secure,
    user,
    pass,
    from,
    replyTo,
    provider,
    source,
  };

  resolvedAuthCache = resolved;
  resolvedAuthCacheAt = Date.now();
  return resolved;
}

/** Sync fallback só a partir de env (bootstrap / templates sem await). Prefira resolveEmailAuth(). */
export function resolveEmailAuthFromEnvSync(): Omit<ResolvedEmailAuth, 'source'> {
  const user = process.env.EMAIL_USER?.trim();
  const pass = envPass();
  if (!user || !pass) {
    throw new Error(
      'EMAIL_USER/EMAIL_PASSWORD não configurados no ambiente. Use o Admin ou defina as variáveis de bootstrap.'
    );
  }
  const provider = parseProvider(process.env.EMAIL_PROVIDER);
  const host = process.env.EMAIL_HOST?.trim() || DEFAULT_HOST_BY_PROVIDER[provider];
  const port = parseInt(
    process.env.EMAIL_PORT || String(DEFAULT_PORT_BY_PROVIDER[provider]),
    10
  );
  return {
    host,
    port: Number.isFinite(port) ? port : DEFAULT_PORT_BY_PROVIDER[provider],
    secure: process.env.EMAIL_SECURE === 'true' || (provider === 'gmail' && port === 465),
    user,
    pass,
    from: process.env.EMAIL_FROM?.trim() || user,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || user,
    provider,
  };
}

export async function resolveEmailFrom(displayName = 'ABZ Group'): Promise<string> {
  const auth = await resolveEmailAuth();
  if (auth.from.includes('<')) return auth.from;
  return `"${displayName}" <${auth.from}>`;
}

export async function resolveEmailAddress(): Promise<string> {
  const auth = await resolveEmailAuth();
  return auth.replyTo || auth.user;
}

export function emailTlsOptions() {
  return {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const,
  };
}

export function clearResolvedEmailAuthCache(): void {
  resolvedAuthCache = null;
  resolvedAuthCacheAt = 0;
}

/** Metadados mascarados para painel admin (sem senha). */
export async function getEmailSettingsPublic(): Promise<{
  user: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  replyTo: string;
  provider: EmailProvider;
  passwordSet: boolean;
  source: 'db' | 'env' | 'none';
  sources: Record<string, 'db' | 'env' | 'none'>;
}> {
  const keys: EmailSecretKey[] = [
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_SECURE',
    'EMAIL_FROM',
    'EMAIL_REPLY_TO',
    'EMAIL_PROVIDER',
  ];

  const sources: Record<string, 'db' | 'env' | 'none'> = {};
  const values: Record<string, string | null> = {};

  for (const key of keys) {
    const dbVal = await getCredential(key);
    if (dbVal?.trim()) {
      sources[key] = 'db';
      values[key] = dbVal.trim();
      continue;
    }
    let envVal: string | undefined;
    switch (key) {
      case 'EMAIL_PASSWORD':
        envVal = envPass();
        break;
      case 'EMAIL_USER':
        envVal = process.env.EMAIL_USER;
        break;
      case 'EMAIL_HOST':
        envVal = process.env.EMAIL_HOST;
        break;
      case 'EMAIL_PORT':
        envVal = process.env.EMAIL_PORT;
        break;
      case 'EMAIL_SECURE':
        envVal = process.env.EMAIL_SECURE;
        break;
      case 'EMAIL_FROM':
        envVal = process.env.EMAIL_FROM;
        break;
      case 'EMAIL_REPLY_TO':
        envVal = process.env.EMAIL_REPLY_TO;
        break;
      case 'EMAIL_PROVIDER':
        envVal = process.env.EMAIL_PROVIDER;
        break;
      default: {
        const _never: never = key;
        void _never;
        envVal = undefined;
      }
    }
    if (envVal?.trim()) {
      sources[key] = 'env';
      values[key] = envVal.trim();
    } else {
      sources[key] = 'none';
      values[key] = null;
    }
  }

  const provider = parseProvider(values.EMAIL_PROVIDER);
  const user = values.EMAIL_USER || '';
  const host = values.EMAIL_HOST || DEFAULT_HOST_BY_PROVIDER[provider];
  const port = parseInt(
    values.EMAIL_PORT || String(DEFAULT_PORT_BY_PROVIDER[provider]),
    10
  );
  const passwordSet = Boolean(values.EMAIL_PASSWORD);
  const source: 'db' | 'env' | 'none' =
    sources.EMAIL_USER === 'db' || sources.EMAIL_PASSWORD === 'db'
      ? 'db'
      : sources.EMAIL_USER === 'env' || sources.EMAIL_PASSWORD === 'env'
        ? 'env'
        : 'none';

  return {
    user,
    host,
    port: Number.isFinite(port) ? port : DEFAULT_PORT_BY_PROVIDER[provider],
    secure:
      values.EMAIL_SECURE === 'true' ||
      (!values.EMAIL_SECURE && provider === 'gmail' && port === 465),
    from: values.EMAIL_FROM || user,
    replyTo: values.EMAIL_REPLY_TO || user,
    provider,
    passwordSet,
    source,
    sources,
  };
}
