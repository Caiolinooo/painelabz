import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obter histórico de acesso de um usuário
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é administrador ou gerente
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!requestingUser || (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores e gerentes podem acessar o histórico.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário da query
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o histórico de acesso do usuário
    try {
      // Primeiro tentar buscar na tabela users_unified
      const unifiedUser = await prisma.$queryRaw`
        SELECT
          id,
          first_name as "firstName",
          last_name as "lastName",
          access_history as "accessHistory"
        FROM
          users_unified
        WHERE
          id = ${userId}::uuid
      `;

      // Se encontrou o usuário na tabela unificada
      if (unifiedUser && Array.isArray(unifiedUser) && unifiedUser.length > 0) {
        const user = unifiedUser[0];
        console.log('Usuário encontrado na tabela unificada:', user.id);

        // Verificar se o histórico existe e está no formato correto
        let accessHistory = user.accessHistory || [];

        // Garantir que o histórico seja um array
        if (!Array.isArray(accessHistory)) {
          console.log('Histórico não é um array, convertendo...');
          try {
            // Tentar converter de string JSON para array
            if (typeof accessHistory === 'string') {
              accessHistory = JSON.parse(accessHistory);
            }
            // Se ainda não for um array, criar um vazio
            if (!Array.isArray(accessHistory)) {
              accessHistory = [];
            }
          } catch (error) {
            console.error('Erro ao converter histórico:', error);
            accessHistory = [];
          }
        }

        return NextResponse.json({
          userId: user.id,
          fullName: `${user.firstName} ${user.lastName}`,
          accessHistory: accessHistory
        });
      }

      // Se não encontrou na tabela unificada, tentar na tabela User
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          accessHistory: true
        }
      });

      if (!user) {
        // Se não encontrou em nenhuma tabela, buscar informações básicas do usuário
        const basicUser = await prisma.$queryRaw`
          SELECT
            id,
            first_name as "firstName",
            last_name as "lastName"
          FROM
            users
          WHERE
            id = ${userId}::uuid
        `;

        if (basicUser && Array.isArray(basicUser) && basicUser.length > 0) {
          const user = basicUser[0];
          return NextResponse.json({
            userId: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            accessHistory: []
          });
        }

        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        accessHistory: user.accessHistory || []
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de acesso:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar histórico de acesso' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao obter histórico de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar uma nova entrada no histórico de acesso
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { userId, action, details } = body;

    // Validar os dados
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'ID do usuário e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é administrador
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem registrar histórico.' },
        { status: 403 }
      );
    }

    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accessHistory: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Adicionar entrada ao histórico
    const historyEntry = {
      timestamp: new Date(),
      action,
      details: details || ''
    };

    // Obter o histórico atual
    const accessHistory = user.accessHistory || [];

    // Atualizar o usuário com o novo histórico
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessHistory: [...accessHistory, historyEntry]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Histórico de acesso registrado com sucesso',
      entry: historyEntry
    });
  } catch (error) {
    console.error('Erro ao registrar histórico de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
