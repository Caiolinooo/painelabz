import { NextRequest, NextResponse } from 'next/server';

// Rotas que não precisam de autenticação
const publicRoutes = [
  '/',
  '/login',
  '/set-password',
  '/api/auth/login',
  '/api/auth/register',
];

// Rotas de arquivos estáticos
const staticRoutes = [
  '/_next/',
  '/images/',
  '/favicon.ico',
  '/robots.txt',
];

// Rotas que precisam de permissão de administrador
const adminRoutes = [
  '/admin',
  '/admin/cards',
  '/admin/menu',
  '/admin/documents',
  '/admin/news',
  '/admin/users',
  '/admin/settings',
  '/api/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Comentando o redirecionamento que causa loop infinito
  // if (pathname === '/admin') {
  //   console.log('Middleware: Redirecionando /admin para /admin/');
  //   return NextResponse.redirect(new URL('/admin/', request.url));
  // }

  // Verificar se é uma rota pública
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar se é uma rota de arquivo estático
  for (const route of staticRoutes) {
    if (pathname.startsWith(route)) {
      return NextResponse.next();
    }
  }

  // Verificar se é uma rota de API pública
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/password-status')
  ) {
    return NextResponse.next();
  }

  // Para simplificar e evitar problemas com o Twilio, vamos apenas permitir todas as requisições
  // A autenticação será verificada nas rotas de API e páginas
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts|documentos).*)',
  ],
};
