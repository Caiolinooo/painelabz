/**
 * Templates de email personalizáveis
 * Estes templates usam as configurações do arquivo .env para personalização
 */

import { getTranslation } from '@/i18n';
import { getAppBaseUrl } from '@/lib/app-url';

// Obter configurações de personalização do .env
const getEmailConfig = () => {
  // Usar a URL completa do aplicativo para o logo
  const appUrl = getAppBaseUrl();

  // Garantir que a URL do logo seja absoluta e correta
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/images/logo.png`;

  console.log('Logo URL para emails:', logoUrl);

  return {
    companyName: process.env.EMAIL_COMPANY_NAME || 'ABZ Group',
    logoUrl: logoUrl,
    primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0066cc',
    secondaryColor: process.env.EMAIL_SECONDARY_COLOR || '#f5f5f5',
    footerText: process.env.EMAIL_FOOTER_TEXT || 'ABZ Group. Todos os direitos reservados.',
    appUrl: appUrl
  };
};

// Template base para todos os emails
export const baseTemplate = (content: string, locale: string = 'pt-BR') => {
  const config = getEmailConfig();

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.companyName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 200px;
          height: auto;
        }
        .content {
          padding: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #999;
        }
        .button {
          display: inline-block;
          background: ${config.primaryColor};
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
        }
        .highlight {
          background: ${config.secondaryColor};
          padding: 15px;
          border-radius: 5px;
          text-align: center;
          margin: 20px 0;
          font-size: 24px;
          letter-spacing: 5px;
          font-weight: bold;
        }
        h1, h2, h3 {
          color: ${config.primaryColor};
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${config.logoUrl}" alt="${config.companyName}" class="logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${config.footerText}
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template para código de verificação
export const verificationCodeTemplate = (code: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center;">Seu Código de Verificação</h2>
    <div class="highlight">
      ${code}
    </div>
    <p style="text-align: center;">
      Este código expira em <strong>15 minutos</strong>.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Se você não solicitou este código, por favor ignore este email.
    </p>
  `;

  return baseTemplate(content);
};

