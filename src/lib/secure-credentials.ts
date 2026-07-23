/**
 * Gerenciamento seguro de credenciais via tabela app_secrets.
 * Cache em memória + suporte a valores AES-256-CBC (is_encrypted).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { SECURITY_SALT, SUPABASE_KEY_HASH } from './security-config';

interface Credential {
  key: string;
  value: string;
  description?: string;
  is_encrypted: boolean;
}

const credentialsCache = new Map<string, string>();
const cacheExpiry = new Map<string, number>();
const CACHE_TTL_MS = 60 * 1000;

let supabaseClient: SupabaseClient | null = null;

function resolveServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_KEY ||
    ''
  );
}

export function initializeSupabaseClient(
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: string = resolveServiceKey()
) {
  if (supabaseKey) {
    const keyHash = crypto.createHash('md5').update(supabaseKey).digest('hex');
    if (SUPABASE_KEY_HASH && keyHash !== SUPABASE_KEY_HASH) {
      console.warn('Aviso: Hash da chave Supabase não corresponde ao esperado');
    }
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

export function encryptValue(value: string, salt: string = SECURITY_SALT): string {
  if (!value) return '';
  const key = crypto.createHash('md5').update(salt).digest('hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptValue(encryptedValue: string, salt: string = SECURITY_SALT): string {
  if (!encryptedValue) return '';

  const parts = encryptedValue.split(':');
  if (parts.length !== 2) return '';

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = crypto.createHash('md5').update(salt).digest('hex').slice(0, 32);

  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar valor:', error);
    return '';
  }
}

function ensureClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = resolveServiceKey();
    if (url && serviceKey) {
      return initializeSupabaseClient(url, serviceKey);
    }
    console.error(
      'Cliente Supabase não inicializado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_KEY).'
    );
    return null;
  } catch (e) {
    console.error('Falha ao auto-inicializar cliente Supabase para secure-credentials:', e);
    return null;
  }
}

export async function getCredential(key: string): Promise<string | null> {
  if (credentialsCache.has(key)) {
    const expiry = cacheExpiry.get(key);
    if (!expiry || Date.now() < expiry) {
      return credentialsCache.get(key) || null;
    }
  }

  const client = ensureClient();
  if (!client) {
    console.error('Cliente Supabase não disponível para buscar credencial');
    return null;
  }

  try {
    const { data, error } = await client
      .from('app_secrets')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar credencial ${key}:`, error);
      return null;
    }

    if (!data) {
      return null;
    }

    const credential = data as unknown as Credential;
    const value = credential.is_encrypted
      ? decryptValue(credential.value)
      : credential.value;

    credentialsCache.set(key, value);
    cacheExpiry.set(key, Date.now() + CACHE_TTL_MS);

    return value;
  } catch (error) {
    console.error(`Erro ao obter credencial ${key}:`, error);
    return null;
  }
}

export async function getAllCredentials(): Promise<Record<string, string>> {
  const credentials: Record<string, string> = {};
  const keys = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASSWORD', 'SUPABASE_SERVICE_KEY'];

  for (const key of keys) {
    const value = await getCredential(key);
    if (value) {
      credentials[key] = value;
    }
  }

  return credentials;
}

export async function initializeCredentials(): Promise<boolean> {
  try {
    initializeSupabaseClient();
    await getAllCredentials();
    return true;
  } catch (error) {
    console.error('Erro ao inicializar sistema de credenciais:', error);
    return false;
  }
}

export function clearCredentialCache(key?: string): void {
  if (key) {
    credentialsCache.delete(key);
    cacheExpiry.delete(key);
  } else {
    credentialsCache.clear();
    cacheExpiry.clear();
  }
}

/**
 * Upsert em app_secrets. Use encrypt:true para senhas/API keys.
 */
export async function setCredential(
  key: string,
  value: string,
  description: string,
  options: { encrypt?: boolean } = {}
): Promise<void> {
  const client = ensureClient();
  if (!client) {
    throw new Error('Supabase service client indisponível para gravar app_secrets');
  }

  const encrypt = options.encrypt === true;
  const storedValue = encrypt ? encryptValue(value) : value;

  const { data: existing, error: readError } = await client
    .from('app_secrets')
    .select('id')
    .eq('key', key)
    .maybeSingle();

  if (readError) throw readError;

  if (existing) {
    const { error } = await client
      .from('app_secrets')
      .update({
        value: storedValue,
        description,
        is_encrypted: encrypt,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);
    if (error) throw error;
  } else {
    const { error } = await client.from('app_secrets').insert([
      {
        key,
        value: storedValue,
        description,
        is_encrypted: encrypt,
      },
    ]);
    if (error) throw error;
  }

  clearCredentialCache(key);
}
