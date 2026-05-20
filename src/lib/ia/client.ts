/**
 * Cliente LLM compatível com OpenAI API (LM Studio)
 * Suporta respostas normais e streaming via SSE
 */
import type {
  IAConfig,
  LLMMessage,
  LLMCompletionRequest,
  LLMCompletionResponse,
} from '@/types/ia';
import { supabaseAdmin } from '@/lib/supabase';
import { IA_TOOLS_DEFINITION, executeToolCall } from './tools';

// Cache da config para evitar queries repetidas
let configCache: IAConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minuto

/**
 * Buscar configuração ativa da IA do banco
 */
export async function getIAConfig(): Promise<IAConfig | null> {
  const now = Date.now();
  if (configCache && now - configCacheTime < CONFIG_CACHE_TTL) {
    return configCache;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ia_config')
      .select('*')
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('[IA Client] Erro ao buscar config:', error?.message);
      return null;
    }

    configCache = data as IAConfig;
    configCacheTime = now;
    return configCache;
  } catch (err) {
    console.error('[IA Client] Erro inesperado ao buscar config:', err);
    return null;
  }
}

/**
 * Invalidar cache de config (após update via admin)
 */
export function invalidateConfigCache(): void {
  configCache = null;
  configCacheTime = 0;
}

/**
 * Enviar mensagens ao LLM e obter resposta completa (sem streaming)
 */
