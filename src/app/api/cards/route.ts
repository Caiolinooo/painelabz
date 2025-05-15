import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Criar pool de conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Obter todos os cards
export async function GET() {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM "Card" ORDER BY "order" ASC'
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter cards:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST - Criar um novo card
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      title, description, href, icon, color, hoverColor, external, enabled, order,
      adminOnly, managerOnly, allowedRoles, allowedUserIds, titleEn, descriptionEn
    } = body;

    // Validar os dados de entrada
    if (!title || !description || !href || !icon || !color || !hoverColor || order === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a coluna descriptionEn existe
    let hasDescriptionEn = true;
    try {
      // Tentar verificar se a coluna existe
      const checkResult = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Card' AND column_name = 'descriptionEn'`
      );
      hasDescriptionEn = checkResult.rows.length > 0;
    } catch (error) {
      console.warn('Erro ao verificar coluna descriptionEn:', error);
      hasDescriptionEn = false;
    }

    // Criar o card usando SQL
    let result;
    if (hasDescriptionEn) {
      // Se a coluna descriptionEn existir, incluí-la na query
      result = await client.query(
        `INSERT INTO "Card" (
          "title", "description", "href", "icon", "color", "hoverColor",
          "external", "enabled", "order", "adminOnly", "managerOnly",
          "allowedRoles", "allowedUserIds", "titleEn", "descriptionEn",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          title,
          description,
          href,
          icon,
          color,
          hoverColor,
          external || false,
          enabled !== false,
          order,
          adminOnly || false,
          managerOnly || false,
          JSON.stringify(allowedRoles || []),
          JSON.stringify(allowedUserIds || []),
          titleEn || '',
          descriptionEn || '',
          new Date(),
          new Date()
        ]
      );
    } else {
      // Se a coluna descriptionEn não existir, não incluí-la na query
      result = await client.query(
        `INSERT INTO "Card" (
          "title", "description", "href", "icon", "color", "hoverColor",
          "external", "enabled", "order", "adminOnly", "managerOnly",
          "allowedRoles", "allowedUserIds", "titleEn",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          title,
          description,
          href,
          icon,
          color,
          hoverColor,
          external || false,
          enabled !== false,
          order,
          adminOnly || false,
          managerOnly || false,
          JSON.stringify(allowedRoles || []),
          JSON.stringify(allowedUserIds || []),
          titleEn || '',
          new Date(),
          new Date()
        ]
      );
    }

    const card = result.rows[0];
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar card:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
