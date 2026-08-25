import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken, type TokenPayload } from '@/lib/auth';

export type GtPrivilegedAuth =
  | { ok: true; payload: TokenPayload }
  | { ok: false; response: NextResponse };

/**
 * ADMIN or MANAGER JWT required. Used for fleet-wide identity/document APIs
 * (export, auditoria GET, e-Social consistency/crossref).
 */
export function requireGtAdminOrManager(authHeader: string | null | undefined): GtPrivilegedAuth {
  const token = extractTokenFromHeader(authHeader || undefined);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Token inválido' }, { status: 401 }),
    };
  }

  const role = String(payload.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autorizado' }, { status: 403 }),
    };
  }

  return { ok: true, payload };
}