export async function chatCompletion(
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    _toolIterations?: number;
    _firstValidContent?: string | null;
    _timeoutMs?: number;
    _accumulatedMetadata?: any;
    onStatus?: (status: string) => void;
  },
  userContext?: { role: string; userId: string }
): Promise<LLMCompletionResponse> {
  const callStartTime = Date.now();
  const config = await getIAConfig();

  if (!config) {
    throw new Error('IA não está configurada. Configure o endpoint e token no painel admin.');
  }

  let tools: any[] = IA_TOOLS_DEFINITION;
  if (userContext) {
    const { getAvailableTools } = await import('./tools');
    tools = await getAvailableTools(userContext.userId, userContext.role);
  }
  
  console.log('[IA Client] Tools disponíveis para o modelo:', tools.length);

  const body: any = {
    model: options?.model || config.model_default,
    messages,
    max_tokens: options?.maxTokens || config.max_tokens,
    temperature: options?.temperature ?? config.temperatura,
    stream: false,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
  };

  const controller = new AbortController();
  const timeoutMs = options?._timeoutMs || 240_000; // Reduzido para 4min para dar margem
  const timeout = setTimeout(() => {
    console.log('[IA Client] TIMEOUT ATINGIDO - Abortando requisição');
    controller.abort();
  }, timeoutMs);

  try {
    const combinedSignal = options?.signal 
      ? AbortSignal.any([controller.signal, options.signal]) 
      : controller.signal;

    const response = await fetch(`${config!.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config!.api_key}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Sem detalhes');
      throw new Error(`LLM retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Limite de iterações para evitar loop infinito
    const MAX_TOOL_ITERATIONS = 10;
    const toolIterationCount = options?._toolIterations || 0;
    const firstValidContent = options?._firstValidContent || null;
    
    if (!firstValidContent && data.choices?.[0]?.message?.content?.trim()) {
      options = { ...options, _firstValidContent: data.choices[0].message.content };
    }
    
    const hasToolCalls = data.choices?.[0]?.message?.tool_calls && 
                         Array.isArray(data.choices[0].message.tool_calls) && 
                         data.choices[0].message.tool_calls.length > 0;
    
    if (hasToolCalls && userContext) {
      if (toolIterationCount >= 3 && !data.choices[0].message.content?.trim()) {
        const fallbackContent = options?._firstValidContent;
        if (fallbackContent) {
          data.choices[0].message.content = fallbackContent + '\n\n(Nota: O sistema buscou informações adicionais mas encontrou dificuldades técnicas.)';
          return data;
        }
      }
      
      if (toolIterationCount >= MAX_TOOL_ITERATIONS) {
        const fallbackContent = options?._firstValidContent;
        data.choices[0].message.content = fallbackContent || 'Limite de busca atingido.';
        return data;
      }
      
      const toolCalls = data.choices[0].message.tool_calls;
      const newMessages = [...messages, data.choices[0].message];
      let mergedMetadata = options?._accumulatedMetadata || {};
      
      for (const tc of toolCalls) {
          if (options?.onStatus) {
            options.onStatus(`Processando: ${tc.function.name}...`);
          }
          const args = JSON.parse(tc.function.arguments || '{}');
          let result = await executeToolCall(tc.function.name, args, userContext.role, userContext.userId);
          let toolContent = result;
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult._metadata) {
              mergedMetadata = { ...mergedMetadata, ...parsedResult._metadata };
            }
            if (tc.function.name === 'render_dashboard') {
              toolContent = parsedResult.message || 'Dashboard renderizado.';
            }
          } catch { /* usa o result original */ }

          newMessages.push({
            role: 'tool',
            content: toolContent,
            tool_call_id: tc.id,
            name: tc.function.name
          } as any);
        }
      
      const totalElapsed = Date.now() - callStartTime;
      const remainingTimeout = timeoutMs - totalElapsed;

      return chatCompletion(newMessages, { 
        ...options, 
        _toolIterations: toolIterationCount + 1,
        _firstValidContent: firstValidContent || data.choices[0].message.content,
        _timeoutMs: Math.max(remainingTimeout, 30000),
        _accumulatedMetadata: mergedMetadata,
        onStatus: options?.onStatus
      }, userContext);
    }
    
      // Se terminou e temos metadados acumulados, anexa ao resultado final
      if (options && Object.keys(options._accumulatedMetadata || {}).length > 0) {
        if (data.choices?.[0]?.message) {
          data.choices[0].message.metadata = {
            ...data.choices[0].message.metadata,
            ...options._accumulatedMetadata
          };
        }
      }

    // Fallback: Extração de dashboard "perdido" no texto (caso o modelo não use a tool corretamente)
    if (!data.choices?.[0]?.message?.metadata?.dashboard && data.choices?.[0]?.message?.content) {
      try {
        const content = data.choices[0].message.content;
        const dashboardRegex = /\{[\s\S]*?"dashboard"[\s\S]*?"layout"[\s\S]*?"widgets"[\s\S]*?\}/g;
        const match = content.match(dashboardRegex);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const layout = parsed.dashboard?.layout || parsed.layout;
          if (layout && layout.widgets) {
            data.choices[0].message.metadata = {
              ...data.choices[0].message.metadata,
              dashboard: layout
            };
            // Remove o JSON do texto para não poluir a interface
            data.choices[0].message.content = content.replace(match[0], '').replace(/```json|```/g, '').trim();
          }
        }
      } catch { /* ignore */ }
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Enviar mensagens ao LLM e obter resposta via streaming (SSE)
 */
export async function chatCompletionStream(
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    onStatus?: (status: string) => void;
  },
  userContext?: { role: string; userId: string }
): Promise<ReadableStream<Uint8Array>> {
  const config = await getIAConfig();
  if (!config) {
    throw new Error('IA não está configurada.');
  }

  let tools: any[] = IA_TOOLS_DEFINITION;
  if (userContext) {
    const { getAvailableTools } = await import('./tools');
    tools = await getAvailableTools(userContext.userId, userContext.role);
  }

  const body: any = {
    model: options?.model || config!.model_default,
    messages,
    max_tokens: options?.maxTokens || config!.max_tokens,
    temperature: options?.temperature ?? config!.temperatura,
    stream: true,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
    ...options,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240_000);

  const combinedSignal = options?.signal 
    ? AbortSignal.any([controller.signal, options.signal]) 
    : controller.signal;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullContent = '';
  let fullReasoning = '';
  let insideThinkBlock = false;
  let pendingText = '';
  let accumulatedMetadata: any = {};


  function findPartialOpenTag(text: string): number {
    const tag = '<think>';
    for (let len = Math.min(tag.length - 1, text.length); len > 0; len--) {
      if (text.endsWith(tag.slice(0, len))) return len;
    }
    return 0;
  }

  function processContentDelta(delta: string): string {
    let result = '';
    let remaining = pendingText + delta;
    pendingText = '';

    while (remaining.length > 0) {
      if (insideThinkBlock) {
        const closeIdx = remaining.indexOf('</think>');
        if (closeIdx === -1) {
          fullReasoning += remaining;
          remaining = '';
        } else {
          fullReasoning += remaining.slice(0, closeIdx);
          insideThinkBlock = false;
          remaining = remaining.slice(closeIdx + 8);
        }
      } else {
        const openIdx = remaining.indexOf('<think>');
        if (openIdx === -1) {
          const partialLen = findPartialOpenTag(remaining);
          if (partialLen > 0) {
            result += remaining.slice(0, remaining.length - partialLen);
            pendingText = remaining.slice(remaining.length - partialLen);
            remaining = '';
          } else {
            result += remaining;
            remaining = '';
          }
        } else {
          result += remaining.slice(0, openIdx);
          insideThinkBlock = true;
          remaining = remaining.slice(openIdx + 7);
        }
      }
    }
    return result;
  }

  let toolIterationCount = 0;
  const MAX_TOOL_ITERATIONS = 5;

  async function startStream(currentMessages: LLMMessage[], streamController: ReadableStreamDefaultController<Uint8Array>) {
    if (toolIterationCount >= MAX_TOOL_ITERATIONS) {
      const event = `data: ${***REMOVED*** content: 'Limite de busca atingido.', done: true })}\n\n`;
      streamController.enqueue(encoder.encode(event));
      streamController.close();
      return;
    }

    const response = await fetch(`${config!.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config!.api_key}`,
      },
      body: ***REMOVED***
        ...body,
        messages: currentMessages,
      }),
      signal: combinedSignal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'Sem detalhes');
      throw new Error(`LLM retornou ${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    let currentFullContent = '';
    let isToolCallMode = false;
    let pendingToolCalls: { id: string; name: string; arguments: string }[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.tool_calls) {
            isToolCallMode = true;
            for (const tc of delta.tool_calls) {
              if (tc.id && tc.function?.name) {
                pendingToolCalls.push({
                  id: tc.id,
                  name: tc.function.name,
                  arguments: tc.function.arguments || ''
                });
              } else if (tc.function?.arguments) {
                if (pendingToolCalls.length > 0) {
                  pendingToolCalls[pendingToolCalls.length - 1].arguments += tc.function.arguments;
                }
              }
            }
            continue;
          }

          if (delta?.content !== undefined && delta?.content !== null) {
            const rawContent = delta.content;
            const cleanContent = processContentDelta(rawContent);
            if (cleanContent) {
              currentFullContent += cleanContent;
              fullContent += cleanContent;
              const event = `data: ${***REMOVED*** content: cleanContent, done: false })}\n\n`;
              streamController.enqueue(encoder.encode(event));
            }
          }
        } catch { /* skip */ }
      }
    }

    if (isToolCallMode && pendingToolCalls.length > 0) {
      toolIterationCount++;
      const nextMessages = [...currentMessages, { role: 'assistant', tool_calls: pendingToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments }
      })) }];

      for (const tc of pendingToolCalls) {
        const event = `data: ${***REMOVED*** status: `Executando: ${tc.name}...` })}\n\n`;
        streamController.enqueue(encoder.encode(event));

        const args = JSON.parse(tc.arguments || '{}');
        const rawResult = await executeToolCall(tc.name, args, userContext?.role || 'USER', userContext?.userId || '');
        
        let toolContent = rawResult;
        try {
          const parsedResult = JSON.parse(rawResult);
          if (parsedResult._metadata) {
            accumulatedMetadata = { ...accumulatedMetadata, ...parsedResult._metadata };
          }
          // Se for o render_dashboard, podemos limpar o conteúdo para não poluir o contexto se for muito grande
          // Mas o LLM precisa saber que funcionou.
          if (tc.name === 'render_dashboard') {
            toolContent = parsedResult.message || 'Dashboard renderizado.';
          }
        } catch {
          // Não era JSON ou falhou o parse, usa raw
        }

        nextMessages.push({
          role: 'tool',
          content: toolContent,
          tool_call_id: tc.id,
          name: tc.name
        } as any);
      }

       // Envia metadados acumulados se houver
      if (Object.keys(accumulatedMetadata).length > 0) {
        const metaEvent = `data: ${***REMOVED*** metadata: accumulatedMetadata })}\n\n`;
        streamController.enqueue(encoder.encode(metaEvent));
      }

      await startStream(nextMessages as LLMMessage[], streamController);
    } else {
      let finalDashboard = accumulatedMetadata.dashboard;
      
      // Fallback para streaming: tenta extrair se não veio via tool
      if (!finalDashboard && fullContent) {
        try {
          const dashboardRegex = /\{[\s\S]*?"dashboard"[\s\S]*?"layout"[\s\S]*?"widgets"[\s\S]*?\}/g;
          const match = fullContent.match(dashboardRegex);
          if (match) {
            const parsed = JSON.parse(match[0]);
            finalDashboard = parsed.dashboard?.layout || parsed.layout;
            if (finalDashboard && finalDashboard.widgets) {
              accumulatedMetadata.dashboard = finalDashboard;
              fullContent = fullContent.replace(match[0], '').replace(/```json|```/g, '').trim();
            }
          }
        } catch { /* ignore */ }
      }

      const finalEvent = `data: ${***REMOVED*** 
        done: true, 
        fullContent, 
        metadata: Object.keys(accumulatedMetadata).length > 0 ? accumulatedMetadata : undefined 
      })}\n\n`;
      streamController.enqueue(encoder.encode(finalEvent));
      streamController.close();
    }
  }

  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      try {
        await startStream(messages, streamController);
      } catch (err) {
        console.error('[IA Stream] Erro na orquestração:', err);
        streamController.error(err);
      }
    },
    cancel() {
      clearTimeout(timeout);
      controller.abort();
    },
  });
}

/**
 * Listar modelos disponíveis no endpoint LLM
 */
export async function listModels(): Promise<Array<{ id: string; object: string; owned_by: string }>> {
  const config = await getIAConfig();
  if (!config) throw new Error('IA não está configurada.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${config.endpoint}/models`, {
      headers: { 'Authorization': `Bearer ${config.api_key}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Erro ao listar modelos: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Testar conexão com o endpoint LLM
 */
export async function testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
  try {
    const models = await listModels();
    return {
      success: true,
      message: `Conectado com sucesso. ${models.length} modelo(s) disponível(is).`,
      models: models.map(m => m.id),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro desconhecido ao conectar.',
    };
  }
}
