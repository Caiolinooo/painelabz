import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SiteConfig } from '@/data/config';
import { Pool } from 'pg';

// Configuração padrão do site
const defaultConfig: SiteConfig = {
  title: "Painel ABZ Group",
  description: "Painel centralizado para colaboradores da ABZ Group",
  logo: "/images/LC1_Azul.png",
  favicon: "/favicon.ico",
  primaryColor: "#005dff", // abz-blue
  secondaryColor: "#6339F5", // abz-purple
  companyName: "ABZ Group",
  contactEmail: "contato@groupabz.com",
  footerText: "© 2024 ABZ Group. Todos os direitos reservados."
};

// Criar pool de conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Obter a configuração do site
export async function GET() {
  const client = await pool.connect();

  try {
    console.log('Buscando configurações do site');

    const result = await client.query(
      'SELECT * FROM "SiteConfig" WHERE id = $1',
      ['default']
    );

    if (result.rows.length === 0) {
      console.log('Configuração não encontrada, retornando valores padrão');
      return NextResponse.json(defaultConfig);
    }

    const config = result.rows[0];
    console.log('Configuração encontrada:', config);

    // Garantir que todos os campos necessários estejam presentes
    const completeConfig = {
      ...defaultConfig,
      ...config
    };

    return NextResponse.json(completeConfig);
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    // Em caso de erro, retornar a configuração padrão em vez de um erro
    return NextResponse.json(defaultConfig);
  } finally {
    client.release();
  }
}

// PUT - Atualizar a configuração do site
export async function PUT(request: NextRequest) {
  const client = await pool.connect();

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
    const checkResult = await client.query(
      'SELECT id FROM "SiteConfig" WHERE id = $1',
      ['default']
    );

    let config;

    if (checkResult.rows.length === 0) {
      // Criar nova configuração
      const insertResult = await client.query(
        `INSERT INTO "SiteConfig" (
          id, title, description, logo, favicon,
          "primaryColor", "secondaryColor", "companyName",
          "contactEmail", "footerText", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          'default', title, description, logo, favicon,
          primaryColor, secondaryColor, companyName,
          contactEmail, footerText, new Date()
        ]
      );

      config = insertResult.rows[0];
    } else {
      // Atualizar configuração existente
      console.log('Atualizando configuração com cores:', {
        primaryColor,
        secondaryColor
      });

      const updateResult = await client.query(
        `UPDATE "SiteConfig" SET
          title = $1,
          description = $2,
          logo = $3,
          favicon = $4,
          "primaryColor" = $5,
          "secondaryColor" = $6,
          "companyName" = $7,
          "contactEmail" = $8,
          "footerText" = $9,
          "updatedAt" = $10
        WHERE id = 'default'
        RETURNING *`,
        [
          title, description, logo, favicon,
          primaryColor, secondaryColor, companyName,
          contactEmail, footerText, new Date()
        ]
      );

      config = updateResult.rows[0];
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
