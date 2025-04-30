import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/db';

// POST - Atualizar o papel (role) de um usuário
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e autorização (apenas administradores)
    const authResult = await verifyAuth(request, true);

    if (authResult.error) {
      return authResult.error;
    }

    const { user: requestingUser } = authResult;
    const userId = params.id;

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { role, accessPermissions } = body;

    // Validar o papel
    if (!role || !['ADMIN', 'MANAGER', 'USER'].includes(role)) {
      return NextResponse.json(
        { error: 'Papel inválido' },
        { status: 400 }
      );
    }

    // Buscar o usuário a ser atualizado
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário está tentando alterar seu próprio papel
    if (userToUpdate.id === requestingUser.id && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Você não pode rebaixar seu próprio papel de administrador' },
        { status: 403 }
      );
    }

    // Atualizar o papel e permissões do usuário
    const updateData: any = { role };

    // Se foram fornecidas permissões, atualizá-las
    if (accessPermissions) {
      updateData.accessPermissions = accessPermissions;
    }

    // Obter o histórico de acesso atual do usuário
    const userAccessHistory = userToUpdate.accessHistory || [];

    // Adicionar entrada no histórico de acesso
    const historyEntry = {
      timestamp: new Date(),
      action: 'ROLE_UPDATED',
      details: `Papel alterado de ${userToUpdate.role} para ${role} por ${requestingUser.firstName} ${requestingUser.lastName}`
    };

    // Atualizar o usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        accessHistory: [...userAccessHistory, historyEntry]
      }
    });

    // Obter o histórico de acesso atual do administrador
    const adminAccessHistory = requestingUser.accessHistory || [];

    // Registrar a ação no histórico do administrador
    await prisma.user.update({
      where: { id: requestingUser.id },
      data: {
        accessHistory: [
          ...adminAccessHistory,
          {
            timestamp: new Date(),
            action: 'UPDATE_USER_ROLE',
            details: `Alterou o papel de ${userToUpdate.firstName} ${userToUpdate.lastName} de ${userToUpdate.role} para ${role}`
          }
        ]
      }
    });

    // Retornar os dados do usuário atualizado (sem campos sensíveis)
    const userResponse = {
      ...updatedUser,
      password: undefined,
      verificationCode: undefined,
      verificationCodeExpires: undefined
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
