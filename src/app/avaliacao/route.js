import { NextResponse } from 'next/server';

// Este arquivo define o comportamento de redirecionamento para a rota /avaliacao
export function GET() {
  // Redirecionar para a página principal de avaliações
  return NextResponse.redirect(new URL('/avaliacao', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
