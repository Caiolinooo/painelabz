/**
 * Sistema de autenticação e autorização
 */
import { IUser } from '@/models/User';
import { generateVerificationCode, sendVerificationSMS, isVerificationCodeValid, sendVerificationEmail } from './sms';
import { checkUserAuthorization, createAccessRequest } from './authorization';
import dbConnect from './mongodb';
import { prisma } from './db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Tipo para o payload do token
export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  role: string;
}

// Função para buscar usuário usando Mongoose e Prisma como fallback
async function findUserByQuery(query: any): Promise<IUser | null> {
  try {
    // Primeiro tenta com Mongoose
    let user = await User.findOne(query);

    // Se não encontrar, tenta com Prisma
    if (!user) {
      const prismaQuery: any = {};

      // Converter query do Mongoose para Prisma
      if (query.phoneNumber) prismaQuery.phoneNumber = query.phoneNumber;
      if (query.email) prismaQuery.email = query.email;
      if (query._id) prismaQuery.id = query._id.toString();

      const prismaUser = await prisma.user.findFirst({
        where: prismaQuery
      });

      if (prismaUser) {
        // Converter usuário do Prisma para formato Mongoose
        user = await User.findOneAndUpdate(
          { phoneNumber: prismaUser.phoneNumber },
          {
            firstName: prismaUser.firstName,
            lastName: prismaUser.lastName,
            email: prismaUser.email,
            role: prismaUser.role,
            // Outros campos conforme necessário
          },
          { new: true, upsert: true }
        );
      }
    }

    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

// Interface de credenciais para login por telefone
export interface PhoneCredentials {
  phoneNumber: string;
  verificationCode?: string;
}

// Função para gerar um token JWT
export function generateToken(user: IUser): string {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    phoneNumber: user.phoneNumber,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d', // Token expira em 7 dias
  });
}

// Função para gerar um token de redefinição de senha
export function generatePasswordResetToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');

  // Token expira em 1 hora
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  return { token, expiresAt };
}

// Função para enviar email de redefinição de senha
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<{ success: boolean; message: string }> {
  // Em ambiente de desenvolvimento, simular envio
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV MODE] Enviando email de redefinição para ${email} com URL: ${resetUrl}`);
    return {
      success: true,
      message: 'Email simulado enviado com sucesso (modo de desenvolvimento)'
    };
  }

  try {
    // Configurar o transportador de email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Configurar o email
    const mailOptions = {
      from: `"ABZ Group" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Redefinição de Senha - ABZ Group',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0066cc; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">ABZ Group</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2>Redefinição de Senha</h2>
            <p>Você solicitou a redefinição de senha para sua conta no ABZ Group.</p>
            <p>Clique no botão abaixo para redefinir sua senha:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Redefinir Senha</a>
            </div>
            <p>Se você não solicitou esta redefinição, ignore este email.</p>
            <p>Este link é válido por 1 hora.</p>
            <p>Atenciosamente,<br>Equipe ABZ Group</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            &copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.
          </div>
        </div>
      `
    };

    // Enviar o email
    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Email de redefinição enviado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao enviar email de redefinição:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de redefinição'
    };
  }
}

// Função para enviar SMS de redefinição de senha
export async function sendPasswordResetSMS(phoneNumber: string, resetUrl: string): Promise<{ success: boolean; message: string }> {
  // Em ambiente de desenvolvimento, simular envio
  if (process.env.NODE_ENV !== 'production' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[DEV MODE] Enviando SMS de redefinição para ${phoneNumber} com URL: ${resetUrl}`);
    return {
      success: true,
      message: 'SMS simulado enviado com sucesso (modo de desenvolvimento)'
    };
  }

  try {
    // Carregar o Twilio dinamicamente
    const twilio = await import('twilio');
    const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Criar URL encurtada para o SMS (o resetUrl pode ser muito longo)
    // Aqui você pode implementar um serviço de encurtamento de URL se necessário
    const shortUrl = resetUrl; // Por enquanto, usamos a URL completa

    // Enviar SMS
    const message = await client.messages.create({
      body: `ABZ Group: Redefina sua senha usando este link: ${shortUrl} (válido por 1 hora)`,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: phoneNumber
    });

    console.log(`SMS de redefinição enviado com sucesso. SID: ${message.sid}`);

    return {
      success: true,
      message: 'SMS de redefinição enviado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao enviar SMS de redefinição:', error);
    return {
      success: false,
      message: 'Erro ao enviar SMS de redefinição'
    };
  }
}

