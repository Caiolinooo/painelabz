import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter um item de menu pelo ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Item de menu não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(menuItem);
  } catch (error) {
    console.error('Erro ao obter item de menu:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um item de menu
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);
    const body = await request.json();
    const { href, label, icon, external, enabled, order, adminOnly } = body;

    // Validar os dados de entrada
    if (!href || !label || !icon || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o item de menu existe
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Item de menu não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o item de menu
    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        href,
        label,
        icon,
        external: external || false,
        enabled: enabled !== false,
        order,
        adminOnly: adminOnly || false,
      },
    });

    return NextResponse.json(updatedMenuItem);
  } catch (error) {
    console.error('Erro ao atualizar item de menu:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um item de menu
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Garantir que params seja await antes de acessar suas propriedades
    // Usar Promise.resolve para garantir que params.id seja tratado como uma Promise
    const id = await Promise.resolve(params.id);

    // Verificar se o item de menu existe
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Item de menu não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o item de menu
    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Item de menu excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir item de menu:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
