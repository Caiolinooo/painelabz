import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminFromRequest } from '@/lib/auth';

// GET - Obter um card específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const id = params.id;

    // Buscar o card
    const card = await prisma.card.findUnique({
      where: { id }
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
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um card existente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await request.json();

    // Verificar se o card existe
    const existingCard = await prisma.card.findUnique({
      where: { id }
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
        title: body.title,
        description: body.description || '',
        href: body.href,
        icon: body.icon || 'FiGrid',
        color: body.color || 'blue',
        hoverColor: body.hoverColor || 'blue',
        enabled: body.enabled !== undefined ? body.enabled : true,
        order: body.order || 0,
        adminOnly: body.adminOnly || false,
        external: body.external || false
      }
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Erro ao atualizar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
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
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const id = params.id;

    // Verificar se o card existe
    const existingCard = await prisma.card.findUnique({
      where: { id }
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o card
    await prisma.card.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Card excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