// Função para verificar um token JWT
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Função para extrair o token do cabeçalho de autorização
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' do início
}

// Função para iniciar o processo de login por SMS ou Email
export async function initiatePhoneLogin(phoneNumber: string, email?: string, inviteCode?: string): Promise<{ success: boolean; message: string; hasPassword?: boolean; previewUrl?: string; method?: 'sms' | 'email'; authStatus?: string; authorized?: boolean }> {
  await dbConnect();

  try {
    // Verificar se o usuário existe pelo telefone
    let user = await findUserByQuery({ phoneNumber });

    // Se não encontrou pelo telefone e temos um email, tenta pelo email
    if (!user && email) {
      user = await findUserByQuery({ email });
    }

    // Verificar se o usuário tem senha
    if (user && user.password) {
      console.log('Usuário encontrado e tem senha cadastrada:', user.phoneNumber);
      return {
        success: true,
        message: 'Usuário encontrado e tem senha cadastrada',
        hasPassword: true
      };
    }

    // Verificar autorização para todos os usuários (existentes ou não)
    // Isso garante que apenas usuários autorizados recebam códigos de verificação
    const authCheck = await checkUserAuthorization(email, phoneNumber, inviteCode);
    const adminPhone = process.env.ADMIN_PHONE_NUMBER || '';

    // Se o usuário não existe
    if (!user) {
      // Se não está autorizado e não é o admin, retornar erro
      if (!authCheck.authorized && phoneNumber !== adminPhone) {
        console.log('Telefone fornecido:', phoneNumber);
        console.log('Telefone admin:', adminPhone);
        console.log('Usuário não autorizado a receber código');

        // Se o status for pendente, informar que está aguardando aprovação
        if (authCheck.status === 'pending') {
          return {
            success: false,
            message: 'Sua solicitação de acesso está pendente de aprovação.',
            authStatus: 'pending'
          };
        }

        // Criar solicitação de acesso automaticamente
        await createAccessRequest(email, phoneNumber, 'Solicitação automática via login');

        return {
          success: false,
          message: 'Você não está autorizado a acessar o sistema. Uma solicitação de acesso foi criada e está aguardando aprovação.',
          authStatus: 'unauthorized'
        };
      }
    } else {
      // Se o usuário existe mas está inativo
      if (!user.active) {
        return {
          success: false,
          message: 'Sua conta está desativada. Entre em contato com o suporte.',
          authStatus: 'inactive'
        };
      }

      // Se o usuário existe mas não está autorizado a receber código
      if (!authCheck.authorized && phoneNumber !== adminPhone) {
        console.log('Usuário existente mas não autorizado a receber código');
        return {
          success: true,
          message: 'Usuário encontrado mas não autorizado a receber código',
          hasPassword: !!user.password,
          authStatus: 'unauthorized'
        };
      }
    }

    // Se for o número de telefone do administrador, criar o usuário admin
    // Usando a mesma variável adminPhone declarada acima
    if (phoneNumber === adminPhone && !user) {
      console.log('Criando usuário admin para o telefone:', phoneNumber);
      const adminUser = new User({
        phoneNumber,
        firstName: 'Admin',
        lastName: 'ABZ',
        role: 'ADMIN',
        position: 'Administrador do Sistema',
        department: 'TI',
        active: true,
        passwordLastChanged: new Date(),
        accessPermissions: getDefaultPermissions('ADMIN'),
        accessHistory: [{
          timestamp: new Date(),
          action: 'CREATED',
          details: 'Usuário administrador criado automaticamente'
        }]
      });
      await adminUser.save();
      user = adminUser;
    }

    // Verificar se o usuário já tem senha definida
    if (user && user.password) {
      // Verificar se o usuário está ativo
      if (!user.active) {
        return {
          success: false,
          message: 'Sua conta está desativada. Entre em contato com o suporte.',
          authStatus: 'inactive'
        };
      }

      return {
        success: true,
        message: 'Usuário encontrado com senha definida.',
        hasPassword: true
      };
    }

    // Gerar código de verificação
    const verificationCode = generateVerificationCode();

    // Calcular data de expiração (15 minutos por padrão)
    const expiryMinutes = parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15');
    const verificationCodeExpires = new Date();
    verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + expiryMinutes);

    // Determinar o método de envio (SMS ou Email)
    let method: 'sms' | 'email' = 'sms';
    let sendResult: any = { success: false };
    let query = { phoneNumber };

    // Se o usuário tem email e foi fornecido, usar email
    if (email && user.email) {
      method = 'email';
      query = { _id: user._id };
      sendResult = await sendVerificationEmail(user.email, verificationCode);
    } else {
      // Caso contrário, usar SMS
      sendResult = await sendVerificationSMS(phoneNumber, verificationCode);
    }

    // Atualizar usuário com o código de verificação
    await User.findOneAndUpdate(
      query,
      {
        verificationCode,
        verificationCodeExpires,
        active: true
      }
    );

    if (!sendResult.success) {
      return {
        success: false,
        message: `Erro ao enviar código de verificação por ${method === 'sms' ? 'SMS' : 'Email'}.`
      };
    }

    return {
      success: true,
      message: `Código de verificação enviado com sucesso por ${method === 'sms' ? 'SMS' : 'Email'}.`,
      method,
      previewUrl: sendResult.previewUrl
    };
  } catch (error) {
    console.error('Erro ao iniciar login por telefone:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Por favor, tente novamente.'
    };
  }
}

