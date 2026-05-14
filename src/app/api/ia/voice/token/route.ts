import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;

    // 2. Buscar dados complementares do usuário para personalizar
    const { data: profile } = await supabaseAdmin
      .from('users_unified')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'Usuário';

    // 3. Verificar variáveis de ambiente do LiveKit
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.error('[LiveKit API] LIVEKIT_API_KEY ou LIVEKIT_API_SECRET não configurado.');
      return NextResponse.json({ error: 'Configuração do servidor de voz ausente.' }, { status: 500 });
    }

    // 4. Criar identificador de Sala único por usuário para conversa privada
    const roomName = `abz_voice_${userId.slice(0, 8)}`;

    // 5. Criar Token de Acesso LiveKit
    // Identidade do participante é seu ID ou nome para rastreamento no agente
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `user_${userId.slice(0, 8)}_${Math.random().toString(36).substring(2, 7)}`,
      name: userName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,      // Permitir enviar áudio (microfone)
      canSubscribe: true,    // Permitir ouvir áudio (agente)
      canPublishData: true,  // Permitir mensagens de dados caso necessário
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      roomName,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });

  } catch (error: any) {
    console.error('[LiveKit Token Error]', error);
    return NextResponse.json({ error: 'Falha ao gerar token de acesso em tempo real.' }, { status: 500 });
  }
}
