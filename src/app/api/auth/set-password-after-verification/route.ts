import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(req: NextRequest) {
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

    // Obter a senha do corpo da requisição
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Senha não fornecida' }, { status: 400 });
    }

    // Validar a senha
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'A senha deve ter pelo menos 8 caracteres' 
      }, { status: 400 });
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar pool de conexão com o PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    try {
      // Atualizar a senha do usuário
      const now = new Date().toISOString();
      
      // Verificar se o usuário existe
      const userResult = await pool.query(`
        SELECT * FROM "users_unified"
        WHERE "id" = $1
      `, [payload.userId]);

      if (userResult.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Usuário não encontrado' 
        }, { status: 404 });
      }

      // Obter o usuário atual
      const user = userResult.rows[0];

      // Atualizar a senha do usuário
      await pool.query(`
        UPDATE "users_unified"
        SET
          "password_hash" = $1,
          "password_last_changed" = $2,
          "updated_at" = $2,
          "access_history" = $3
        WHERE "id" = $4
      `, [
        hashedPassword,
        now,
        JSON.stringify([
          ...(user.access_history || []),
          {
            timestamp: now,
            action: 'PASSWORD_SET',
            details: 'Senha definida pelo usuário após verificação'
          }
        ]),
        payload.userId
      ]);

      // Verificar se o usuário é externo (não tem role definida)
      // Se for, definir como USER e garantir que não tenha acesso ao painel de avaliação
      if (!user.role || user.role === '') {
        await pool.query(`
          UPDATE "users_unified"
          SET
            "role" = 'USER',
            "access_permissions" = $1
          WHERE "id" = $2
        `, [
          JSON.stringify({
            modules: {
              admin: false,
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              avaliacao: false
            }
          }),
          payload.userId
        ]);
      }

      return NextResponse.json({
        success: true,
        message: 'Senha definida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao definir senha:', error);
      return NextResponse.json({ 
        error: 'Erro ao definir senha' 
      }, { status: 500 });
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