// Função para verificar o código e completar o login
export async function verifyPhoneLogin(phoneNumber: string, code: string, email?: string, inviteCode?: string): Promise<{ success: boolean; message: string; user?: IUser; token?: string; authStatus?: string }> {
  console.log('Verificando código para login:', { phoneNumber, email, inviteCode });
  await dbConnect();

  try {
    // Buscar o usuário pelo número de telefone ou email
    let user;
    let method: 'sms' | 'email' = 'sms';
    let identifier = phoneNumber;

    if (email) {
      // Se temos um email, tentar encontrar o usuário por email primeiro
      user = await findUserByQuery({ email });
      if (user) {
        method = 'email';
        identifier = email;
      }
    }

    // Se não encontrou por email ou não tinha email, buscar por telefone
    if (!user) {
      user = await findUserByQuery({ phoneNumber });
    }

    if (!user) {
      // Verificar se o usuário está autorizado antes de criar uma conta
      const authCheck = await checkUserAuthorization(email, phoneNumber, inviteCode);

      if (!authCheck.authorized && phoneNumber !== process.env.ADMIN_PHONE_NUMBER) {
        // Se o status for pendente, informar que está aguardando aprovação
        if (authCheck.status === 'pending') {
          return {
            success: false,
            message: 'Sua solicitação de acesso está pendente de aprovação.',
            authStatus: 'pending'
          };
        }

        return {
          success: false,
          message: 'Você não está autorizado a acessar o sistema.',
          authStatus: 'unauthorized'
        };
      }

      // Se for o número de telefone do administrador, criar o usuário admin
      const adminPhone = process.env.ADMIN_PHONE_NUMBER || '';
      if (phoneNumber === adminPhone) {
        // Criar usuário administrador com campos obrigatórios
        const adminUser = new User({
          phoneNumber,
          firstName: 'Admin',
          lastName: 'ABZ',
          role: 'ADMIN',
          position: 'Administrador do Sistema',
          department: 'TI',
          active: true,
          verificationCode: code, // Usar o código fornecido
          verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
          accessPermissions: getDefaultPermissions('ADMIN'),
          accessHistory: [{
            timestamp: new Date(),
            action: 'CREATED',
            details: 'Usuário administrador criado automaticamente'
          }]
        });

        try {
          await adminUser.save();
          console.log('Usuário administrador criado com sucesso');

          // Limpar o código de verificação
          adminUser.verificationCode = undefined;
          adminUser.verificationCodeExpires = undefined;
          await adminUser.save();

          // Gerar token JWT
          const token = generateToken(adminUser);

          return {
            success: true,
            message: 'Login realizado com sucesso.',
            user: adminUser,
            token
          };
        } catch (error) {
          console.error('Erro ao criar usuário administrador:', error);
          return {
            success: false,
            message: 'Erro ao criar usuário administrador.'
          };
        }
      }

      return {
        success: false,
        message: 'Usuário não encontrado.'
      };
    }

    // Verificar se a conta está ativa
    if (!user.active) {
      return {
        success: false,
        message: 'Sua conta está desativada. Entre em contato com o suporte.',
        authStatus: 'inactive'
      };
    }

    // Verificar se o código é válido
    const isValid = await isVerificationCodeValid(
      identifier,
      code,
      user.verificationCode,
      user.verificationCodeExpires,
      method
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Código de verificação inválido ou expirado.'
      };
    }

    // Limpar o código de verificação
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Gerar token JWT
    const token = generateToken(user);

    return {
      success: true,
      message: 'Login realizado com sucesso.',
      user,
      token
    };
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Por favor, tente novamente.'
    };
  }
}

