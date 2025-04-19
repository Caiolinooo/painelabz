import { PrismaClient } from '@prisma/client';

// Evitar múltiplas instâncias do Prisma Client em desenvolvimento
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Verificar se a string de conexão do MongoDB está definida
const MONGODB_URI = process.env.MONGODB_URI;

// Extrair o nome do banco de dados da string de conexão ou usar um padrão
const DB_NAME = MONGODB_URI ? MONGODB_URI.split('/').pop()?.split('?')[0] || 'abzpainel' : 'abzpainel';

// Verificar se a string de conexão contém o nome do banco de dados
if (MONGODB_URI && !MONGODB_URI.includes(`/${DB_NAME}?`)) {
  console.error('AVISO: A string de conexão do MongoDB não contém o nome do banco de dados correto!');
  console.error('String de conexão:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
  console.error('Nome do banco de dados esperado:', DB_NAME);
}

// Inicializar o cliente Prisma
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: MONGODB_URI
      }
    }
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
