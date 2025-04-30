import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter um card pelo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const card = await prisma.card.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error('Erro ao obter card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um card
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const {
      title, description, href, icon, color, hoverColor, external, enabled, order,
      adminOnly, managerOnly, allowedRoles, allowedUserIds
    } = body;

    // Validar os dados de entrada
    if (!title || !description || !href || !icon || !color || !hoverColor || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o card existe
    const existingCard = await prisma.card.findUnique({
      where: { id },
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        title,
        description,
        href,
        icon,
        color,
        hoverColor,
        external: external || false,
        enabled: enabled !== false,
        order,
        // Campos de controle de acesso
        adminOnly: adminOnly || false,
        managerOnly: managerOnly || false,
        allowedRoles: allowedRoles || [],
        allowedUserIds: allowedUserIds || [],
      },
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Erro ao atualizar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um card
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Verificar se o card existe
    const existingCard = await prisma.card.findUnique({
      where: { id },
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o card
    await prisma.card.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Card excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
