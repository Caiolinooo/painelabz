import { sendEmail } from './email';
import { prisma } from './db';
import {
  accessApprovalTemplate,
  accessRejectionTemplate,
  inviteCodeTemplate,
  passwordExpiryTemplate,
  customTemplate,
  reimbursementConfirmationTemplate,
  reimbursementApprovalTemplate,
  reimbursementRejectionTemplate,
  newUserWelcomeTemplate,
  inviteTemplate
} from './emailTemplates';

/**
 * Envia uma notificação por email sobre a aprovação de acesso
 * @param userId ID do usuário que teve o acesso aprovado
 * @param approvedById ID do administrador que aprovou o acesso
 * @returns Resultado do envio
 */
export async function sendAccessApprovalNotification(
  authorizedUserId: string,
  approvedById: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    console.log(`Iniciando envio de notificação de aprovação para ID: ${authorizedUserId}`);

    // Buscar informações do usuário autorizado
    const authorizedUser = await prisma.authorizedUser.findUnique({
      where: { id: authorizedUserId }
    });

    if (!authorizedUser) {
      console.error(`Usuário autorizado não encontrado: ${authorizedUserId}`);
      return {
        success: false,
        message: 'Usuário autorizado não encontrado'
      };
    }

    console.log(`Usuário autorizado encontrado: ${authorizedUser.email || 'Sem email'}`);

    // Buscar informações do administrador
    const admin = await prisma.user.findUnique({
      where: { id: approvedById }
    });

    if (!admin) {
      console.error(`Administrador não encontrado: ${approvedById}`);
      return {
        success: false,
        message: 'Administrador não encontrado'
      };
    }

    console.log(`Administrador encontrado: ${admin.firstName} ${admin.lastName}`);

    // Se não tiver email, não pode enviar notificação
    if (!authorizedUser.email) {
      console.error('Usuário não possui email para notificação');
      return {
        success: false,
        message: 'Usuário não possui email para notificação'
      };
    }

    // Preparar conteúdo do email
    const adminName = `${admin.firstName} ${admin.lastName}`;
    const emailSubject = 'Acesso Aprovado - ABZ Group';
    const emailContent = accessApprovalTemplate(adminName);

    console.log(`Enviando email para: ${authorizedUser.email}`);

    // Enviar email
    const emailResult = await sendCustomEmail(
      authorizedUser.email,
      emailSubject,
      emailContent
    );

    console.log(`Resultado do envio: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
    if (emailResult.previewUrl) {
      console.log(`URL de preview: ${emailResult.previewUrl}`);
    }

    return emailResult;
  } catch (error) {
    console.error('Erro ao enviar notificação de aprovação:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar notificação de aprovação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um email personalizado
 * @param email Email do destinatário ou array de emails
 * @param subject Assunto do email
 * @param htmlContent Conteúdo HTML do email
 * @returns Resultado do envio
 */
export async function sendCustomEmail(
  email: string | string[],
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    console.log(`Iniciando envio de email personalizado para: ${email}`);
    console.log(`Assunto: ${subject}`);

    // Preparar o conteúdo do email
    const text = htmlContent.replace(/<[^>]*>/g, ''); // Versão texto simples removendo tags HTML

    console.log('Opções de email configuradas, chamando função de envio...');

    // Chamar a função de envio de email consolidada do arquivo email.ts
    const result = await sendEmail(
      email,
      subject,
      text,
      htmlContent,
      {
        from: process.env.EMAIL_FROM || '"ABZ Group" <apiabz@groupabz.com>'
      }
    );

    console.log(`Resultado do envio: ${result.success ? 'Sucesso' : 'Falha'}`);
    if (result.previewUrl) {
      console.log(`URL de preview: ${result.previewUrl}`);
    }

    return result;
  } catch (error) {
    console.error('Erro ao enviar email personalizado:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar email personalizado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um email com código de convite
 * @param email Email do destinatário
 * @param inviteCode Código de convite
 * @param expiresAt Data de expiração do código
 * @param maxUses Número máximo de usos do código
 * @returns Resultado do envio
 */
export async function sendInviteCodeEmail(
  email: string,
  inviteCode: string,
  expiresAt: Date,
  maxUses: number
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    // Gerar conteúdo do email usando o template
    const emailContent = inviteCodeTemplate(inviteCode, expiresAt, maxUses);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      `Convite para ${process.env.EMAIL_COMPANY_NAME || 'ABZ Group'}`,
      emailContent
    );

    return result;
  } catch (error) {
    console.error('Erro ao enviar email com código de convite:', error);
    return {
      success: false,
      message: 'Erro ao enviar email com código de convite'
    };
  }
}

/**
 * Envia um email de notificação de expiração de senha
 * @param email Email do destinatário
 * @param daysRemaining Dias restantes até a expiração da senha
 * @returns Resultado do envio
 */
export async function sendPasswordExpiryEmail(
  email: string,
  daysRemaining: number
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    // Gerar conteúdo do email usando o template
    const emailContent = passwordExpiryTemplate(daysRemaining);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      'Sua Senha Irá Expirar em Breve',
      emailContent
    );

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de expiração de senha:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de expiração de senha'
    };
  }
}

/**
 * Envia uma notificação por email sobre a rejeição de acesso
 * @param authorizedUserId ID do usuário que teve o acesso rejeitado
 * @param rejectedById ID do administrador que rejeitou o acesso
 * @param reason Motivo da rejeição (opcional)
 * @returns Resultado do envio
 */
export async function sendAccessRejectionNotification(
  authorizedUserId: string,
  rejectedById: string,
  reason?: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    console.log(`Iniciando envio de notificação de rejeição para ID: ${authorizedUserId}`);

    // Buscar informações do usuário autorizado
    const authorizedUser = await prisma.authorizedUser.findUnique({
      where: { id: authorizedUserId }
    });

    if (!authorizedUser) {
      console.error(`Usuário autorizado não encontrado: ${authorizedUserId}`);
      return {
        success: false,
        message: 'Usuário autorizado não encontrado'
      };
    }

    console.log(`Usuário autorizado encontrado: ${authorizedUser.email || 'Sem email'}`);

    // Buscar informações do administrador
    const admin = await prisma.user.findUnique({
      where: { id: rejectedById }
    });

    if (!admin) {
      console.error(`Administrador não encontrado: ${rejectedById}`);
      return {
        success: false,
        message: 'Administrador não encontrado'
      };
    }

    console.log(`Administrador encontrado: ${admin.firstName} ${admin.lastName}`);

    // Se não tiver email, não pode enviar notificação
    if (!authorizedUser.email) {
      console.error('Usuário não possui email para notificação');
      return {
        success: false,
        message: 'Usuário não possui email para notificação'
      };
    }

    // Preparar conteúdo do email
    const adminName = `${admin.firstName} ${admin.lastName}`;
    const emailSubject = 'Solicitação de Acesso Negada - ABZ Group';
    const emailContent = accessRejectionTemplate(adminName, reason);

    console.log(`Enviando email para: ${authorizedUser.email}`);
    console.log(`Motivo da rejeição: ${reason || 'Não especificado'}`);

    // Enviar email
    const emailResult = await sendCustomEmail(
      authorizedUser.email,
      emailSubject,
      emailContent
    );

    console.log(`Resultado do envio: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
    if (emailResult.previewUrl) {
      console.log(`URL de preview: ${emailResult.previewUrl}`);
    }

    return emailResult;
  } catch (error) {
    console.error('Erro ao enviar notificação de rejeição:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar notificação de rejeição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um email de confirmação de solicitação de reembolso
 * @param email Email do destinatário
 * @param nome Nome do solicitante
 * @param protocolo Número do protocolo
 * @param valor Valor do reembolso
 * @returns Resultado do envio
 */
export async function sendReimbursementConfirmationEmail(
  email: string,
  nome: string,
  protocolo: string,
  valor: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    // Gerar conteúdo do email usando o template
    const emailContent = reimbursementConfirmationTemplate(nome, protocolo, valor);

    // Enviar email para o solicitante e para o departamento de logística
    const result = await sendCustomEmail(
      [email, 'logistica@groupabz.com'],
      `Solicitação de Reembolso - Protocolo: ${protocolo}`,
      emailContent
    );

    console.log(`Email de reembolso enviado para ${email} e logistica@groupabz.com`);

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de confirmação de reembolso:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de confirmação de reembolso'
    };
  }
}

/**
 * Envia um email de aprovação de reembolso
 * @param email Email do destinatário
 * @param nome Nome do solicitante
 * @param protocolo Número do protocolo
 * @param valor Valor do reembolso
 * @param metodoPagamento Método de pagamento
 * @param observacao Observação opcional
 * @returns Resultado do envio
 */
export async function sendReimbursementApprovalEmail(
  email: string,
  nome: string,
  protocolo: string,
  valor: string,
  metodoPagamento: string,
  observacao?: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    // Gerar conteúdo do email usando o template
    const emailContent = reimbursementApprovalTemplate(nome, protocolo, valor, metodoPagamento, observacao);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      `Reembolso Aprovado - Protocolo: ${protocolo}`,
      emailContent
    );

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de aprovação de reembolso:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de aprovação de reembolso'
    };
  }
}

