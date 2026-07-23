import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import {
  clearResolvedEmailAuthCache,
  EmailProvider,
  EmailTransport,
  getEmailSettingsPublic,
} from '@/lib/email-env';
import { clearCredentialCache, setCredential } from '@/lib/secure-credentials';
import { resetEmailTransport, testEmailConnection, sendEmail } from '@/lib/email-exchange';
import { isMicrosoftGraphMailConfigured } from '@/lib/email-graph';

export const dynamic = 'force-dynamic';

type AuthPayload = NonNullable<ReturnType<typeof verifyToken>>;

function getAdminPayload(request: Request): AuthPayload | null {
  const authHeader = request.headers.get('authorization') || undefined;
  const token = extractTokenFromHeader(authHeader);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;
  return payload;
}

function isValidEmail(email: string): boolean {
  return !!email && email.includes('@') && email.length >= 5;
}

function parseProvider(raw: unknown): EmailProvider | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  switch (value) {
    case 'exchange':
    case 'office365':
    case 'o365':
      return 'exchange';
    case 'gmail':
      return 'gmail';
    case 'sendgrid':
      return 'sendgrid';
    default:
      return null;
  }
}

function parseTransport(raw: unknown): EmailTransport | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  switch (value) {
    case 'smtp':
    case 'graph':
    case 'auto':
      return value;
    default:
      return null;
  }
}

const SECRET_DESCRIPTIONS: Record<string, string> = {
  EMAIL_USER: 'Conta SMTP / caixa Graph (usuário/e-mail de envio)',
  EMAIL_PASSWORD: 'Senha / app password SMTP (criptografada; opcional se Graph)',
  EMAIL_HOST: 'Host SMTP',
  EMAIL_PORT: 'Porta SMTP',
  EMAIL_SECURE: 'SMTP secure (true/false)',
  EMAIL_FROM: 'Endereço From exibido nos e-mails',
  EMAIL_REPLY_TO: 'Reply-To padrão',
  EMAIL_PROVIDER: 'Provedor: exchange | gmail | sendgrid',
  EMAIL_TRANSPORT: 'Transporte: smtp | graph | auto',
};

/**
 * GET /api/admin/email-settings
 * Retorna configuração mascarada (sem senha).
 */
