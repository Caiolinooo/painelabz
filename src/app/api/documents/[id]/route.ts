import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Document from '@/models/Document';

// GET - Obter um documento pelo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const id = params.id;

    const document = await Document.findById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Erro ao obter documento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um documento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const id = params.id;
    const body = await request.json();
    const { title, description, category, language, file, enabled, order } = body;

    // Validar os dados de entrada
    if (!title || !description || !category || !language || !file || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o documento existe
    const existingDocument = await Document.findById(id);

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o documento
    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      {
        title,
        description,
        category,
        language,
        file,
        enabled: enabled !== false,
        order,
      },
      { new: true }
    );

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const id = params.id;

    // Verificar se o documento existe
    const existingDocument = await Document.findById(id);

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o documento
    await Document.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
