import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter todos os cards
export async function GET() {
  try {
    const cards = await prisma.card.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Erro ao obter cards:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar um novo card
export async function POST(request: NextRequest) {
  try {
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

    // Criar o card
    const card = await prisma.card.create({
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

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
