import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter todas as notícias
export async function GET(request: NextRequest) {
  try {
    console.log('API de notícias - Iniciando busca');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    console.log('Parâmetros de busca:', { category, featured });

    const whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (featured === 'true') {
      whereClause.featured = true;
    }

    console.log('Cláusula WHERE:', whereClause);

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

    // Buscar notícias
    console.log('Buscando notícias no banco de dados...');
    const news = await prisma.news.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    console.log(`Encontradas ${news.length} notícias`);

    // Mesmo que não encontre notícias, retornar um array vazio
    return NextResponse.json(news || []);
  } catch (error) {
    console.error('Erro ao obter notícias:', error);
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

// POST - Criar uma nova notícia
export async function POST(request: NextRequest) {
  try {
    console.log('API de notícias - Iniciando criação de notícia');
    const body = await request.json();
    console.log('Dados recebidos:', body);

    const { title, description, date, file, enabled, featured, category, author, thumbnail } = body;

    // Validar os dados de entrada
    if (!title || !description || !date || !category || !author) {
      console.log('Validação falhou - campos obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

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

    // Criar a notícia
    console.log('Criando notícia no banco de dados...');
    const news = await prisma.news.create({
      data: {
        title,
        description,
        content: description, // Usar a descrição como conteúdo por padrão
        date: new Date(date),
        file: file || '', // Tornar o arquivo opcional
        enabled: enabled !== false,
        featured: featured || false,
        category,
        author,
        thumbnail,
      },
    });

    console.log('Notícia criada com sucesso:', news.id);
    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
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
