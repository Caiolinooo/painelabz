/**
 * API: /api/ia/chat
 * POST — Enviar mensagem e receber resposta da IA
 * Suporta streaming (SSE) e modo síncrono
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chatCompletion, chatCompletionStream, invalidateConfigCache } from '@/lib/ia/client';
import { buildChatMessages } from '@/lib/ia/context-builder';
import type { IAChatMessage } from '@/types/ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para permitir execução de tools

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

    // Buscar profile para obter role
    const { data: profile } = await supabaseAdmin.from('users_unified').select('role').eq('id', userId).single();
    const userRole = profile?.role || 'USER';

    // =====================================================
    // Streaming Real: chatCompletionStream (processa tools recursivamente)
    // =====================================================
    if (useStream) {
      try {
        const startTime = Date.now();
        let finalContent = '';
        let lastDashboard: any = null;
        let saved = false;
        
        console.log('[IA Stream] Iniciando streaming real com processamento de tools...');
        
        const readableStream = await chatCompletionStream(
          llmMessages,
          { 
            signal: request.signal,
            onStatus: (status) => {
              const encoder = new TextEncoder();
              // Hack: we can't enqueue here, but we'll handle it in the transform
            }
          },
          { role: userRole, userId }
        );
        
        const decoder = new TextDecoder();
        let buffer = '';
        const encoder = new TextEncoder();

        // Transform stream to handle events and tracking
        const transformer = new TransformStream({
          async transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                
                // Handle status events
                if (parsed.status) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: parsed.status })}\n\n`));
                  continue;
                }
                
                // Handle metadata events
                if (parsed.metadata) {
                  lastDashboard = parsed.metadata.dashboard || lastDashboard;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: parsed.metadata })}\n\n`));
                  continue;
                }
                
                // Handle content chunks
                if (parsed.content !== undefined) {
                  finalContent += parsed.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.content, done: false })}\n\n`));
                }
                
                // Handle done event
                if (parsed.done) {
                  finalContent = parsed.fullContent || finalContent;
                  lastDashboard = parsed.metadata?.dashboard || lastDashboard;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullContent: finalContent, metadata: parsed.metadata })}\n\n`));
                  
                  // Save to DB after stream completes
                  if (!saved) {
                    saved = true;
                    const responseTime = Date.now() - startTime;
                    try {
                      await supabaseAdmin.from('ia_chat_messages').insert({
                        session_id: sessionId,
                        role: 'assistant',
                        content: finalContent,
                        response_time_ms: responseTime,
                        metadata: { orchestrated: true, streamed: true, dashboard: lastDashboard },
                      });
                    } catch (saveErr) {
                      console.error('[IA Stream] Erro ao salvar resposta:', saveErr);
                    }
                  }
                }
              } catch (parseErr) {
                // Skip unparseable lines
              }
            }
          },
          async flush(controller) {
            // Handle remaining buffer
            if (buffer && buffer.startsWith('data: ')) {
              const dataStr = buffer.slice(6).trim();
              if (dataStr && dataStr !== '[DONE]') {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.content) finalContent += parsed.content;
                  if (parsed.done) {
                    finalContent = parsed.fullContent || finalContent;
                  }
                } catch {}
              }
            }
            if (!saved) {
              saved = true;
              const responseTime = Date.now() - startTime;
              try {
                await supabaseAdmin.from('ia_chat_messages').insert({
                  session_id: sessionId,
                  role: 'assistant',
                  content: finalContent,
                  response_time_ms: responseTime,
                  metadata: { orchestrated: true, streamed: true, dashboard: lastDashboard },
                });
              } catch (saveErr) {
                console.error('[IA Stream] Erro ao salvar resposta:', saveErr);
              }
            }
          }
        });
        
        const stream = readableStream.pipeThrough(transformer);
        
        return new Response(stream as any, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Session-Id': sessionId,
          },
        });
      } catch (streamError) {
        console.error('[IA Chat Stream] Erro:', streamError);
        // Continuar para o modo sync abaixo
      }
    }

    // =====================================================
    // Sync mode (fallback ou explícito)
    // =====================================================
    const startTime = Date.now();
    const llmResponse = await chatCompletion(
      llmMessages, 
      { signal: request.signal }, 
      { role: userRole, userId }
    );
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
          dashboard: llmResponse.choices?.[0]?.message?.metadata?.dashboard
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
    const raw = err instanceof Error ? err.message : 'Erro interno';
    const friendly =
      raw.includes('Unexpected token') ||
      raw.includes('<!DOCTYPE') ||
      raw.includes('is not valid JSON') ||
      raw.includes('retornou uma página HTML')
        ? 'A IA não conseguiu processar a solicitação agora. Verifique a configuração do endpoint no painel admin ou tente novamente.'
        : raw;
    return NextResponse.json(
      { error: friendly },
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
