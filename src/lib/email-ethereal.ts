/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 * 
 * Configuração para Ethereal (apenas para testes)
 */

import nodemailer from 'nodemailer';

// Configuração do Ethereal para testes
const etherealConfig = {
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // geralmente false para Ethereal
  auth: {
    user: process.env.EMAIL_USER || 'cclgvysovuk5lam5@ethereal.email', // Use as credenciais geradas pelo script test-ethereal.js
    pass: process.env.EMAIL_PASSWORD || 'psqfF8pvHZuAGeFs1T'
  }
};

/**
 * Inicializa o transporte de e-mail com Ethereal
 * @returns Transporter configurado
 */
export async function createTransport() {
  try {
    console.log('Inicializando transporte de email com Ethereal (apenas para testes)');
    console.log('Ambiente:', process.env.NODE_ENV || 'development');

    // Verificar se temos credenciais configuradas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Credenciais do Ethereal não encontradas no .env, criando uma nova conta de teste...');
      const testAccount = await nodemailer.createTestAccount();
      
      console.log('Nova conta Ethereal criada:', {
        user: testAccount.user,
        pass: testAccount.pass
      });
      
      // Criar transporter com a nova conta
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      // Verificar conexão
      await transporter.verify();
      console.log('Conexão com Ethereal verificada com sucesso');
      
      return transporter;
    }

    // Criar transporter com configuração do Ethereal
    const transporter = nodemailer.createTransport(etherealConfig);

    // Verificar conexão
    console.log('Verificando conexão com o servidor SMTP do Ethereal...');
    await transporter.verify();
    console.log('Conexão com o servidor SMTP do Ethereal verificada com sucesso');

    return transporter;
  } catch (error) {
    console.error('Erro ao inicializar transporte de email com Ethereal:', error);

    // Tentar criar uma nova conta de teste Ethereal
    try {
      console.log('Tentando criar nova conta de teste Ethereal...');
      const testAccount = await nodemailer.createTestAccount();

      const etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('Nova conta de teste Ethereal criada:', {
        user: testAccount.user,
        pass: testAccount.pass
      });

      // Verificar conexão
      await etherealTransporter.verify();
      console.log('Conexão com Ethereal verificada com sucesso');

      return etherealTransporter;
    } catch (fallbackError) {
      console.error('Erro ao criar conta de teste Ethereal:', fallbackError);
      throw new Error('Não foi possível inicializar nenhum transporte de email');
    }
  }
}

/**
 * Envia um e-mail usando Ethereal
 * @param to Destinatário(s)
 * @param subject Assunto
 * @param text Conteúdo em texto
 * @param html Conteúdo em HTML
 * @param options Opções adicionais
 * @returns Resultado do envio
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  text: string,
  html: string,
  options?: {
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
      filename: string;
      content?: any;
      path?: string;
      contentType?: string;
    }>;
  }
) {
  try {
    // Criar transporte
    const transport = await createTransport();

    // Preparar opções do e-mail
    const mailOptions = {
      from: options?.from || process.env.EMAIL_FROM || '"ABZ Group" <no-reply@abzgroup.com.br>',
      to,
      cc: options?.cc,
      bcc: options?.bcc,
      subject,
      text,
      html,
      attachments: options?.attachments
    };

    console.log('Enviando e-mail para:', Array.isArray(to) ? to.join(', ') : to);

    // Enviar e-mail
    const info = await transport.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso. ID:', info.messageId);

    // Obter URL de preview (disponível apenas com Ethereal)
    let previewUrl;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de preview:', previewUrl);
      }
    } catch (previewError) {
      console.error('Erro ao obter URL de preview:', previewError);
    }

    return {
      success: true,
      message: 'Email enviado com sucesso',
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return {
      success: false,
      message: `Erro ao enviar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um e-mail com código de verificação
 * @param email E-mail do destinatário
 * @param code Código de verificação
 * @returns Resultado do envio
 */
export async function sendVerificationEmail(email: string, code: string) {
  // Texto simples para clientes que não suportam HTML
  const text = `
Código de Verificação ABZ Group

Seu código de verificação é: ${code}

Este código expira em 10 minutos.

Se você não solicitou este código, por favor ignore este email.

--
ABZ Group
https://abzgroup.com.br
${new Date().getFullYear()} © Todos os direitos reservados.
  `.trim();

  // Versão HTML do email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .container { padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 150px; height: auto; }
    .code { background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/LC1_Azul.png" alt="ABZ Group Logo" class="logo">
      <h2>Código de Verificação</h2>
    </div>
    
    <p>Olá,</p>
    
    <p>Recebemos uma solicitação para verificar seu endereço de e-mail. Use o código abaixo para confirmar:</p>
    
    <div class="code">${code}</div>
    
    <p>Este código expira em <strong>10 minutos</strong>.</p>
    
    <p>Se você não solicitou este código, por favor ignore este email.</p>
    
    <div class="footer">
      <p>ABZ Group</p>
      <p><a href="https://abzgroup.com.br">https://abzgroup.com.br</a></p>
      <p>${new Date().getFullYear()} &copy; Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    return await sendEmail(email, 'Código de Verificação - ABZ Group', text, html);
  } catch (error) {
    console.error('Erro ao enviar e-mail de verificação:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Testa a conexão com o servidor SMTP
 * @returns Resultado do teste
 */
export async function testConnection() {
  try {
    const transport = await createTransport();
    await transport.verify();

    return {
      success: true,
      message: 'Conexão com o servidor SMTP do Ethereal verificada com sucesso'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