export async function GET(request: Request) {
  if (!getAdminPayload(request)) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  try {
    const settings = await getEmailSettingsPublic();
    return NextResponse.json({
      ...settings,
      passwordMasked: settings.passwordSet ? '••••••••' : '',
      graphConfigured: isMicrosoftGraphMailConfigured(),
    });
  } catch (error) {
    console.error('GET /api/admin/email-settings:', error);
    return NextResponse.json({ error: 'Falha ao carregar configurações de e-mail' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/email-settings
 * Atualiza credenciais em app_secrets (DB). Senha opcional: omitir/vazio mantém a atual.
 */
export async function PUT(request: Request) {
  if (!getAdminPayload(request)) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const user = typeof body.user === 'string' ? body.user.trim() : undefined;
    const password = typeof body.password === 'string' ? body.password : undefined;
    const host = typeof body.host === 'string' ? body.host.trim() : undefined;
    const from = typeof body.from === 'string' ? body.from.trim() : undefined;
    const replyTo = typeof body.replyTo === 'string' ? body.replyTo.trim() : undefined;
    const provider = body.provider !== undefined ? parseProvider(body.provider) : undefined;
    const transport = body.transport !== undefined ? parseTransport(body.transport) : undefined;

    if (user !== undefined && user !== '' && !isValidEmail(user)) {
      return NextResponse.json({ error: 'E-mail/usuário SMTP inválido' }, { status: 400 });
    }
    if (from !== undefined && from !== '' && !from.includes('@')) {
      return NextResponse.json({ error: 'EMAIL_FROM inválido' }, { status: 400 });
    }
    if (replyTo !== undefined && replyTo !== '' && !isValidEmail(replyTo)) {
      return NextResponse.json({ error: 'Reply-To inválido' }, { status: 400 });
    }
    if (body.provider !== undefined && provider === null) {
      return NextResponse.json(
        { error: 'provider deve ser exchange, gmail ou sendgrid' },
        { status: 400 }
      );
    }
    if (body.transport !== undefined && transport === null) {
      return NextResponse.json(
        { error: 'transport deve ser smtp, graph ou auto' },
        { status: 400 }
      );
    }
    if ((transport === 'graph' || transport === 'auto') && !isMicrosoftGraphMailConfigured()) {
      // auto still allowed (falls back to smtp); graph alone requires env
      if (transport === 'graph') {
        return NextResponse.json(
          {
            error:
              'Microsoft Graph não configurado. Defina MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET e MS_GRAPH_TENANT_ID (GUID do tenant, não "common") no ambiente.',
          },
          { status: 400 }
        );
      }
    }

    let port: string | undefined;
    if (body.port !== undefined && body.port !== null && body.port !== '') {
      const parsed = Number(body.port);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
        return NextResponse.json({ error: 'Porta SMTP inválida' }, { status: 400 });
      }
      port = String(Math.round(parsed));
    }

    let secure: string | undefined;
    if (body.secure !== undefined) {
      secure = body.secure === true || body.secure === 'true' ? 'true' : 'false';
    }

    const writes: Array<Promise<void>> = [];

    if (user !== undefined) {
      writes.push(setCredential('EMAIL_USER', user, SECRET_DESCRIPTIONS.EMAIL_USER));
    }
    if (password !== undefined && password.trim() !== '') {
      writes.push(
        setCredential('EMAIL_PASSWORD', password, SECRET_DESCRIPTIONS.EMAIL_PASSWORD, {
          encrypt: true,
        })
      );
    }
    if (host !== undefined) {
      writes.push(setCredential('EMAIL_HOST', host, SECRET_DESCRIPTIONS.EMAIL_HOST));
    }
    if (port !== undefined) {
      writes.push(setCredential('EMAIL_PORT', port, SECRET_DESCRIPTIONS.EMAIL_PORT));
    }
    if (secure !== undefined) {
      writes.push(setCredential('EMAIL_SECURE', secure, SECRET_DESCRIPTIONS.EMAIL_SECURE));
    }
    if (from !== undefined) {
      writes.push(setCredential('EMAIL_FROM', from, SECRET_DESCRIPTIONS.EMAIL_FROM));
    }
    if (replyTo !== undefined) {
      writes.push(setCredential('EMAIL_REPLY_TO', replyTo, SECRET_DESCRIPTIONS.EMAIL_REPLY_TO));
    }
    if (provider !== undefined && provider !== null) {
      writes.push(setCredential('EMAIL_PROVIDER', provider, SECRET_DESCRIPTIONS.EMAIL_PROVIDER));
    }
    if (transport !== undefined && transport !== null) {
      writes.push(setCredential('EMAIL_TRANSPORT', transport, SECRET_DESCRIPTIONS.EMAIL_TRANSPORT));
    }

    if (writes.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    await Promise.all(writes);

    clearCredentialCache();
    clearResolvedEmailAuthCache();
    resetEmailTransport();

    const settings = await getEmailSettingsPublic();
    return NextResponse.json({
      success: true,
      message: 'Credenciais de e-mail salvas em app_secrets',
      ...settings,
      passwordMasked: settings.passwordSet ? '••••••••' : '',
    });
  } catch (error) {
    console.error('PUT /api/admin/email-settings:', error);
    return NextResponse.json(
      {
        error: 'Falha ao salvar credenciais de e-mail',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-settings
 * { action: 'test', to?: string } — testa SMTP e opcionalmente envia e-mail de teste.
 */
export async function POST(request: Request) {
  if (!getAdminPayload(request)) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'test';

    if (action !== 'test') {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    // Garantir transporte fresco
    resetEmailTransport();
    clearResolvedEmailAuthCache();

    const connection = await testEmailConnection();
    if (!connection.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha na conexão SMTP',
          details: connection.message,
          config: connection.config,
        },
        { status: 500 }
      );
    }

    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (to) {
      if (!isValidEmail(to)) {
        return NextResponse.json({ error: 'E-mail de destino inválido' }, { status: 400 });
      }
      const result = await sendEmail(
        to,
        'Teste de e-mail — Painel ABZ',
        'Este é um e-mail de teste das credenciais SMTP configuradas no admin.',
        `<p>Este é um e-mail de teste das credenciais SMTP configuradas no admin.</p>
         <p>Enviado em ${new Date().toLocaleString('pt-BR')}</p>`
      );
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? 'Conexão OK e e-mail de teste enviado'
          : 'Conexão OK, mas falha ao enviar e-mail de teste',
        details: result.message,
        config: connection.config,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão SMTP verificada com sucesso',
      config: connection.config,
    });
  } catch (error) {
    console.error('POST /api/admin/email-settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Falha no teste de e-mail',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
