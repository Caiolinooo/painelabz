import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter uma notícia pelo ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);

    const news = await prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      return NextResponse.json(
        { error: 'Notícia não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error('Erro ao obter notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar uma notícia
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);
    console.log(`API de notícias - Iniciando atualização da notícia ID: ${id}`);

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

    // Verificar se a notícia existe
    console.log(`Verificando se a notícia ID ${id} existe...`);
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      console.log(`Notícia ID ${id} não encontrada`);
      return NextResponse.json(
        { error: 'Notícia não encontrada' },
        { status: 404 }
      );
    }

    console.log(`Notícia ID ${id} encontrada, atualizando...`);

    // Atualizar a notícia
    const updatedNews = await prisma.news.update({
      where: { id },
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

    console.log(`Notícia ID ${id} atualizada com sucesso`);
    return NextResponse.json(updatedNews);
  } catch (error) {
    console.error('Erro ao atualizar notícia:', error);
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

// DELETE - Excluir uma notícia
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);
    console.log(`API de notícias - Iniciando exclusão da notícia ID: ${id}`);

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

    // Verificar se a notícia existe
    console.log(`Verificando se a notícia ID ${id} existe...`);
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      console.log(`Notícia ID ${id} não encontrada`);
      return NextResponse.json(
        { error: 'Notícia não encontrada' },
        { status: 404 }
      );
    }

    console.log(`Notícia ID ${id} encontrada, excluindo...`);

    // Excluir a notícia
    await prisma.news.delete({
      where: { id },
    });

    console.log(`Notícia ID ${id} excluída com sucesso`);
    return NextResponse.json({ message: 'Notícia excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir notícia:', error);
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
