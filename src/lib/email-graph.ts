/**
 * Envio de e-mail via Microsoft Graph (app-only).
 * Preferível ao SMTP quando o tenant bloqueia Basic Auth / SMTP AUTH (erro 535).
 * Requer: MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID
 * e permissão de aplicativo Mail.Send (com consentimento admin).
 */

type GraphAttachment = {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function graphEnv() {
  const clientId = process.env.MS_GRAPH_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET?.trim() || '';
  const tenantId = process.env.MS_GRAPH_TENANT_ID?.trim() || '';
  return { clientId, clientSecret, tenantId };
}

export function isMicrosoftGraphMailConfigured(): boolean {
  const { clientId, clientSecret, tenantId } = graphEnv();
  return Boolean(clientId && clientSecret && tenantId && tenantId !== 'common');
}

async function getAppAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret, tenantId } = graphEnv();
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'Microsoft Graph não configurado. Defina MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET e MS_GRAPH_TENANT_ID.'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Falha ao obter token Graph: ${data.error_description || data.error || response.statusText}`
    );
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
  };

  return tokenCache.accessToken;
}

async function graphCall(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; text: string; json?: unknown }> {
  const token = await getAppAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }

  return { ok: response.ok, status: response.status, text, json };
}

function normalizeRecipients(input?: string | string[]): Array<{ emailAddress: { address: string } }> {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];
  return list
    .flatMap((item) => item.split(/[,;]/).map((s) => s.trim()))
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

function toBase64(content: Buffer | string): string {
  if (Buffer.isBuffer(content)) return content.toString('base64');
  return Buffer.from(content).toString('base64');
}

async function buildGraphAttachments(
  attachments?: GraphAttachment[]
): Promise<
  Array<{
    '@odata.type': string;
    name: string;
    contentType: string;
    contentBytes: string;
  }>
> {
  if (!attachments?.length) return [];

  const out: Array<{
    '@odata.type': string;
    name: string;
    contentType: string;
    contentBytes: string;
  }> = [];

  for (const att of attachments) {
    let bytes: Buffer | null = null;
    if (att.content !== undefined) {
      bytes = Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content);
    } else if (att.path) {
      const fs = await import('fs/promises');
      bytes = await fs.readFile(att.path);
    }
    if (!bytes) continue;
    out.push({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.filename,
      contentType: att.contentType || 'application/octet-stream',
      contentBytes: toBase64(bytes),
    });
  }

  return out;
}

export async function testGraphMailConnection(mailboxUser: string): Promise<{
  success: boolean;
  message: string;
  config?: { transport: 'graph'; user: string; tenantId: string };
}> {
  try {
    if (!isMicrosoftGraphMailConfigured()) {
      return {
        success: false,
        message:
          'Graph não configurado no ambiente (MS_GRAPH_CLIENT_ID / SECRET / TENANT_ID).',
      };
    }
    if (!mailboxUser?.includes('@')) {
      return {
        success: false,
        message: 'EMAIL_USER (caixa remetente) é obrigatório para Graph.',
      };
    }

    await getAppAccessToken();
    const probe = await graphCall(
      `/users/${encodeURIComponent(mailboxUser)}?$select=id,mail,userPrincipalName`,
      'GET'
    );

    if (!probe.ok) {
      return {
        success: false,
        message: `Token OK, mas sem acesso à caixa ${mailboxUser} (${probe.status}): ${probe.text}`,
      };
    }

    const { tenantId } = graphEnv();
    return {
      success: true,
      message:
        'Microsoft Graph autenticado. Envio usará /users/{mailbox}/sendMail (Mail.Send).',
      config: { transport: 'graph', user: mailboxUser, tenantId },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendEmailViaGraph(options: {
  fromUser: string;
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: GraphAttachment[];
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  try {
    if (!isMicrosoftGraphMailConfigured()) {
      throw new Error('Microsoft Graph não configurado no ambiente');
    }

    const toRecipients = normalizeRecipients(options.to);
    if (toRecipients.length === 0) {
      throw new Error('Destinatário obrigatório');
    }

    const graphAttachments = await buildGraphAttachments(options.attachments);
    const message: Record<string, unknown> = {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.html || options.text || '',
      },
      toRecipients,
      ccRecipients: normalizeRecipients(options.cc),
      bccRecipients: normalizeRecipients(options.bcc),
    };

    if (options.replyTo) {
      message.replyTo = [{ emailAddress: { address: options.replyTo } }];
    }
    if (graphAttachments.length > 0) {
      message.attachments = graphAttachments;
    }

    const result = await graphCall(
      `/users/${encodeURIComponent(options.fromUser)}/sendMail`,
      'POST',
      { message, saveToSentItems: true }
    );

    if (!result.ok && result.status !== 202) {
      throw new Error(`Graph sendMail (${result.status}): ${result.text}`);
    }

    return {
      success: true,
      message: 'Email enviado via Microsoft Graph',
      messageId: `graph-${Date.now()}`,
    };
  } catch (error) {
    console.error('[email-graph] Falha no envio:', error);
    return {
      success: false,
      message: `Erro Graph: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
