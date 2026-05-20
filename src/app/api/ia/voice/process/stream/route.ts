import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chatCompletionStream, buildChatMessages, buildUserContext, buildSystemPrompt, getSessionHistory } from '@/lib/ia';
import type { LLMMessage } from '@/types/ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

/**
 * POST /api/ia/voice/process/stream
 * Gateway de IA streaming para o agente de voz.
 * Retorna chunks de texto via SSE para TTS incremental.
 *
 * Português:
 *   Envia resposta da IA em chunks progressivos para streaming TTS.
 *   O agente recebe cada chunk e envia ao TTS imediatamente.
 *
 * English:
 *   Streams AI response as text chunks via SSE for incremental TTS.
 *   The agent receives each chunk and sends it to TTS immediately.
 *   Reduces perceived latency from ~5s to ~1s (first word in <1s).
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

    // 2. Session management
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

    // 6. Gerar stream de resposta (MESMO ENGINE do chat de texto)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await chatCompletionStream(messages, {}, { role: userRole, userId })
            .then(async (readableStream) => {
              const reader = readableStream.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let fullContent = '';
              let accumulatedMetadata: any = {};

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  try {
                    const parsed = JSON.parse(line.slice(6));

                    // Status events (tool execution)
                    if (parsed.status) {
                      controller.enqueue(encoder.encode(`data: ${***REMOVED*** status: parsed.status })}\n\n`));
                    }

                    // Content chunks — enviar diretamente ao agente
                    if (parsed.content) {
                      fullContent += parsed.content;
                      controller.enqueue(encoder.encode(`data: ${***REMOVED*** content: parsed.content })}\n\n`));
                    }

                    // Metadata events
                    if (parsed.metadata) {
                      accumulatedMetadata = { ...accumulatedMetadata, ...parsed.metadata };
                      controller.enqueue(encoder.encode(`data: ${***REMOVED*** metadata: parsed.metadata })}\n\n`));
                    }
                  } catch { /* skip malformed */ }
                }
              }

              // Final event — salvar resposta
              controller.enqueue(encoder.encode(`data: ${***REMOVED*** 
                done: true, 
                fullContent,
                metadata: Object.keys(accumulatedMetadata).length > 0 ? accumulatedMetadata : undefined,
                session_id: sessionId 
              })}\n\n`));

              // Salvar no banco (mesmo do chat de texto)
              if (fullContent) {
                await supabaseAdmin.from('ia_chat_messages').insert({
                  session_id: sessionId,
                  role: 'assistant',
                  content: fullContent,
                  metadata: { ...accumulatedMetadata, source: 'voice', streamed: true },
                });
              }

              controller.close();
            });
        } catch (err: any) {
          console.error('[Voice Stream] Erro na stream:', err);
          controller.enqueue(encoder.encode(`data: ${***REMOVED*** 
            error: err.message || 'Erro durante streaming',
            session_id: sessionId 
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': sessionId,
      },
    });

  } catch (err: any) {
    console.error('[Voice Stream Gateway] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no gateway de voz streaming' },
      { status: 500 }
    );
  }
}
