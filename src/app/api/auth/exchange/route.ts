import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Substitua pelas variáveis do seu .env
const MS_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || '';
const MS_TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';
const MS_REDIRECT_URI = 'https://portal.groupabz.com/api/auth/exchange';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = request.nextUrl.searchParams.get('state'); // passamos o userId no state

  if (!code && !userId) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  // 1. Recebendo o Callback com o CODE (Usuário logou na Microsoft)
  if (code && userId) {
    try {
      const params = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: MS_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const tokenRes = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const { access_token, refresh_token, expires_in } = tokenData;
      
      // Salvar ou atualizar no banco de dados
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
      
      const { error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .upsert(
          {
            user_id: userId,
            provider: 'microsoft_exchange',
            access_token,
            refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,provider' }
        );

      if (dbError) throw new Error(dbError.message);

      // Redirecionar de volta para o painel de chat com sucesso
      return NextResponse.redirect(new URL('/painel?exchange=success', request.url));
    } catch (err) {
      console.error('[Exchange Auth Error]', err);
      return NextResponse.redirect(new URL('/painel?exchange=error', request.url));
    }
  }

  return NextResponse.json({ error: 'Fluxo inválido' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  // Gerar a URL de autenticação
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const scopes = ['offline_access', 'Mail.Read', 'User.Read'];

    const authUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?` +
      `client_id=${MS_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&state=${userId}`;

    return NextResponse.json({ url: authUrl });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
