import { PrismaClient } from '@prisma/client';

// Evitar múltiplas instâncias do Prisma Client em desenvolvimento
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

// Verificar se a string de conexão do PostgreSQL está definida
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('AVISO: DATABASE_URL não está definida nas variáveis de ambiente!');
}

// Definir opções do Prisma Client
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });
};

// Definir o tipo para o global
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Definir o objeto global
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Exportar a instância do Prisma Client
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Em desenvolvimento, atribuir a instância ao objeto global
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
