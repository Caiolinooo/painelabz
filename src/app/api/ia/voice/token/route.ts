import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { AccessToken, AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';

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
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit API] Variáveis LIVEKIT não configuradas.');
      return NextResponse.json({ error: 'Configuração do servidor de voz ausente.' }, { status: 500 });
    }

    // 4. Criar identificador de Sala único por usuário para conversa privada
    const roomName = `abz_voice_${userId.slice(0, 8)}`;

    // 5. Criar Token de Acesso LiveKit
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `user_${userId.slice(0, 8)}_${Math.random().toString(36).substring(2, 7)}`,
      name: userName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    // 6. Garantir que a sala existe e despachar o agente explicitamente
    //    Sem isso, o LiveKit Cloud não sabe que deve enviar o agente para a sala
    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    
    try {
      // Cria a sala se não existir (idempotente)
      const roomSvc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      await roomSvc.createRoom({ name: roomName, emptyTimeout: 300 });

      // Despacha o agente para a sala
      const dispatch = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      await dispatch.createDispatch(roomName, '');
      console.log(`[LiveKit] Agente despachado para sala: ${roomName}`);
    } catch (dispatchErr: any) {
      // Se falhar o dispatch (ex: agente offline), ainda retorna o token
      // O frontend vai mostrar "Aguardando o Agente de IA conectar..."
      console.warn(`[LiveKit] Falha ao despachar agente: ${dispatchErr.message}`);
    }

    return NextResponse.json({
      token,
      roomName,
      serverUrl: livekitUrl,
    });

  } catch (error: any) {
    console.error('[LiveKit Token Error]', error);
    return NextResponse.json({ error: 'Falha ao gerar token de acesso em tempo real.' }, { status: 500 });
  }
}

