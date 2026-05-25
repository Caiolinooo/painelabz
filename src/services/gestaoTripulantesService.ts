import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export function getUserId(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return payload.userId || (payload as any).sub || null;
  } catch {
    return null;
  }
}

export async function checkModulePermission(userId: string, feature: string): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('users_unified')
      .select('role, access_permissions')
      .eq('id', userId)
      .single();

    if (error || !user) return false;
    if (user.role === 'ADMIN') return true;

    const perms = user.access_permissions as any;
    if (!perms?.features) return false;
    return perms.features[feature] === true;
  } catch {
    return false;
  }
}
