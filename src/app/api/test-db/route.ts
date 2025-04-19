import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import dbConnect from '@/lib/mongodb';

/**
 * API para testar a conexão com o banco de dados
 * @route GET /api/test-db
 */
export async function GET(request: NextRequest) {
  try {
    // Testar conexão com o MongoDB usando Mongoose
    console.log('Testando conexão com o MongoDB usando Mongoose...');
    await dbConnect();
    console.log('Conexão com o MongoDB usando Mongoose bem-sucedida!');

    // Testar conexão com o MongoDB usando Prisma
    console.log('Testando conexão com o MongoDB usando Prisma...');
    
    // Tentar uma operação simples com o Prisma
    const userCount = await prisma.user.count();
    console.log(`Conexão com o MongoDB usando Prisma bem-sucedida! Número de usuários: ${userCount}`);

    return NextResponse.json({
      success: true,
      message: 'Conexão com o banco de dados bem-sucedida',
      mongoose: {
        connected: true
      },
      prisma: {
        connected: true,
        userCount
      },
      config: {
        mongodbUri: process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@')
      }
    });
  } catch (error) {
    console.error('Erro ao testar conexão com o banco de dados:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao testar conexão com o banco de dados',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        mongodbUri: process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@')
      }
    }, { status: 500 });
  }
}
