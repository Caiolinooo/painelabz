/**
 * JWT secret sem fallback inseguro.
 * Em produ├º├úo falha se JWT_SECRET estiver ausente.
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET ├® obrigat├│rio em produ├º├úo');
  }

  // Dev-only: valor ├│bvio e n├úo utiliz├ível em produ├º├úo
  console.warn('[security] JWT_SECRET ausente ÔÇö usando secret de desenvolvimento (N├âO use em produ├º├úo)');
  return 'dev-only-jwt-secret-not-for-production';
}
