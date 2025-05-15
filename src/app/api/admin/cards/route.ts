import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminFromRequest } from '@/lib/auth';

// GET - Obter todos os cards
export async function GET(request: NextRequest) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Buscar todos os cards
    const cards = await prisma.card.findMany({
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Erro ao obter cards:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Criar um novo card
export async function POST(request: NextRequest) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();

    // Validar dados
    if (!body.title || !body.href) {
      return NextResponse.json(
        { error: 'Título e link são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar o card
    const card = await prisma.card.create({
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

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um card existente
export async function PUT(request: NextRequest) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();

    // Validar dados
    if (!body.id || !body.title || !body.href) {
      return NextResponse.json(
        { error: 'ID, título e link são obrigatórios' },
        { status: 400 }
      );
    }

    // Atualizar o card
    const card = await prisma.card.update({
      where: { id: body.id },
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

    return NextResponse.json(card);
  } catch (error) {
    console.error('Erro ao atualizar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
