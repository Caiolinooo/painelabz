/**
 * Defaults WKRadar ÔÇö senha padr├úo NUNCA hardcoded no c├│digo-fonte.
 * Configure WKRADAR_DEFAULT_PASSWORD no ambiente do servidor.
 */

export function getWkradarDefaultPassword(): string {
  const password = process.env.WKRADAR_DEFAULT_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      'WKRADAR_DEFAULT_PASSWORD n├úo configurado. Defina no .env.local / secrets do host.'
    );
  }
  return password;
}

export function tryGetWkradarDefaultPassword(): string | null {
  return process.env.WKRADAR_DEFAULT_PASSWORD?.trim() || null;
}

export function generateWkradarDefaultUsername(fullName?: string | null, email?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[parts.length - 1]}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }
    if (parts.length === 1) {
      return parts[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  }
  if (email?.includes('@')) {
    return email.split('@')[0].toLowerCase();
  }
  return '';
}
