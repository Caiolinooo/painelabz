import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter uma notícia pelo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { title, description, date, file, enabled, featured, category, author, thumbnail } = body;

    // Validar os dados de entrada
    if (!title || !description || !date || !file || !category || !author) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a notícia existe
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: 'Notícia não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar a notícia
    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        title,
        description,
        date: new Date(date),
        file,
        enabled: enabled !== false,
        featured: featured || false,
        category,
        author,
        thumbnail,
      },
    });
    
    return NextResponse.json(updatedNews);
  } catch (error) {
    console.error('Erro ao atualizar notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir uma notícia
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Verificar se a notícia existe
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: 'Notícia não encontrada' },
        { status: 404 }
      );
    }

    // Excluir a notícia
    await prisma.news.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: 'Notícia excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
