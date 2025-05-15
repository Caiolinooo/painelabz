import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Verificar a estrutura do banco de dados
export async function GET(request: NextRequest) {
  try {
    console.log('API de verificação do banco de dados - Iniciando...');
    
    // Verificar conexão com o banco de dados
    try {
      await prisma.$connect();
      console.log('Conexão com o banco de dados estabelecida com sucesso');
    } catch (dbError) {
      console.error('Erro ao conectar ao banco de dados:', dbError);
      return NextResponse.json(
        { error: 'Erro de conexão com o banco de dados', details: String(dbError) },
        { status: 500 }
      );
    }
    
    // Verificar tabelas existentes
    console.log('Verificando tabelas existentes...');
    
    // Verificar tabela News
    let newsTableExists = true;
    let newsCount = 0;
    try {
      const newsResult = await prisma.$queryRaw`SELECT COUNT(*) FROM "News"`;
      newsCount = Number(newsResult[0].count);
      console.log(`Tabela News existe e contém ${newsCount} registros`);
    } catch (error) {
      newsTableExists = false;
      console.error('Erro ao verificar tabela News:', error);
    }
    
    // Verificar outras tabelas
    let userTableExists = true;
    let userCount = 0;
    try {
      const userResult = await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`;
      userCount = Number(userResult[0].count);
      console.log(`Tabela User existe e contém ${userCount} registros`);
    } catch (error) {
      userTableExists = false;
      console.error('Erro ao verificar tabela User:', error);
    }
    
    // Verificar estrutura da tabela News
    let newsStructure = null;
    if (newsTableExists) {
      try {
        const newsColumns = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'News'
        `;
        newsStructure = newsColumns;
        console.log('Estrutura da tabela News:', newsColumns);
      } catch (error) {
        console.error('Erro ao verificar estrutura da tabela News:', error);
      }
    }
    
    // Retornar resultado
    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        tables: {
          news: {
            exists: newsTableExists,
            count: newsCount,
            structure: newsStructure
          },
          user: {
            exists: userTableExists,
            count: userCount
          }
        }
      }
    });
  } catch (error) {
    console.error('Erro ao verificar banco de dados:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  } finally {
    // Desconectar do banco de dados
    try {
      await prisma.$disconnect();
      console.log('Desconectado do banco de dados');
    } catch (disconnectError) {
      console.error('Erro ao desconectar do banco de dados:', disconnectError);
    }
  }
}
