import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || '');

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar se estamos usando Supabase ou PostgreSQL direto
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      // Usar Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Buscar o usuário no Supabase
      const { data: userData, error } = await supabase
        .from('users_unified')
        .select('password_hash, password_last_changed')
        .eq('id', payload.userId)
        .single();

      if (error) {
        console.error('Erro ao buscar usuário no Supabase:', error);
        return NextResponse.json({ error: 'Erro ao verificar senha' }, { status: 500 });
      }

      // Verificar se o usuário tem senha definida
      const hasPassword = !!userData.password_hash;

      return NextResponse.json({
        hasPassword,
        passwordLastChanged: userData.password_last_changed
      });
    } else {
      // Usar PostgreSQL direto
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      try {
        // Buscar o usuário no banco de dados
        const result = await pool.query(`
          SELECT "password_hash", "password_last_changed"
          FROM "users_unified"
          WHERE "id" = $1
        `, [payload.userId]);

        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const user = result.rows[0];

        // Verificar se o usuário tem senha definida
        const hasPassword = !!user.password_hash;

        return NextResponse.json({
          hasPassword,
          passwordLastChanged: user.password_last_changed
        });
      } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return NextResponse.json({ error: 'Erro ao verificar senha' }, { status: 500 });
      } finally {
        await pool.end();
      }
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
