import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter todos os itens de menu
export async function GET() {
  try {
    const menuItems = await prisma.menuItem.findMany({
      orderBy: { order: 'asc' },
    });
    
    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Erro ao obter itens de menu:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar um novo item de menu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { href, label, icon, external, enabled, order, adminOnly } = body;

    // Validar os dados de entrada
    if (!href || !label || !icon || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar o item de menu
    const menuItem = await prisma.menuItem.create({
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
    
    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar item de menu:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
