import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateVerificationCode } from '@/lib/email';
import { sendInviteWithRegisterLinkEmail } from '@/lib/notifications';
import { sendInviteSMS } from '@/lib/sms';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { users, sendInvites = false, sendSMS = false } = await request.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Dados de usuários inválidos' },
        { status: 400 }
      );
    }

    console.log(`Importando ${users.length} usuários. Enviar convites por email: ${sendInvites ? 'Sim' : 'Não'}, por SMS: ${sendSMS ? 'Sim' : 'Não'}`);

    const results = {
      success: 0,
      error: 0,
      invitesSent: 0,
      smsSent: 0,
      details: [] as any[],
    };

    // Processar cada usuário no lote
    for (const userData of users) {
      try {
        // Normalizar dados
        const normalizedUser = normalizeUserData(userData);

        // Validar dados
        const validationResult = validateUserData(normalizedUser);
        if (!validationResult.isValid) {
          results.error++;
          results.details.push({
            user: normalizedUser,
            success: false,
            error: validationResult.error,
          });
          continue;
        }

        // Verificar se o usuário já existe
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalizedUser.email || undefined },
              { phoneNumber: normalizedUser.phoneNumber || undefined },
            ],
          },
        });

        if (existingUser) {
          // Atualizar usuário existente
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: normalizedUser.name || existingUser.name,
              email: normalizedUser.email || existingUser.email,
              phoneNumber: normalizedUser.phoneNumber || existingUser.phoneNumber,
              department: normalizedUser.department || existingUser.department,
              position: normalizedUser.position || existingUser.position,
              updatedAt: new Date(),
            },
          });

          results.success++;
          results.details.push({
            user: normalizedUser,
            success: true,
            action: 'updated',
          });
        } else {
          // Criar novo usuário
          const inviteCode = generateVerificationCode();

          const newUser = await prisma.user.create({
            data: {
              name: normalizedUser.name,
              email: normalizedUser.email,
              phoneNumber: normalizedUser.phoneNumber,
              department: normalizedUser.department,
              position: normalizedUser.position,
              role: 'USER', // Papel padrão
              active: true,
              inviteCode,
              inviteSent: true,
              inviteSentAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Enviar e-mail de convite se a opção estiver ativada
          if (sendInvites && normalizedUser.email) {
            try {
              console.log(`Enviando convite para ${normalizedUser.email}`);
              const emailResult = await sendInviteWithRegisterLinkEmail(
                normalizedUser.email,
                inviteCode
              );

              console.log(`Resultado do envio de convite para ${normalizedUser.email}: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
              if (emailResult.previewUrl) {
                console.log(`URL de preview: ${emailResult.previewUrl}`);
              }

              if (emailResult.success) {
                results.invitesSent++;
              }
            } catch (emailError) {
              console.error('Erro ao enviar e-mail de convite:', emailError);
              // Continuar mesmo se o e-mail falhar
            }
          } else if (normalizedUser.email) {
            console.log(`Convite por email não enviado para ${normalizedUser.email} (opção desativada)`);
          }

          // Enviar SMS de convite se a opção estiver ativada
          if (sendSMS && normalizedUser.phoneNumber) {
            try {
              console.log(`Enviando SMS de convite para ${normalizedUser.phoneNumber}`);
              const smsResult = await sendInviteSMS(
                normalizedUser.phoneNumber,
                inviteCode,
                normalizedUser.name
              );

              console.log(`Resultado do envio de SMS para ${normalizedUser.phoneNumber}: ${smsResult.success ? 'Sucesso' : 'Falha'}`);

              if (smsResult.success) {
                results.smsSent++;
              }
            } catch (smsError) {
              console.error('Erro ao enviar SMS de convite:', smsError);
              // Continuar mesmo se o SMS falhar
            }
          } else if (normalizedUser.phoneNumber) {
            console.log(`SMS de convite não enviado para ${normalizedUser.phoneNumber} (opção desativada)`);
          }

          results.success++;
          results.details.push({
            user: normalizedUser,
            success: true,
            action: 'created',
          });
        }
      } catch (userError) {
        console.error('Erro ao processar usuário:', userError);
        results.error++;
        results.details.push({
          user: userData,
          success: false,
          error: 'Erro interno ao processar usuário',
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Erro na importação de usuários:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Normalizar dados do usuário
function normalizeUserData(userData: any) {
  // Mapear campos com diferentes nomes possíveis
  const nameFields = ['nome', 'name', 'fullName', 'nome_completo', 'colaborador'];
  const emailFields = ['email', 'e-mail', 'correio', 'email_corporativo'];
  const phoneFields = ['telefone', 'phone', 'celular', 'mobile', 'fone'];
  const departmentFields = ['departamento', 'department', 'setor', 'area', 'centro_custo'];
  const positionFields = ['cargo', 'position', 'funcao', 'job_title'];

  // Função para encontrar o primeiro campo válido
  const findFirstValidField = (obj: any, fields: string[]) => {
    for (const field of fields) {
      if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
        return obj[field];
      }
    }
    return null;
  };

  // Normalizar telefone
  const normalizePhone = (phone: string | null) => {
    if (!phone) return null;

    // Remover caracteres não numéricos
    const digits = phone.replace(/\\D/g, '');

    // Garantir que tenha o formato correto
    if (digits.length >= 10) {
      // Adicionar código do país se não tiver
      if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
      }
      return `+${digits}`;
    }

    return null;
  };

  return {
    name: findFirstValidField(userData, nameFields) || '',
    email: findFirstValidField(userData, emailFields) || null,
    phoneNumber: normalizePhone(findFirstValidField(userData, phoneFields)),
    department: findFirstValidField(userData, departmentFields) || null,
    position: findFirstValidField(userData, positionFields) || null,
  };
}

// Validar dados do usuário
function validateUserData(userData: any) {
  // Verificar se tem pelo menos nome e um contato (email ou telefone)
  if (!userData.name || userData.name.trim() === '') {
    return {
      isValid: false,
      error: 'Nome é obrigatório',
    };
  }

  if (!userData.email && !userData.phoneNumber) {
    return {
      isValid: false,
      error: 'É necessário pelo menos um contato (email ou telefone)',
    };
  }

  // Validar formato de email
  if (userData.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(userData.email)) {
    return {
      isValid: false,
      error: 'Formato de email inválido',
    };
  }

  return { isValid: true };
}
