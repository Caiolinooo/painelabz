import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

// Tipo para o payload do token
export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

// Função para gerar um token JWT
export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d', // Token expira em 7 dias
  });
}

// Função para verificar um token JWT
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Função para extrair o token do cabeçalho de autorização
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' do início
}
