/**
 * API: /api/ia/chat
 * POST — Enviar mensagem e receber resposta da IA
 * Suporta streaming (SSE) e modo síncrono
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chatCompletion, chatCompletionStream } from '@/lib/ia/client';
import { buildChatMessages } from '@/lib/ia/context-builder';
import type { IAChatMessage } from '@/types/ia';

export async function POST(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const body = await request.json();

    const { session_id, message } = body;
    const useStream = body.stream !== false; // default true

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // Se não tem session_id, criar uma nova sessão
    let sessionId = session_id;
    if (!sessionId) {
      const title = message.trim().slice(0, 50) + (message.length > 50 ? '...' : '');
      const { data: newSession, error } = await supabaseAdmin
        .from('ia_chat_sessions')
        .insert({
          user_id: userId,
          session_title: title,
        })
        .select()
        .single();

      if (error || !newSession) {
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

    // Salvar mensagem do usuário
    await supabaseAdmin
      .from('ia_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message.trim(),
      });

    // Montar mensagens para o LLM
    const llmMessages = await buildChatMessages(userId, sessionId, message.trim());

    // =====================================================
    // Streaming mode
    // =====================================================
    if (useStream) {
      try {
        const stream = await chatCompletionStream(llmMessages);
        const startTime = Date.now();

        // Criar TransformStream para capturar conteúdo completo e salvar ao final
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = stream.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
          let fullContent = '';
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              await writer.write(value);

              // Extrair conteúdo das linhas SSE
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.content) fullContent += parsed.content;
                  if (parsed.done && parsed.fullContent) fullContent = parsed.fullContent;
                } catch { /* ignorar */ }
              }
            }
          } catch (err) {
            console.error('[IA Chat Stream] Erro no stream:', err);
          } finally {
            // Salvar resposta completa no banco
            if (fullContent) {
              const responseTime = Date.now() - startTime;
              await supabaseAdmin
                .from('ia_chat_messages')
                .insert({
                  session_id: sessionId,
                  role: 'assistant',
                  content: fullContent,
                  response_time_ms: responseTime,
                  metadata: { streamed: true },
                });
            }

            // Enviar metadata da sessão como último evento
            const { data: updatedSession } = await supabaseAdmin
              .from('ia_chat_sessions')
              .select('*')
              .eq('id', sessionId)
              .single();

            const metaEvent = `data: ${JSON.stringify({ 
              meta: true, 
              session: updatedSession,
              session_id: sessionId 
            })}\n\n`;
            await writer.write(encoder.encode(metaEvent));
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Session-Id': sessionId,
          },
        });
      } catch (streamError) {
        console.error('[IA Chat Stream] Fallback para modo sync:', streamError);
        // Fallback para modo não-streaming
      }
    }

    // =====================================================
    // Sync mode (fallback ou explícito)
    // =====================================================
    const startTime = Date.now();
    const llmResponse = await chatCompletion(llmMessages);
    const responseTime = Date.now() - startTime;

    const assistantContent = llmResponse.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

    // Salvar resposta do assistente
    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from('ia_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantContent,
        tokens_used: llmResponse.usage?.total_tokens || null,
        response_time_ms: responseTime,
        metadata: {
          model: llmResponse.model,
          finish_reason: llmResponse.choices?.[0]?.finish_reason,
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('[IA Chat] Erro ao salvar resposta:', saveError);
    }

    // Buscar sessão atualizada
    const { data: updatedSession } = await supabaseAdmin
      .from('ia_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return NextResponse.json({
      message: savedMessage || { content: assistantContent, role: 'assistant' },
      session: updatedSession,
      session_id: sessionId,
    });
  } catch (err) {
    console.error('[API IA Chat POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * GET — Buscar mensagens de uma sessão
 */
export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id é obrigatório' }, { status: 400 });
    }

    // Verificar que a sessão pertence ao usuário
    const { data: session } = await supabaseAdmin
      .from('ia_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('ia_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [], session_id: sessionId });
  } catch (err) {
    console.error('[API IA Chat GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
