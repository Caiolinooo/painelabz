import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ESOCIAL_ENCRYPTION_KEY || crypto.createHash('sha256').update('e-social-default-key-abz-2025').digest('hex').slice(0, 32);

export interface Certificado {
  id: string;
  nome: string;
  senha_criptografada: string;
  arquivo: string;
  valido: boolean;
  data_validade: string;
  created_at: string;
  updated_at: string;
}

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptPassword(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getActiveCertificate(): Promise<Certificado | null> {
  const { data, error } = await supabaseAdmin
    .from('esocial_certificados')
    .select('*')
    .eq('ativo', true)
    .or(`valido_ate.gte.${new Date().toISOString().split('T')[0]},valido_ate.is.null`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error('Nenhum certificado ativo encontrado:', error);
    return null;
  }

  return data as Certificado;
}
