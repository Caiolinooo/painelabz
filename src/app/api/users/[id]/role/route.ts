import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, handleApiError } from '@/lib/api-utils';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Buscar o usuário a ser atualizado
    const userToUpdate = await User.findById(userId);
    
    if (!userToUpdate) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o usuário está tentando alterar seu próprio papel
    if (userToUpdate._id.toString() === requestingUser._id.toString() && role !== 'ADMIN') {
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
    
    // Adicionar entrada no histórico de acesso
    const historyEntry = {
      timestamp: new Date(),
      action: 'ROLE_UPDATED',
      details: `Papel alterado de ${userToUpdate.role} para ${role} por ${requestingUser.firstName} ${requestingUser.lastName}`
    };
    
    updateData.$push = { accessHistory: historyEntry };
    
    // Atualizar o usuário
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    // Registrar a ação no histórico do administrador
    await User.findByIdAndUpdate(
      requestingUser._id,
      {
        $push: {
          accessHistory: {
            timestamp: new Date(),
            action: 'UPDATE_USER_ROLE',
            details: `Alterou o papel de ${userToUpdate.firstName} ${userToUpdate.lastName} de ${userToUpdate.role} para ${role}`
          }
        }
      }
    );
    
    // Retornar os dados do usuário atualizado (sem campos sensíveis)
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpires;
    
    return NextResponse.json(userResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
