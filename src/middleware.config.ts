// Configuração específica para o middleware
// Este arquivo é usado para evitar problemas com o Twilio e outros pacotes no Edge Runtime

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Função para extrair o token do cabeçalho de autorização
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' do início
}

// Função para verificar um token JWT
export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch (error) {
    return null;
  }
}

// Função para verificar se uma rota é pública
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/login',
    '/set-password',
    '/api/auth/login',
    '/api/auth/register',
  ];
  
  // Verificar se a rota está na lista de rotas públicas
  if (publicRoutes.includes(pathname)) {
    return true;
  }
  
  // Verificar se é uma rota de API pública
  if (
    pathname.startsWith('/api/auth/login') || 
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/password-status')
  ) {
    return true;
  }
  
  // Verificar se é uma rota de arquivo estático
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt')
  ) {
    return true;
  }
  
  return false;
}