/**
 * Envia um email de rejeição de reembolso
 * @param email Email do destinatário
 * @param nome Nome do solicitante
 * @param protocolo Número do protocolo
 * @param motivo Motivo da rejeição
 * @returns Resultado do envio
 */
export async function sendReimbursementRejectionEmail(
  email: string,
  nome: string,
  protocolo: string,
  motivo: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    // Gerar conteúdo do email usando o template
    const emailContent = reimbursementRejectionTemplate(nome, protocolo, motivo);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      `Reembolso Não Aprovado - Protocolo: ${protocolo}`,
      emailContent
    );

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de rejeição de reembolso:', error);
    return {
      success: false,
      message: 'Erro ao enviar email de rejeição de reembolso'
    };
  }
}

/**
 * Envia um email de boas-vindas para novos usuários
 * @param email Email do destinatário
 * @param nome Nome do usuário
 * @returns Resultado do envio
 */
export async function sendNewUserWelcomeEmail(
  email: string,
  nome: string
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    console.log(`Enviando email de boas-vindas para: ${email}`);

    // Obter a URL de login do sistema
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : 'http://localhost:3000/login';

    // Gerar conteúdo do email usando o template
    const emailContent = newUserWelcomeTemplate(nome, loginUrl);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      `Bem-vindo ao ${process.env.EMAIL_COMPANY_NAME || 'ABZ Group'}`,
      emailContent
    );

    console.log(`Resultado do envio de email de boas-vindas: ${result.success ? 'Sucesso' : 'Falha'}`);
    if (result.previewUrl) {
      console.log(`URL de preview: ${result.previewUrl}`);
    }

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar email de boas-vindas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um email com código de convite para novos usuários com URL de registro
 * @param email Email do destinatário
 * @param inviteCode Código de convite
 * @param expiresAt Data de expiração do convite
 * @param maxUses Número máximo de usos do convite
 * @returns Resultado do envio
 */
export async function sendInviteWithRegisterLinkEmail(
  email: string,
  inviteCode: string,
  expiresAt?: Date,
  maxUses?: number
): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    console.log(`Enviando email de convite para: ${email}`);

    // Obter a URL de registro do sistema
    const registerUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/register?code=${inviteCode}` : `http://localhost:3000/register?code=${inviteCode}`;

    // Formatar data de expiração
    let expiryText = '';
    if (expiresAt) {
      const formattedDate = expiresAt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      expiryText = `Este convite expira em ${formattedDate}`;
    }

    // Gerar conteúdo do email usando o template
    const emailContent = inviteTemplate(inviteCode, registerUrl, expiryText, maxUses);

    // Enviar email
    const result = await sendCustomEmail(
      email,
      `Convite para ${process.env.EMAIL_COMPANY_NAME || 'ABZ Group'}`,
      emailContent
    );

    console.log(`Resultado do envio de email de convite: ${result.success ? 'Sucesso' : 'Falha'}`);
    if (result.previewUrl) {
      console.log(`URL de preview: ${result.previewUrl}`);
    }

    return result;
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return {
      success: false,
      message: `Erro ao enviar email de convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
