import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-utils';

/**
 * Blocks debug/diagnostic API routes in production.
 * Optionally requires an authenticated admin even in non-production.
 */
export async function guardDebugRoute(
  request: NextRequest,
  options: { requireAdmin?: boolean } = { requireAdmin: true }
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Esta API s├│ est├í dispon├¡vel em ambiente de desenvolvimento' },
      { status: 403 }
    );
  }

  if (options.requireAdmin !== false) {
    const auth = await verifyAuth(request, true);
    if (auth.error) {
      return auth.error;
    }
  }

  return null;
}
