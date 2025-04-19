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
    
    // Verificar a string de conexão do MongoDB
    const mongodbUri = process.env.MONGODB_URI;
    
    if (!mongodbUri) {
      return NextResponse.json({
        success: false,
        message: 'MONGODB_URI não está definido nas variáveis de ambiente'
      }, { status: 500 });
    }
    
    // Extrair o nome do banco de dados da string de conexão
    const dbName = mongodbUri.split('/').pop()?.split('?')[0] || 'abzpainel';
    
    console.log('String de conexão:', mongodbUri.replace(/:[^:]*@/, ':****@'));
    console.log('Nome do banco de dados:', dbName);
    
    return NextResponse.json({
      success: true,
      message: 'Cache do Prisma limpo com sucesso',
      dbName,
      mongodbUri: mongodbUri.replace(/:[^:]*@/, ':****@')
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
