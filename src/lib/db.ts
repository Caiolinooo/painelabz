import { PrismaClient } from '@prisma/client';

// Evitar múltiplas instâncias do Prisma Client em desenvolvimento
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Verificar se a string de conexão do PostgreSQL está definida
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('AVISO: DATABASE_URL não está definida nas variáveis de ambiente!');
}

// Inicializar o cliente Prisma para PostgreSQL (Supabase)
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });

// Limpar conexões em desenvolvimento para evitar acúmulo de conexões
if (process.env.NODE_ENV !== 'production') {
  // Limpar conexões anteriores se existirem
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = prisma;
}
