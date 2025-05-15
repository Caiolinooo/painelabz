import { NextResponse } from 'next/server';

// Este arquivo define o comportamento de redirecionamento para a rota /avaliacao/nova-avaliacao
export function GET() {
  // Redirecionar para a página de nova avaliação
  return NextResponse.redirect(new URL('/avaliacao/nova', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
