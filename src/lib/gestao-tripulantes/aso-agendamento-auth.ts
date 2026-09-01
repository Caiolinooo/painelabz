import { NextRequest, NextResponse } from 'next/server';
import type { TokenPayload } from '@/lib/auth';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export function tokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || undefined;
  return (
    extractTokenFromHeader(authHeader) ||
    request.cookies.get('abzToken')?.value ||
    request.cookies.get('token')?.value ||
    null
  );
}

export function requireAsoAgendamentoAuth(request: NextRequest): {
  payload?: TokenPayload;
  error?: NextResponse;
} {
  const token = tokenFromRequest(request);
  if (!token) {
    return { error: NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 }) };
  }
  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) };
  }
  return { payload };
}

export function resolveAuthUserId(payload: TokenPayload): string {
  return payload.userId || payload.user_id || payload.id || payload.sub || '';
}

export function isLogisticaRole(role: string | undefined): boolean {
  const r = (role || '').toUpperCase();
  return r === 'ADMIN' || r === 'ADMINISTRADOR' || r === 'SUPERADMIN' || r === 'MANAGER';
}

export function clientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
