import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chatCompletion, buildChatMessages, buildUserContext, buildSystemPrompt, getSessionHistory } from '@/lib/ia';
import type { IAUserContext, LLMMessage } from '@/types/ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para ferramentas complexas

/**
 * POST /api/ia/voice/process
 * Gateway de IA para o agente de voz.
 * Reutiliza EXATAMENTE o mesmo motor do chat de texto:
 * - buildUserContext() → dados do perfil, avaliações, férias, reembolsos
 * - buildSystemPrompt() → prompt completo com ferramentas e instruções
 * - chatCompletion() → LLM com tools automáticas
 *
 * Português:
 *   Recebe texto do usuário e retorna resposta da IA.
 *
 * English:
 *   Receives user text and returns AI response using the same engine as text chat.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const body = await request.json();
    const { text, session_id: incomingSessionId } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    // 2. Session management (mesmo padrão do chat de texto)
    let sessionId = incomingSessionId;
    if (!sessionId) {
      const title = text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');
      const { data: newSession } = await supabaseAdmin
        .from('ia_chat_sessions')
        .insert({
          user_id: userId,
          session_title: `Voz: ${title}`,
        })
        .select()
        .single();

      if (!newSession) {
        return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 });
      }
      sessionId = newSession.id;
    } else {
      // Verificar que a sessão pertence ao usuário
      const { data: session } = await supabaseAdmin
        .from('ia_chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      if (!session) {
        return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
      }
    }

    // 3. Salvar mensagem do usuário
    await supabaseAdmin
      .from('ia_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: text.trim(),
      });

    // 4. Construir contexto completo do usuário (MESMO DO CHAT DE TEXTO)
    const userContext = await buildUserContext(userId);
    if (!userContext) {
      return NextResponse.json({ error: 'Perfil do usuário não encontrado' }, { status: 404 });
    }

    const sessionHistory = await getSessionHistory(sessionId);
    const systemPrompt = buildSystemPrompt(userContext);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...sessionHistory,
      { role: 'user', content: text.trim() },
    ];

    // 5. Buscar role do usuário para tools
    const { data: profile } = await supabaseAdmin
      .from('users_unified')
      .select('role')
      .eq('id', userId)
      .single();
    const userRole = profile?.role || 'USER';

    // 6. Chamar LLM com o mesmo motor do chat de texto
    const startTime = Date.now();
    const llmResponse = await chatCompletion(messages, {}, { role: userRole, userId });
    const responseTime = Date.now() - startTime;

    const assistantContent = llmResponse.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
    const metadata = llmResponse.choices?.[0]?.message?.metadata || {};

    // 7. Salvar resposta no banco
    await supabaseAdmin.from('ia_chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      tokens_used: llmResponse.usage?.total_tokens || null,
      response_time_ms: responseTime,
      metadata: {
        ...metadata,
        source: 'voice',
        model: llmResponse.model,
        finish_reason: llmResponse.choices?.[0]?.finish_reason,
      },
    });

    return NextResponse.json({
      response: assistantContent,
      session_id: sessionId,
      metadata,
      response_time_ms: responseTime,
    });

  } catch (err: any) {
    console.error('[Voice Gateway] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no gateway de voz' },
      { status: 500 }
    );
  }
}