// Template para aprovação de acesso
export const accessApprovalTemplate = (adminName: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center;">Acesso Aprovado</h2>
    <p>
      Olá,
    </p>
    <p>
      Sua solicitação de acesso ao sistema ${config.companyName} foi <strong>aprovada</strong> por ${adminName}.
    </p>
    <p>
      Você já pode acessar o sistema utilizando seu email.
    </p>
    <div style="text-align: center;">
      <a href="${config.appUrl}/login" class="button">
        Acessar o Sistema
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Se você não solicitou acesso ao sistema, por favor ignore este email.
    </p>
  `;

  return baseTemplate(content);
};

// Template para rejeição de acesso
export const accessRejectionTemplate = (adminName: string, reason?: string) => {
  const config = getEmailConfig();

  const reasonText = reason
    ? `<p><strong>Motivo:</strong> ${reason}</p>`
    : '';

  const content = `
    <h2 style="text-align: center; color: #cc0000;">Solicitação de Acesso Negada</h2>
    <p>
      Olá,
    </p>
    <p>
      Sua solicitação de acesso ao sistema ${config.companyName} foi <strong>negada</strong> por ${adminName}.
    </p>
    ${reasonText}
    <p>
      Se você acredita que isso foi um erro, entre em contato com o administrador do sistema.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Se você não solicitou acesso ao sistema, por favor ignore este email.
    </p>
  `;

  return baseTemplate(content);
};

// Template para código de convite
export const inviteCodeTemplate = (inviteCode: string, expiresAt: Date, maxUses: number) => {
  const config = getEmailConfig();

  const expiryDate = expiresAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const content = `
    <h2 style="text-align: center;">Convite para ${config.companyName}</h2>
    <p>
      Olá,
    </p>
    <p>
      Você foi convidado para acessar o sistema ${config.companyName}.
    </p>
    <p>
      Use o código abaixo para se registrar:
    </p>
    <div class="highlight">
      ${inviteCode}
    </div>
    <p>
      <strong>Informações importantes:</strong>
    </p>
    <ul>
      <li>Este código expira em: <strong>${expiryDate}</strong></li>
      <li>Número máximo de usos: <strong>${maxUses}</strong></li>
    </ul>
    <div style="text-align: center;">
      <a href="${config.appUrl}/login" class="button">
        Acessar o Sistema
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Se você não esperava este convite, por favor ignore este email.
    </p>
  `;

  return baseTemplate(content);
};

// Template para notificação de expiração de senha
export const passwordExpiryTemplate = (daysRemaining: number) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center;">Sua Senha Irá Expirar em Breve</h2>
    <p>
      Olá,
    </p>
    <p>
      Sua senha para o sistema ${config.companyName} irá expirar em <strong>${daysRemaining} dias</strong>.
    </p>
    <p>
      Por favor, acesse o sistema e altere sua senha para evitar problemas de acesso.
    </p>
    <div style="text-align: center;">
      <a href="${config.appUrl}/set-password" class="button">
        Alterar Senha
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// ==============================
// Templates para Avaliações
// ==============================

export const evaluationCreatedTemplate = (
  colaboradorNome: string,
  periodoNome: string,
  dataLimiteAutoavaliacao?: string,
  linkAvaliacao?: string
) => {
  const config = getEmailConfig();

  const prazoTexto = dataLimiteAutoavaliacao
    ? `<p><strong>Prazo para autoavaliação:</strong> ${dataLimiteAutoavaliacao}</p>`
    : '';

  const botaoLink = linkAvaliacao
    ? `<div style="text-align: center; margin-top: 20px;"><a href="${config.appUrl}${linkAvaliacao}" class="button">Iniciar minha avaliação</a></div>`
    : '';

  const content = `
    <h2 style="text-align: center;">Nova Avaliação de Desempenho</h2>
    <p>Olá ${colaboradorNome},</p>
    <p>
      Uma nova avaliação de desempenho foi criada para você
      referente ao período <strong>${periodoNome}</strong>.
    </p>
    ${prazoTexto}
    <p>
      Acesse o painel para responder às perguntas de autoavaliação
      e acompanhar o andamento do processo.
    </p>
    ${botaoLink}
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

export const evaluationCreatedManagerTemplate = (
  gerenteNome: string,
  colaboradorNome: string,
  periodoNome: string,
  linkAvaliacao?: string
) => {
  const config = getEmailConfig();

  const botaoLink = linkAvaliacao
    ? `<div style="text-align: center; margin-top: 20px;"><a href="${config.appUrl}${linkAvaliacao}" class="button">Abrir avaliação do colaborador</a></div>`
    : '';

  const content = `
    <h2 style="text-align: center;">Nova Avaliação para seu liderado</h2>
    <p>Olá ${gerenteNome},</p>
    <p>
      Uma nova avaliação de desempenho para o colaborador
      <strong>${colaboradorNome}</strong> foi criada para o período
      <strong>${periodoNome}</strong>.
    </p>
    <p>
      Quando a autoavaliação for concluída, você poderá registrar sua
      avaliação como gestor através do painel.
    </p>
    ${botaoLink}
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

export const selfEvaluationCompletedTemplate = (
  gerenteNome: string,
  colaboradorNome: string,
  periodoNome: string,
  linkAvaliacao?: string
) => {
  const config = getEmailConfig();

  const botaoLink = linkAvaliacao
    ? `<div style="text-align: center; margin-top: 20px;"><a href="${config.appUrl}${linkAvaliacao}" class="button">Realizar avaliação como gestor</a></div>`
    : '';

  const content = `
    <h2 style="text-align: center;">Autoavaliação concluída</h2>
    <p>Olá ${gerenteNome},</p>
    <p>
      O colaborador <strong>${colaboradorNome}</strong> concluiu a
      autoavaliação referente ao período <strong>${periodoNome}</strong>.
    </p>
    <p>
      Agora você já pode acessar o sistema para registrar sua
      avaliação como gestor.
    </p>
    ${botaoLink}
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

export const evaluationApprovedTemplate = (
  colaboradorNome: string,
  periodoNome: string,
  linkAvaliacao?: string
) => {
  const config = getEmailConfig();

  const botaoLink = linkAvaliacao
    ? `<div style="text-align: center; margin-top: 20px;"><a href="${config.appUrl}${linkAvaliacao}" class="button">Ver detalhes da avaliação</a></div>`
    : '';

  const content = `
    <h2 style="text-align: center;">Sua avaliação foi concluída</h2>
    <p>Olá ${colaboradorNome},</p>
    <p>
      A avaliação de desempenho referente ao período
      <strong>${periodoNome}</strong> foi concluída e aprovada.
    </p>
    <p>
      Você pode acessar o sistema para visualizar o resultado,
      comentários e pontos de desenvolvimento.
    </p>
    ${botaoLink}
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template personalizado
export const newsPostTemplate = (
  author: string,
  postTitle: string,
  excerpt: string,
  postUrl: string,
  options: {
    categoryName?: string;
    featured?: boolean;
    publishedAt?: string;
  } = {}
) => {
  const config = getEmailConfig();
  const badges = [
    options.categoryName ? `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff;color:${config.primaryColor};font-size:12px;font-weight:600;margin-right:8px;">${options.categoryName}</span>` : '',
    options.featured ? '<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;">Destaque</span>' : ''
  ].filter(Boolean).join('');
  const publishedAt = options.publishedAt
    ? new Date(options.publishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '';
  const content = `
    <h2 style="text-align:center;color:${config.primaryColor}">Nova publicação no ${config.companyName}</h2>
    <p style="text-align:center;color:#4b5563;margin-bottom:24px;">Uma nova notícia foi publicada no portal interno e já está disponível para leitura.</p>
    <div style="border:1px solid #e5e7eb;border-radius:14px;padding:24px;background:#ffffff;">
      ${badges ? `<div style="margin-bottom:16px;">${badges}</div>` : ''}
      <h3 style="margin:0 0 12px;color:#111827;font-size:22px;line-height:1.3;">${postTitle}</h3>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">
        Publicado por <strong>${author || 'Alguém'}</strong>${publishedAt ? ` • ${publishedAt}` : ''}
      </p>
      ${excerpt ? `<div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:20px;"><p style="margin:0;color:#374151;line-height:1.6;">${excerpt}</p></div>` : ''}
      <div style="text-align:center;margin:24px 0;">
        <a href="${postUrl}" class="button" style="background:${config.primaryColor};color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Abrir notícia no portal</a>
      </div>
      <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-top:20px;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br />
        <a href="${postUrl}" style="color:${config.primaryColor};word-break:break-all;">${postUrl}</a>
      </p>
    </div>
    <p style="font-size:12px;color:#777;text-align:center;margin-top:24px;">Você está recebendo este email porque optou por notificações de novas publicações.</p>
  `;
  return baseTemplate(content);
};

export const customTemplate = (title: string, message: string, buttonText?: string, buttonUrl?: string) => {
  const config = getEmailConfig();

  const buttonHtml = buttonText && buttonUrl
    ? `
      <div style="text-align: center;">
        <a href="${buttonUrl}" class="button">
          ${buttonText}
        </a>
      </div>
    `
    : '';

  const content = `
    <h2 style="text-align: center;">${title}</h2>
    <div>
      ${message}
    </div>
    ${buttonHtml}
  `;

  return baseTemplate(content);
};

// Template para confirmação de solicitação de reembolso
export const reimbursementConfirmationTemplate = (nome: string, protocolo: string, valor: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center;">Solicitação de Reembolso Recebida</h2>
    <p>
      Olá, <strong>${nome}</strong>!
    </p>
    <p>
      Sua solicitação de reembolso foi recebida com sucesso e está sendo processada.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${valor}</p>
      <p style="margin: 5px 0;"><strong>Data da Solicitação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Pendente</p>
    </div>
    <p>
      Você receberá atualizações sobre o status da sua solicitação por email. Em caso de dúvidas, entre em contato com o departamento financeiro.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template para aprovação de reembolso
export const reimbursementApprovalTemplate = (nome: string, protocolo: string, valor: string, metodoPagamento: string, observacao?: string) => {
  const config = getEmailConfig();

  const observacaoText = observacao
    ? `<p style="margin: 5px 0;"><strong>Observação:</strong> ${observacao}</p>`
    : '';

  const content = `
    <h2 style="text-align: center; color: #28a745;">Reembolso Aprovado</h2>
    <p>
      Olá, <strong>${nome}</strong>!
    </p>
    <p>
      Sua solicitação de reembolso foi <strong>aprovada</strong> e o pagamento será processado em breve.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${valor}</p>
      <p style="margin: 5px 0;"><strong>Método de Pagamento:</strong> ${metodoPagamento}</p>
      <p style="margin: 5px 0;"><strong>Data de Aprovação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      ${observacaoText}
    </div>
    <p>
      O valor será creditado conforme o método de pagamento selecionado. Em caso de dúvidas, entre em contato com o departamento financeiro.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template para rejeição de reembolso
export const reimbursementRejectionTemplate = (nome: string, protocolo: string, motivo: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center; color: #dc3545;">Reembolso Não Aprovado</h2>
    <p>
      Olá, <strong>${nome}</strong>!
    </p>
    <p>
      Infelizmente, sua solicitação de reembolso não foi aprovada.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Data da Decisão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Motivo:</strong> ${motivo}</p>
    </div>
    <p>
      Se você tiver dúvidas sobre esta decisão ou precisar de mais informações, entre em contato com o departamento financeiro.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template: solicitação aguardando aprovação (enviado a Andresa/fiscal)
export const reimbursementApprovalRequestTemplate = (
  solicitanteNome: string,
  protocolo: string,
  valor: string,
  solicitanteEmail: string
) => {
  const config = getEmailConfig();
  const panelUrl = `${config.appUrl}/reembolso?tab=approval`;

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">Nova Solicitação de Reembolso</h2>
    <p>
      Há uma nova solicitação de reembolso <strong>aguardando aprovação</strong>.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${solicitanteNome}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${solicitanteEmail}</p>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${valor}</p>
      <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Pendente de aprovação</p>
    </div>
    <p>
      Os comprovantes e o formulário seguem em anexo. Acesse o painel para aprovar ou rejeitar a solicitação.
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${panelUrl}"
         style="display: inline-block; background: ${config.primaryColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Acessar Painel de Reembolsos
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template: reembolso pago (enviado ao solicitante)
export const reimbursementPaymentTemplate = (
  nome: string,
  protocolo: string,
  valor: string,
  observacao?: string
) => {
  const config = getEmailConfig();
  const observacaoText = observacao
    ? `<p style="margin: 5px 0;"><strong>Observação:</strong> ${observacao}</p>`
    : '';

  const content = `
    <h2 style="text-align: center; color: #28a745;">Reembolso Pago</h2>
    <p>
      Olá, <strong>${nome}</strong>!
    </p>
    <p>
      Temos o prazer de informar que seu reembolso foi <strong style="color: #28a745;">pago</strong> com sucesso.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${valor}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">PAGO</span></p>
      ${observacaoText}
    </div>
    <p>
      O valor foi depositado conforme os dados bancários informados na solicitação.
      Em caso de dúvidas, entre em contato com o departamento financeiro.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template: aprovado, aguardando pagamento (enviado ao fiscal)
export const reimbursementFinancePendingTemplate = (
  solicitanteNome: string,
  protocolo: string,
  valor: string,
  metodoPagamento: string,
  dadosBancarios?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    pixTipo?: string;
    pixChave?: string;
  }
) => {
  const config = getEmailConfig();
  const panelUrl = `${config.appUrl}/reembolso?tab=approval`;
  const dadosPagamento = metodoPagamento === 'PIX'
    ? `<p style="margin: 5px 0;"><strong>Tipo PIX:</strong> ${dadosBancarios?.pixTipo || 'N/A'}</p>
       <p style="margin: 5px 0;"><strong>Chave PIX:</strong> ${dadosBancarios?.pixChave || 'N/A'}</p>`
    : `<p style="margin: 5px 0;"><strong>Banco:</strong> ${dadosBancarios?.banco || 'N/A'}</p>
       <p style="margin: 5px 0;"><strong>Agência:</strong> ${dadosBancarios?.agencia || 'N/A'}</p>
       <p style="margin: 5px 0;"><strong>Conta:</strong> ${dadosBancarios?.conta || 'N/A'}</p>`;

  const content = `
    <h2 style="text-align: center; color: #f59e0b;">Reembolso Aprovado — Aguardando Pagamento</h2>
    <p>
      Um reembolso foi <strong>aprovado</strong> e está aguardando a alteração de status para <strong>pago</strong>.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${protocolo}</p>
      <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${solicitanteNome}</p>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${valor}</p>
      <p style="margin: 5px 0;"><strong>Método:</strong> ${metodoPagamento}</p>
      ${dadosPagamento}
    </div>
    <p>
      Acesse o painel de reembolsos para visualizar os comprovantes e marcar como pago após efetuar o pagamento.
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${panelUrl}"
         style="display: inline-block; background: ${config.primaryColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Acessar Painel de Reembolsos
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template para boas-vindas a novos usuários
export const newUserWelcomeTemplate = (nome: string, loginUrl: string, password?: string) => {
  const config = getEmailConfig();

  // Adicionar informações de senha se fornecida
  const passwordInfo = password
    ? `
    <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #ff6d00;">⚠️ Informações de Acesso</p>
      <p style="margin: 8px 0 0 0;">
        Uma senha temporária foi gerada para você: <strong>${password}</strong>
      </p>
      <p style="margin: 8px 0 0 0;">
        Por favor, altere esta senha no seu primeiro acesso ao sistema.
      </p>
    </div>
    `
    : '';

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">Bem-vindo ao ${config.companyName}!</h2>
    <p>
      Olá, <strong>${nome}</strong>!
    </p>
    <p>
      Sua conta foi criada com sucesso no sistema ${config.companyName}.
    </p>
    ${passwordInfo}
    <p>
      <strong>Importante:</strong> Sua conta está aguardando aprovação do administrador. Você receberá um email quando sua conta for aprovada.
    </p>
    <p>
      Após a aprovação, você poderá acessar o sistema utilizando seu email e senha cadastrados.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
        Verificar Status da Conta
      </a>
    </div>
    <p>
      No portal você terá acesso a diversos recursos e informações importantes da empresa.
    </p>
    <p>
      Se você tiver qualquer dúvida ou precisar de ajuda, entre em contato com o suporte.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template para convite de novos usuários
export const inviteTemplate = (inviteCode: string, registerUrl: string, expiryText: string, maxUses?: number) => {
  const config = getEmailConfig();

  // Modificar a URL para apontar para a página de login
  const loginUrl = `${config.appUrl}/login`;

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">Convite para o ${config.companyName}</h2>
    <p>
      Olá!
    </p>
    <p>
      Você foi convidado para se juntar ao sistema ${config.companyName}.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
      <p style="margin: 5px 0; font-size: 18px;"><strong>Seu código de verificação:</strong></p>
      <p style="margin: 10px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${inviteCode}</p>
      ${maxUses ? `<p style="margin: 5px 0; font-size: 14px;">Este código pode ser usado ${maxUses} ${maxUses === 1 ? 'vez' : 'vezes'}</p>` : ''}
      ${expiryText ? `<p style="margin: 5px 0; font-size: 14px; color: #d32f2f;">${expiryText}</p>` : ''}
    </div>

    <h3 style="color: ${config.primaryColor}; margin-top: 30px;">Como acessar o sistema:</h3>

    <ol style="margin-bottom: 20px; padding-left: 20px;">
      <li style="margin-bottom: 10px;">
        <strong>Acesse a página de login</strong> clicando no botão abaixo
      </li>
      <li style="margin-bottom: 10px;">
        <strong>Insira seu email</strong> (o mesmo que recebeu este convite)
      </li>
      <li style="margin-bottom: 10px;">
        <strong>Quando solicitado, insira o código de verificação</strong> mostrado acima
      </li>
      <li style="margin-bottom: 10px;">
        <strong>Defina uma senha</strong> para seu acesso futuro
      </li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
        Acessar o Sistema
      </a>
    </div>

    <p>
      Se o botão não funcionar, você pode acessar o seguinte link:
      <a href="${loginUrl}">${loginUrl}</a>
    </p>

    <p style="margin-top: 20px; font-weight: bold; color: ${config.primaryColor};">
      Importante: Guarde este código com segurança. Você precisará dele para seu primeiro acesso.
    </p>

    <p>
      Se você não solicitou este convite, por favor ignore este email.
    </p>

    <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #ff6d00;">⚠️ Importante: Verifique sua pasta de spam</p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">
        Nossos emails podem ocasionalmente ser filtrados como spam. Se você não encontrar futuros emails do sistema,
        verifique sua pasta de spam e marque nosso endereço como "não é spam" ou adicione
        <strong>${process.env.EMAIL_USER || 'o remetente deste email'}</strong> à sua lista de contatos.
      </p>
    </div>

    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

// Template para notificação de administrador sobre novo usuário
export const adminNotificationTemplate = (userData: {
  name: string;
  email: string;
  position: string;
  department: string;
  protocol: string;
}) => {
  const config = getEmailConfig();
  const adminUrl = `${config.appUrl}/admin/users`;

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">Novo Cadastro no Portal</h2>
    <p>
      Olá Administrador,
    </p>
    <p>
      Um novo usuário se cadastrou no Portal ${config.companyName} e está aguardando aprovação.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">Detalhes do Usuário:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Nome:</td>
          <td style="padding: 8px 0;">${userData.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Email:</td>
          <td style="padding: 8px 0;">${userData.email || 'Não informado'}</td>
        </tr>

        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Cargo:</td>
          <td style="padding: 8px 0;">${userData.position || 'Não informado'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Departamento:</td>
          <td style="padding: 8px 0;">${userData.department || 'Não informado'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Protocolo:</td>
          <td style="padding: 8px 0;">${userData.protocol}</td>
        </tr>
      </table>
    </div>
    <p>
      Por favor, acesse o painel administrativo para revisar e aprovar este cadastro.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
        Acessar Painel Admin
      </a>
    </div>
    <p>
      Atenciosamente,<br>Sistema Portal ${config.companyName}
    </p>
  `;

  return baseTemplate(content);
};

// Template para notificação de nova Requisição de Compra
export const purchaseOrderCreatedTemplate = (
  userName: string,
  poId: string,
  providerName: string,
  totalValue: string,
  itemsCount: number,
  viewUrl?: string,
  attachmentUrl?: string,
  locale: string = 'pt-BR'
) => {
  const config = getEmailConfig();
  const t = (key: string, params?: any) => getTranslation(locale as any, key, undefined, params);

  const viewButton = viewUrl
    ? `<a href="${viewUrl.startsWith('http') ? viewUrl : config.appUrl + viewUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-right: 10px;">
           ${t('emails.purchaseOrder.viewOrder')}
       </a>`
    : '';
  const attachmentButton = attachmentUrl
    ? `<a href="${attachmentUrl.startsWith('http') ? attachmentUrl : config.appUrl + attachmentUrl}" class="button" style="background: #6c757d; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
           ${t('emails.purchaseOrder.downloadAttachment')}
       </a>`
    : '';

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">${t('emails.purchaseOrder.titleCreated')}</h2>
    <p>
      ${t('emails.common.hello')}, <strong>${userName}</strong>!
    </p>
    <p>
      ${t('emails.purchaseOrder.createdMessage')}
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">${t('emails.purchaseOrder.summary')}:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.poNumber')}:</td>
          <td style="padding: 8px 0;">${poId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.provider')}:</td>
          <td style="padding: 8px 0;">${providerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.totalValue')}:</td>
          <td style="padding: 8px 0;">R$ ${Number(totalValue).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.items')}:</td>
          <td style="padding: 8px 0;">${itemsCount}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        ${viewButton}
        ${attachmentButton}
    </div>
    
    <p>
      ${t('emails.common.footer')}
    </p>
  `;

  return baseTemplate(content, locale);
};

// Template for Status Update (Approved/Rejected)
export const orderStatusUpdateTemplate = (
  userName: string,
  poId: string,
  providerName: string,
  newStatus: 'approved' | 'rejected',
  updatedBy: string,
  note?: string,
  viewUrl?: string,
  locale: string = 'pt-BR'
) => {
  const config = getEmailConfig();
  const t = (key: string, params?: any) => getTranslation(locale as any, key, undefined, params);

  const statusColors = {
    approved: '#28a745', // Green
    rejected: '#dc3545'  // Red
  };

  const statusColor = statusColors[newStatus];

  const noteSection = note
    ? `<div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
         <p style="margin: 0; font-weight: bold;">${t('emails.purchaseOrder.note')}:</p>
         <p style="margin: 5px 0;">${note}</p>
       </div>`
    : '';

  const viewButton = viewUrl
    ? `<div style="text-align: center; margin: 30px 0;">
         <a href="${viewUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
           ${t('emails.purchaseOrder.viewOrder')}
         </a>
       </div>`
    : '';

  const titleKey = newStatus === 'approved' ? 'emails.purchaseOrder.titleApproved' : 'emails.purchaseOrder.titleRejected';
  const messageKey = newStatus === 'approved' ? 'emails.purchaseOrder.approvedMessage' : 'emails.purchaseOrder.rejectedMessage';

  const content = `
    <h2 style="text-align: center; color: ${statusColor};">${t(titleKey)}</h2>
    <p>
      ${t('emails.common.hello')}, <strong>${userName}</strong>!
    </p>
    <p>
      ${t(messageKey, { number: poId, provider: providerName, approver: updatedBy })}
    </p>
    
    ${noteSection}
    
    ${viewButton}
    
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      ${t('emails.purchaseOrder.autoMessage')}
    </p>
  `;

  return baseTemplate(content, locale);
};

// Template for Purchase Request Status Update (Approved/Rejected)
export const requestStatusUpdateTemplate = (
  userName: string,
  requestId: string,
  providerName: string,
  newStatus: 'approved' | 'rejected',
  updatedBy: string,
  note?: string,
  viewUrl?: string,
  locale: string = 'pt-BR'
) => {
  const config = getEmailConfig();
  const statusColors = {
    approved: '#28a745', // Green
    rejected: '#dc3545'  // Red
  };

  const statusColor = statusColors[newStatus];

  const noteSection = note
    ? `<div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
         <p style="margin: 0; font-weight: bold;">Observação:</p>
         <p style="margin: 5px 0;">${note}</p>
       </div>`
    : '';

  const viewButton = viewUrl
    ? `<div style="text-align: center; margin: 30px 0;">
         <a href="${viewUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
           Ver Requisição
         </a>
       </div>`
    : '';

  const statusText = newStatus === 'approved' ? 'Aprovada' : 'Rejeitada';
  const title = `Requisição de Compra ${statusText}`;
  const message = newStatus === 'approved'
    ? `Sua requisição de compra nº ${requestId} para o fornecedor ${providerName} foi aprovada por ${updatedBy}.`
    : `Sua requisição de compra nº ${requestId} para o fornecedor ${providerName} foi rejeitada por ${updatedBy}.`;

  const content = `
    <h2 style="text-align: center; color: ${statusColor};">${title}</h2>
    <p>
      Olá, <strong>${userName}</strong>!
    </p>
    <p>
      ${message}
    </p>
    
    ${noteSection}
    
    ${viewButton}
    
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um e-mail automático enviado pelo sistema ABZ Group.
    </p>
  `;

  return baseTemplate(content, locale);
};

// Template for Approval Request
export const poApprovalRequestTemplate = (
  approverName: string,
  requesterName: string,
  poId: string,
  providerName: string,
  totalValue: string,
  itemsCount: number,
  viewUrl: string,
  attachmentUrl?: string,
  locale: string = 'pt-BR'
) => {
  const config = getEmailConfig();
  const t = (key: string, params?: any) => getTranslation(locale as any, key, undefined, params);

  const attachmentButton = attachmentUrl
    ? `<a href="${attachmentUrl.startsWith('http') ? attachmentUrl : config.appUrl + attachmentUrl}" class="button" style="background: #6c757d; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-left: 10px;">
           ${t('emails.purchaseOrder.downloadAttachment')}
       </a>`
    : '';

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">${t('emails.purchaseOrder.titleApproval')}</h2>
    <p>
      ${t('emails.common.hello')}, <strong>${approverName}</strong>!
    </p>
    <p>
      ${t('emails.purchaseOrder.approvalMessage', { name: requesterName })}
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">${t('emails.purchaseOrder.summary')}:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.poNumber')}:</td>
          <td style="padding: 8px 0;">${poId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.provider')}:</td>
          <td style="padding: 8px 0;">${providerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.totalValue')}:</td>
          <td style="padding: 8px 0;">R$ ${Number(totalValue).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
           <td style="padding: 8px 0; font-weight: bold;">${t('emails.purchaseOrder.items')}:</td>
           <td style="padding: 8px 0;">${itemsCount}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
         <a href="${viewUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
           ${t('emails.purchaseOrder.viewOrder')}
         </a>
         ${attachmentButton}
    </div>
    
    <p>
      ${t('emails.common.footer')}
    </p>
  `;

  return baseTemplate(content, locale);
};

// Template for Fiscal Notification (Approved)
export const poApprovedFiscalTemplate = (
  poId: string,
  requesterName: string,
  providerName: string,
  totalValue: string,
  approverName: string,
  attachmentUrl: string,
  viewUrl: string,
  locale: string = 'pt-BR'
) => {
  const config = getEmailConfig();
  const t = (key: string, params?: any) => getTranslation(locale as any, key, undefined, params);

  const content = `
    <h2 style="text-align: center; color: #28a745;">${t('emails.purchaseOrder.titleApproved')}</h2>
    <p>
      Prezados do Fiscal,
    </p>
    <p>
      A Requisição de Compra <strong>${poId}</strong> foi aprovada e está pronta para faturamento/pagamento.
    </p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">${t('emails.purchaseOrder.summary')}:</h3>
      <p><strong>${t('emails.purchaseOrder.poNumber')}:</strong> ${poId}</p>
      <p><strong>Solicitante:</strong> ${requesterName}</p>
      <p><strong>${t('emails.purchaseOrder.provider')}:</strong> ${providerName}</p>
      <p><strong>${t('emails.purchaseOrder.totalValue')}:</strong> R$ ${Number(totalValue).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2 })}</p>
      <p><strong>Aprovado por:</strong> ${approverName}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
         <a href="${attachmentUrl.startsWith('http') ? attachmentUrl : config.appUrl + attachmentUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
           ${t('emails.purchaseOrder.downloadAttachment')}
         </a>
         <br><br>
         <a href="${viewUrl}" style="color: #666; font-size: 14px;">${t('emails.purchaseOrder.viewOrder')}</a>
    </div>
  `;
  return baseTemplate(content, locale);
};

// Template para envio da OC ao Fornecedor (envio automatico apos aprovacao)
export const purchaseOrderToSupplierTemplate = (
  poNumber: string,
  rqfNumber: string | null,
  requisitanteName: string,
  totalValue: number,
  deliveryDate: string | null,
  paymentTerms: string | null,
  companyName: string = 'ABZ Group'
) => {
  const config = getEmailConfig();
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'A confirmar';

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">Ordem de Compra - ${poNumber}</h2>
    <p>Prezado(a) Fornecedor(a),</p>
    <p>
      Segue em anexo a <strong>Ordem de Compra ${poNumber}</strong>${rqfNumber ? `, referente a Requisicao de Compra <strong>${rqfNumber}</strong>,` : ''} emitida por <strong>${companyName}</strong>.
    </p>
    <p>Por favor, confirme o recebimento respondendo a este e-mail.</p>
    <div style="background: ${config.secondaryColor}; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h3 style="margin-top: 0; color: ${config.primaryColor}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Resumo da OC</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; font-weight: bold; color: #555; width: 40%;">No da OC:</td><td style="padding: 6px 0;"><strong>${poNumber}</strong></td></tr>
        ${rqfNumber ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #555;">No da RQF:</td><td style="padding: 6px 0;">${rqfNumber}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; font-weight: bold; color: #555;">Requisitante:</td><td style="padding: 6px 0;">${requisitanteName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #555;">Valor Total:</td><td style="padding: 6px 0; font-size: 16px; color: ${config.primaryColor};"><strong>${formatCurrency(totalValue)}</strong></td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #555;">Data de Entrega:</td><td style="padding: 6px 0;">${formatDate(deliveryDate)}</td></tr>
        ${paymentTerms ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #555;">Cond. Pagamento:</td><td style="padding: 6px 0;">${paymentTerms}</td></tr>` : ''}
      </table>
    </div>
    <p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #664d03;">
      Este e um documento oficial. O PDF desta Ordem de Compra esta em anexo. Revise as informacoes e confirme o recebimento respondendo este e-mail.
    </p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Em caso de duvidas, entre em contato com o departamento de compras da ${companyName}.
    </p>
  `;

  return baseTemplate(content);
};
// Template para convite de eventos
export const eventInviteTemplate = (title: string, formattedDate: string, location?: string, description?: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">📅 Novo Evento: ${title}</h2>
    <p>Olá!</p>
    <p>Você foi convidado para o seguinte evento:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.primaryColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">${title}</h3>
      
      <p style="margin: 10px 0;">
        <strong style="color: ${config.primaryColor};">📅 Data e Hora:</strong><br>
        ${formattedDate}
      </p>
      
      ${location ? `
      <p style="margin: 10px 0;">
        <strong style="color: ${config.primaryColor};">📍 Local:</strong><br>
        ${location}
      </p>
      ` : ''}
      
      ${description ? `
      <p style="margin: 10px 0;">
        <strong style="color: ${config.primaryColor};">📝 Descrição:</strong><br>
        ${description}
      </p>
      ` : ''}
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      Não esqueça de adicionar este evento ao seu calendário!
    </p>
  `;

  return baseTemplate(content);
};

// Template para notificação de novas notícias
export const newsNotificationTemplate = (title: string, summary: string, newsUrl: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">📰 Nova Notícia Publicada</h2>
    <p>Olá!</p>
    <p>Uma nova notícia importante foi publicada no Portal ABZ:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.primaryColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: ${config.primaryColor};">${title}</h3>
      <p style="color: #666; font-style: italic;">${summary}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${newsUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
        Ler Notícia Completa
      </a>
    </div>
  `;

  return baseTemplate(content);
};

// Template para certificado do Academy
export const academyCertificateTemplate = (userName: string, courseTitle: string, downloadUrl: string) => {
  const config = getEmailConfig();

  const content = `
    <h2 style="text-align: center; color: ${config.primaryColor};">🎓 Parabéns pela Conclusão!</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>É com grande alegria que informamos que você concluiu com sucesso o curso:</p>
    
    <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <h3 style="margin: 0; color: ${config.primaryColor}; font-size: 20px;">${courseTitle}</h3>
    </div>
    
    <p>Seu certificado já está disponível para download. Ele também foi anexado a este e-mail para sua conveniência.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">
        Baixar Certificado (PDF)
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Continue sua jornada de aprendizado no Academy para alcançar novos patamares em sua carreira!
    </p>
  `;

  return baseTemplate(content);
};

// ============================================================
// TEMPLATES DO MÓDULO DE FÉRIAS (padrão ABZ)
// ============================================================
// Estes templates seguem o mesmo padrão visual dos templates de
// reembolso (reimbursementConfirmationTemplate, reimbursementApprovalTemplate,
// reimbursementRejectionTemplate) usando o baseTemplate com logo, header,
// footer e cores padronizadas.
// ============================================================

/**
 * Helper interno para formatar a lista de períodos de férias em HTML.
 */
function formatLeavePeriodsList(periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined, start_date: string, end_date: string): string {
  if (periods && periods.length > 0) {
    const items = periods.map((p) =>
      `<li>De <strong>${p.start_date}</strong> até <strong>${p.end_date}</strong> (${p.duration} dias)</li>`
    ).join('');
    return `<ul style="padding-left: 20px; margin: 10px 0;">${items}</ul>`;
  }
  return `<p style="margin: 5px 0;"><strong>Período:</strong> ${start_date} até ${end_date}</p>`;
}

/**
 * Template: Solicitação de férias recebida (enviado ao colaborador solicitante).
 */
export const leaveRequestCreatedTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  justification?: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center;">Solicitação de Férias Recebida</h2>
    <p>Olá, <strong>${userName}</strong>!</p>
    <p>Sua solicitação de férias foi registrada no sistema com sucesso e está em análise.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Período(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Data da Solicitação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Aguardando aprovação</p>
      ${justification ? `<p style="margin: 5px 0;"><strong>Observações:</strong> ${justification}</p>` : ''}
    </div>
    <p>Sua solicitação será analisada pelos seus gestores. Você será notificado sobre a aprovação ou rejeição.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Nova solicitação de férias registrada (enviado ao RH e à lista
 * adicional de e-mails configurada pelo admin — DP e demais responsáveis).
 */
export const leaveNewRequestNotificationTemplate = (
  userName: string,
  userEmail: string,
  sectorName: string | undefined,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  status: string,
  justification?: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center;">Nova Solicitação de Férias Registrada</h2>
    <p>O(a) colaborador(a) <strong>${userName}</strong> registrou uma nova solicitação de férias no portal.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${userName}</p>
      <p style="margin: 5px 0;"><strong>E-mail:</strong> ${userEmail}</p>
      ${sectorName ? `<p style="margin: 5px 0;"><strong>Setor:</strong> ${sectorName}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Status Atual:</strong> ${status}</p>
      <p style="margin: 5px 0;"><strong>Data da Solicitação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 10px 0 5px 0;"><strong>Período(s) Solicitado(s):</strong></p>
      ${periodsHtml}
      ${justification ? `<p style="margin: 5px 0;"><strong>Observações do Colaborador:</strong> ${justification}</p>` : ''}
    </div>
    <p>Acesse o portal para acompanhar o andamento desta solicitação.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático do Portal ABZ. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Férias aprovadas (enviado ao colaborador solicitante).
 */
export const leaveApprovedTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  options?: { pecuniaryAllowance?: boolean; advance13thSalary?: boolean }
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #28a745;">Férias Aprovadas e Programadas! 🎉</h2>
    <p>Olá, <strong>${userName}</strong>!</p>
    <p>Informamos que sua solicitação de férias foi <strong>aprovada</strong> e está <strong>programada conforme solicitado</strong>.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Período(s) Programado(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Data da Aprovação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      ${options?.pecuniaryAllowance ? `<p style="margin: 5px 0;"><strong>Abono Pecuniário:</strong> Sim (conversão de 10 dias em dinheiro)</p>` : ''}
      ${options?.advance13thSalary ? `<p style="margin: 5px 0;"><strong>1ª parcela do 13º:</strong> Solicitada junto com as férias</p>` : ''}
    </div>
    <p>Aproveite seu descanso! Em caso de dúvidas, entre em contato com o RH.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Férias aprovadas — notificação ao RH/DP (enviado ao RH e à lista
 * adicional de e-mails configurada pelo admin).
 */
export const leaveApprovedNotificationTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  options?: { pecuniaryAllowance?: boolean; advance13thSalary?: boolean }
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #28a745;">Férias Aprovadas: ${userName}</h2>
    <p>A solicitação de férias de <strong>${userName}</strong> foi totalmente aprovada pelos gestores e está programada conforme solicitado.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${userName}</p>
      <p style="margin: 5px 0;"><strong>Período(s) Programado(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Data da Aprovação:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      ${options?.pecuniaryAllowance ? `<p style="margin: 5px 0;"><strong>Abono Pecuniário:</strong> Sim</p>` : ''}
      ${options?.advance13thSalary ? `<p style="margin: 5px 0;"><strong>1ª parcela 13º:</strong> Sim</p>` : ''}
    </div>
    <p>Por favor, providencie os trâmites legais e o registro no sistema de RH dentro do prazo previsto na legislação.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático do Portal ABZ. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Solicitação de férias rejeitada (enviado ao colaborador solicitante).
 */
export const leaveRejectedTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  reason?: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #dc3545;">Solicitação de Férias Rejeitada</h2>
    <p>Olá, <strong>${userName}</strong>!</p>
    <p>Informamos que sua solicitação de férias foi <strong>rejeitada</strong> por um dos seus gestores.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Período(s) Solicitado(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Data da Rejeição:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Motivo da Rejeição:</strong> ${reason || 'Não informado'}</p>
    </div>
    <p>Em caso de dúvidas, converse com seu gestor direto ou com o RH.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Solicitação de férias rejeitada — notificação ao RH/DP.
 */
export const leaveRejectedNotificationTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  reason?: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #dc3545;">Solicitação de Férias Rejeitada: ${userName}</h2>
    <p>A solicitação de férias de <strong>${userName}</strong> foi rejeitada por um dos gestores.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${userName}</p>
      <p style="margin: 5px 0;"><strong>Período(s) Solicitado(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Data da Rejeição:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="margin: 5px 0;"><strong>Motivo:</strong> ${reason || 'Não informado'}</p>
    </div>
    <p>Acesse o portal para consultar os detalhes completos da solicitação.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático do Portal ABZ. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Solicitação avançou para o gerente (enviado ao colaborador).
 */
export const leavePendingManagerTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #17a2b8;">Atualização: Solicitação de Férias</h2>
    <p>Olá, <strong>${userName}</strong>!</p>
    <p>Sua solicitação de férias avançou no fluxo de aprovação. Ela foi aprovada pelo seu líder e agora está pendente de aprovação com o gerente da sua área.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Período(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Status Atual:</strong> Aguardando aprovação do gerente</p>
    </div>
    <p>Você será notificado assim que o gerente tomar uma decisão.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Aprovação pendente do gerente — notificação ao RH/DP.
 */
export const leavePendingManagerNotificationTemplate = (
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);

  const content = `
    <h2 style="text-align: center; color: #17a2b8;">Atualização: Férias de ${userName}</h2>
    <p>A solicitação de férias de <strong>${userName}</strong> foi aprovada pelo líder e agora aguarda aprovação final do gerente.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${userName}</p>
      <p style="margin: 5px 0;"><strong>Período(s):</strong></p>
      ${periodsHtml}
      <p style="margin: 5px 0;"><strong>Status Atual:</strong> Aguardando aprovação do gerente</p>
    </div>
    <p>Acesse o portal para acompanhar o andamento.</p>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático do Portal ABZ. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Template: Aprovação pendente do líder/gerente (enviado ao próximo aprovador).
 */
export const leaveApprovalPendingTemplate = (
  approverName: string,
  userName: string,
  periods: Array<{ start_date: string; end_date: string; duration: number }> | null | undefined,
  startDate: string,
  endDate: string,
  approvalStage: 'leader' | 'manager',
  justification?: string
) => {
  const config = getEmailConfig();
  const periodsHtml = formatLeavePeriodsList(periods, startDate, endDate);
  const stageLabel = approvalStage === 'leader' ? 'Aprovação do Líder' : 'Aprovação Final do Gerente';

  const content = `
    <h2 style="text-align: center;">${stageLabel}: Férias de ${userName}</h2>
    <p>Olá, <strong>${approverName}</strong>!</p>
    <p>O(a) colaborador(a) <strong>${userName}</strong> solicitou férias e aguarda sua aprovação.</p>
    <div style="background: ${config.secondaryColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${userName}</p>
      <p style="margin: 5px 0;"><strong>Etapa de Aprovação:</strong> ${stageLabel}</p>
      <p style="margin: 5px 0;"><strong>Período(s) Solicitado(s):</strong></p>
      ${periodsHtml}
      ${justification ? `<p style="margin: 5px 0;"><strong>Observações do Colaborador:</strong> ${justification}</p>` : ''}
    </div>
    <p>Por favor, acesse o portal para aprovar ou reprovar esta solicitação.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${config.appUrl}/admin/leave-approvals" class="button" style="background: ${config.primaryColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">
        Acessar Aprovações
      </a>
    </div>
    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
      Este é um email automático do Portal ABZ. Por favor, não responda.
    </p>
  `;

  return baseTemplate(content);
};