// Função para atualizar a senha do usuário
export async function updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  await dbConnect();

  try {
    const user = await findUserByQuery({ _id: userId });

    if (!user) {
      return {
        success: false,
        message: 'Usuário não encontrado.'
      };
    }

    // Atualizar senha
    user.password = newPassword;

    // Definir data de expiração da senha (1 ano por padrão)
    const passwordLastChanged = new Date();
    user.passwordLastChanged = passwordLastChanged;

    await user.save();

    return {
      success: true,
      message: 'Senha atualizada com sucesso.'
    };
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Por favor, tente novamente.'
    };
  }
}

// Função para verificar se a senha do usuário expirou
export function isPasswordExpired(passwordLastChanged: Date | undefined, role?: string): boolean {
  // Administradores não têm senha expirada
  if (role === 'ADMIN') {
    return false;
  }

  // Se não houver data de alteração de senha, considerar expirada
  if (!passwordLastChanged) {
    return true;
  }

  const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '365');
  const now = new Date();
  const expiryDate = new Date(passwordLastChanged);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  return now > expiryDate;
}

// Função para verificar se o usuário é administrador
export function isAdmin(user: IUser | null): boolean {
  console.log('Verificando se o usuário é admin:', { userId: user?._id, role: user?.role });
  if (!user) return false;
  return user.role === 'ADMIN';
}

// Função para verificar se o usuário é gerente
export function isManager(user: IUser | null): boolean {
  return user?.role === 'MANAGER';
}

// Função para obter permissões padrão com base no papel
export function getDefaultPermissions(role: 'ADMIN' | 'MANAGER' | 'USER') {
  const defaultPermissions = {
    ADMIN: {
      modules: {
        dashboard: true,
        manual: true,
        procedimentos: true,
        politicas: true,
        calendario: true,
        noticias: true,
        reembolso: true,
        contracheque: true,
        ponto: true,
        admin: true
      }
    },
    MANAGER: {
      modules: {
        dashboard: true,
        manual: true,
        procedimentos: true,
        politicas: true,
        calendario: true,
        noticias: true,
        reembolso: true,
        contracheque: true,
        ponto: true,
        admin: false
      }
    },
    USER: {
      modules: {
        dashboard: true,
        manual: true,
        procedimentos: true,
        politicas: true,
        calendario: true,
        noticias: true,
        reembolso: true,
        contracheque: true,
        ponto: true,
        admin: false
      }
    }
  };

  return defaultPermissions[role];
}

// Função para verificar se o usuário tem acesso a um módulo específico
export function hasModuleAccess(user: IUser | null, moduleName: string): boolean {
  // Administradores sempre têm acesso a todos os módulos
  if (isAdmin(user)) {
    return true;
  }

  // Verificar se o usuário tem permissões definidas
  if (!user?.accessPermissions?.modules) {
    return false;
  }

  // Verificar se o módulo está nas permissões
  return user.accessPermissions.modules[moduleName] === true;
}

// Configurações de segurança para login
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutos em milissegundos

