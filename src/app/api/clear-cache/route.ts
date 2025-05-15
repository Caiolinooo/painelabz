import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API para limpar o cache do Prisma
 * @route GET /api/clear-cache
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Limpando cache do Prisma...');

    // Desconectar o cliente Prisma
    await prisma.$disconnect();

    // Limpar o cache global
    if (global.prisma) {
      console.log('Removendo instância global do Prisma...');
      delete global.prisma;
    }

    // Verificar a string de conexão do PostgreSQL
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        message: 'DATABASE_URL não está definido nas variáveis de ambiente'
      }, { status: 500 });
    }

    console.log('String de conexão PostgreSQL configurada');

    return NextResponse.json({
      success: true,
      message: 'Cache do Prisma limpo com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar cache do Prisma:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro ao limpar cache do Prisma',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
