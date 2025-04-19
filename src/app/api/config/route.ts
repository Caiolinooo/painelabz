import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter a configuração do site
export async function GET() {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { id: 'default' },
    });
    
    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar a configuração do site
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      companyName,
      contactEmail,
      footerText,
    } = body;

    // Validar os dados de entrada
    if (!title || !description || !logo || !favicon || !primaryColor || !secondaryColor || !companyName || !contactEmail || !footerText) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a configuração existe
    const existingConfig = await prisma.siteConfig.findUnique({
      where: { id: 'default' },
    });

    // Atualizar ou criar a configuração
    const config = await prisma.siteConfig.upsert({
      where: { id: 'default' },
      update: {
        title,
        description,
        logo,
        favicon,
        primaryColor,
        secondaryColor,
        companyName,
        contactEmail,
        footerText,
      },
      create: {
        id: 'default',
        title,
        description,
        logo,
        favicon,
        primaryColor,
        secondaryColor,
        companyName,
        contactEmail,
        footerText,
      },
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
