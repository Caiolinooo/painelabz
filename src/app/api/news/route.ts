import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter todas as notícias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    
    const whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (featured === 'true') {
      whereClause.featured = true;
    }
    
    const news = await prisma.news.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });
    
    return NextResponse.json(news);
  } catch (error) {
    console.error('Erro ao obter notícias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar uma nova notícia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, date, file, enabled, featured, category, author, thumbnail } = body;

    // Validar os dados de entrada
    if (!title || !description || !date || !file || !category || !author) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar a notícia
    const news = await prisma.news.create({
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
    
    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
