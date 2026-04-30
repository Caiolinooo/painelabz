/**
 * Ferramenta de Email para o Sistema IA
 * Portal ABZ - Envio de emails via nodemailer
 */
import nodemailer from 'nodemailer';

// Configuração do transporter
function getTransporter() {
  // Debug: mostrar variáveis disponíveis
  console.log('[IA Email Debug] EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('[IA Email Debug] EMAIL_USER:', process.env.EMAIL_USER);
  console.log('[IA Email Debug] EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('[IA Email Debug] EMAIL_PASS defined:', !!process.env.EMAIL_PASS);

  // Verificar qual configuração está disponível (com fallback para desenvolvimento)
  const emailHost = process.env.EMAIL_HOST || 'smtp.office365.com';
  const emailPort = process.env.EMAIL_PORT || '587';
  const emailUser = process.env.EMAIL_USER || 'apiabz@groupabz.com';
  const emailPass = process.env.EMAIL_PASS || 'Abz@2025';
  const emailFrom = process.env.EMAIL_FROM || 'apiabz@groupabz.com';

  console.log('[IA Email] Usando SMTP:', emailHost, 'port:', emailPort, 'user:', emailUser);

  if (emailHost && emailUser && emailPass) {
    return nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort),
      secure: parseInt(emailPort) === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    }, {
      from: `ABZ Portal <${emailFrom}>`,
    });
  }

  // Fallback para desenvolvimento - usar ethereal
  console.warn('[IA Email] Nenhuma configuração SMTP encontrada. Usando modo mock.');
  return null;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envia email real usando nodemailer
 */
export async function sendEmailWithNodemailer(options: SendEmailOptions): Promise<SendEmailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    // Modo mock - retorna sucesso simulado
    console.log('[IA Email] Modo mock ativo. Email seria enviado para:', options.to);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      error: 'Modo mock ativo - email não enviado',
    };
  }

  try {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@groupabz.com',
      to,
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]*>/g, ''),
      html: options.html,
      attachments: options.attachments,
    });

    console.log('[IA Email] Email enviado com sucesso:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[IA Email] Erro ao enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Envia email com relatório anexado (Excel ou PDF)
 */
export async function sendReportEmail(
  to: string,
  subject: string,
  reportType: string,
  reportBase64: string,
  filename: string,
  summary?: string
): Promise<SendEmailResult> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ABZ GROUP</h1>
        <p style="color: #9BC2E6; margin: 5px 0 0 0;">Portal Corporativo</p>
      </div>
      
      <div style="padding: 20px; background: #f5f5f5;">
        <h2 style="color: #1F4E79;">Relatório: ${reportType}</h2>
        
        ${summary ? `<p style="color: #333;">${summary}</p>` : ''}
        
        <p style="color: #666;">
          O relatório está anexo a este email no formato ${filename.endsWith('.xlsx') ? 'Excel' : 'PDF'}.
        </p>
        
        <div style="margin-top: 20px; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 5px;">
          <p style="margin: 0; color: #888; font-size: 12px;">
            Este email foi enviado automaticamente pelo Assistente IA do Portal ABZ Group.
          </p>
        </div>
      </div>
      
      <div style="background: #333; padding: 15px; text-align: center;">
        <p style="color: #999; margin: 0; font-size: 11px;">
          © ${new Date().getFullYear()} ABZ Group - Todos os direitos reservados
        </p>
      </div>
    </div>
  `;

  return sendEmailWithNodemailer({
    to,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename,
        content: Buffer.from(reportBase64, 'base64'),
        contentType: filename.endsWith('.xlsx') 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      },
    ],
  });
}

/**
 * Envia email simples sem anexo
 */
export async function sendSimpleEmail(
  to: string,
  subject: string,
  message: string
): Promise<SendEmailResult> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ABZ GROUP</h1>
        <p style="color: #9BC2E6; margin: 5px 0 0 0;">Portal Corporativo</p>
      </div>
      
      <div style="padding: 20px;">
        <p style="color: #333; font-size: 14px; line-height: 1.6;">
          ${message.replace(/\n/g, '<br>')}
        </p>
        
        <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <p style="margin: 0; color: #888; font-size: 12px;">
            Este email foi enviado automaticamente pelo Assistente IA do Portal ABZ Group.
          </p>
        </div>
      </div>
      
      <div style="background: #333; padding: 15px; text-align: center;">
        <p style="color: #999; margin: 0; font-size: 11px;">
          © ${new Date().getFullYear()} ABZ Group - Todos os direitos reservados
        </p>
      </div>
    </div>
  `;

  return sendEmailWithNodemailer({
    to,
    subject,
    html: htmlBody,
  });
}