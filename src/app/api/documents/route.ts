import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter todos os documentos
export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category } : {};

    const documents = await prisma.document.findMany({
      where,
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Erro ao obter documentos:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar um novo documento
export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { title, description, category, language, file, enabled, order } = body;

    // Validar os dados de entrada
    if (!title || !description || !category || !language || !file || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar o documento usando Prisma
    const document = await prisma.document.create({
      data: {
        title,
        description,
        category,
        language,
        file,
        enabled: enabled !== false,
        order,
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar documento:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
