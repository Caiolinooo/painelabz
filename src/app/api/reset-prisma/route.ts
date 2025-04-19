import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * API para reinicializar o cliente Prisma
 * @route GET /api/reset-prisma
 */
export async function GET(request: NextRequest) {
  try {
    // Obter a string de conexão do MongoDB
    const mongodbUri = process.env.MONGODB_URI;
    
    if (!mongodbUri) {
      return NextResponse.json({
        success: false,
        message: 'MONGODB_URI não está definido nas variáveis de ambiente'
      }, { status: 500 });
    }
    
    // Extrair o nome do banco de dados da string de conexão
    const dbName = mongodbUri.split('/').pop()?.split('?')[0] || 'abzpainel';
    
    console.log('Reinicializando cliente Prisma...');
    console.log('String de conexão:', mongodbUri.replace(/:[^:]*@/, ':****@'));
    console.log('Nome do banco de dados:', dbName);
    
    // Criar uma nova instância do Prisma Client
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: mongodbUri
        }
      },
      log: ['query', 'info', 'warn', 'error']
    });
    
    // Testar a conexão com uma operação simples
    console.log('Testando conexão com o Prisma...');
    const userCount = await prisma.user.count();
    console.log(`Conexão com o Prisma bem-sucedida! Número de usuários: ${userCount}`);
    
    // Desconectar o cliente
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      message: 'Cliente Prisma reinicializado com sucesso',
      dbName,
      userCount
    });
  } catch (error) {
    console.error('Erro ao reinicializar cliente Prisma:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao reinicializar cliente Prisma',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