// Função para autenticar com senha
export async function loginWithPassword(identifier: string, password: string): Promise<{ success: boolean; message: string; user?: IUser; token?: string; locked?: boolean; lockExpires?: Date; attempts?: number; maxAttempts?: number }> {
  console.log('Tentando login com senha para:', identifier);
  await dbConnect();

  try {
    // Verificar se o identificador é um email ou número de telefone
    const isEmail = identifier.includes('@');

    // Buscar o usuário pelo email ou número de telefone
    const query = isEmail ? { email: identifier } : { phoneNumber: identifier };
    const user = await findUserByQuery(query);

    console.log('Buscando usuário por:', isEmail ? 'email' : 'telefone', identifier);
    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');

    if (!user) {
      // Verificar se é o número de telefone do administrador
      const adminPhone = process.env.ADMIN_PHONE_NUMBER || '';
      const adminEmail = process.env.ADMIN_EMAIL || '';

      if ((isEmail && identifier === adminEmail) || (!isEmail && identifier === adminPhone)) {
        // Criar usuário administrador com campos obrigatórios
        const adminUser = new User({
          phoneNumber: isEmail ? adminPhone : identifier,
          email: isEmail ? identifier : adminEmail,
          firstName: 'Admin',
          lastName: 'ABZ',
          role: 'ADMIN',
          position: 'Administrador do Sistema',
          department: 'TI',
          active: true,
          password: password, // A senha será hasheada automaticamente pelo middleware
          passwordLastChanged: new Date(),
          accessPermissions: getDefaultPermissions('ADMIN'),
          accessHistory: [{
            timestamp: new Date(),
            action: 'CREATED',
            details: 'Usuário administrador criado automaticamente'
          }]
        });

        try {
          await adminUser.save();
          console.log('Usuário administrador criado com sucesso');

          // Gerar token JWT
          const token = generateToken(adminUser);

          return {
            success: true,
            message: 'Login realizado com sucesso.',
            user: adminUser,
            token
          };
        } catch (error) {
          console.error('Erro ao criar usuário administrador:', error);
          return {
            success: false,
            message: 'Erro ao criar usuário administrador.'
          };
        }
      }

      return {
        success: false,
        message: 'Usuário não encontrado.'
      };
    }

    // Verificar se o usuário tem senha definida
    if (!user.password) {
      return {
        success: false,
        message: 'Usuário não possui senha definida.'
      };
    }

    // Verificar se a conta está ativa
    if (!user.active) {
      return {
        success: false,
        message: 'Sua conta está desativada. Entre em contato com o suporte.',
        authStatus: 'inactive'
      };
    }

    // Verificar se a conta está bloqueada
    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      // Calcular tempo restante em minutos
      const remainingTimeMinutes = Math.ceil((user.lockUntil.getTime() - now.getTime()) / 60000);

      return {
        success: false,
        message: `Conta temporariamente bloqueada devido a múltiplas tentativas de login. Tente novamente em ${remainingTimeMinutes} minutos.`,
        locked: true,
        lockExpires: user.lockUntil
      };
    }

    // Verificar se a senha está correta
    console.log('Verificando senha para o usuário:', user.phoneNumber);
    console.log('Senha fornecida (primeiros caracteres):', password.substring(0, 3) + '...');
    console.log('Senha armazenada (hash):', user.password);

    const isPasswordValid = await user.comparePassword(password);
    console.log('Resultado da verificação de senha:', isPasswordValid ? 'Válida' : 'Inválida');

    if (!isPasswordValid) {
      // Incrementar contador de tentativas falhas
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Se excedeu o número máximo de tentativas, bloquear a conta
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);

        // Registrar no histórico de acesso
        user.accessHistory.push({
          timestamp: new Date(),
          action: 'ACCOUNT_LOCKED',
          details: `Conta bloqueada por ${LOCK_TIME/60000} minutos devido a múltiplas tentativas de login`
        });

        await user.save();

        return {
          success: false,
          message: `Conta temporariamente bloqueada devido a múltiplas tentativas de login. Tente novamente em ${LOCK_TIME/60000} minutos.`,
          locked: true,
          lockExpires: user.lockUntil
        };
      }

      await user.save();

      return {
        success: false,
        message: 'Senha incorreta.',
        attempts: user.failedLoginAttempts,
        maxAttempts: MAX_LOGIN_ATTEMPTS
      };
    }

    // Resetar contador de tentativas falhas após login bem-sucedido
    if (user.failedLoginAttempts) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    // Registrar login no histórico de acesso
    user.accessHistory.push({
      timestamp: new Date(),
      action: 'LOGIN',
      details: 'Login com senha'
    });
    await user.save();

    // Gerar token JWT
    const token = generateToken(user);

    return {
      success: true,
      message: 'Login realizado com sucesso.',
      user,
      token
    };
  } catch (error) {
    console.error('Erro ao autenticar com senha:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Por favor, tente novamente.'
    };
  }
}
