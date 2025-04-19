import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapeamento simplificado de rotas
const routeMap = {
  // Removendo redirecionamentos desnecessários que podem causar loops
  // '/login': '/login',
  // '/dashboard': '/dashboard',
  // '/manual': '/manual',
  // '/set-password': '/set-password',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se a rota precisa ser redirecionada
  if (routeMap[pathname]) {
    return NextResponse.redirect(new URL(routeMap[pathname], request.url));
  }

  // Permitir que as solicitações continuem
  return NextResponse.next();
}

// Configurar quais caminhos devem ser processados pelo middleware
export const config = {
  matcher: ['/login', '/dashboard', '/manual', '/set-password'],
};
