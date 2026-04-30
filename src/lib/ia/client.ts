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
  },
  userContext?: { role: string; userId: string }
): Promise<LLMCompletionResponse> {
  const config = await getIAConfig();
  if (!config) {
    throw new Error('IA não está configurada. Configure o endpoint e token no painel admin.');
  }

  let tools: any[] = IA_TOOLS_DEFINITION;
  if (userContext) {
    const { getAvailableTools } = await import('./tools');
    tools = await getAvailableTools(userContext.userId, userContext.role);
  }
  
  // TEMPORÁRIO: Desabilitar tools para debug (descomentar linha abaixo)
  // tools = [];
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
  const timeout = setTimeout(() => controller.abort(), 300_000); // 5min timeout para permitir tools

  try {
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Sem detalhes');
      throw new Error(`LLM retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[IA Client] Resposta recebida:');
    console.log('  - tool_calls:', data.choices?.[0]?.message?.tool_calls ? 'SIM' : 'NÃO');
    if (data.choices?.[0]?.message?.tool_calls) {
      console.log('  - tool_calls detail:', JSON.stringify(data.choices[0].message.tool_calls).substring(0, 300));
    }
    console.log('  - content length:', (data.choices?.[0]?.message?.content || '').length);
    console.log('  - content:', (data.choices?.[0]?.message?.content || '').substring(0, 200));
    console.log('  - finish_reason:', data.choices?.[0]?.finish_reason);
    
    // Limite de iterações para evitar loop infinito
    const MAX_TOOL_ITERATIONS = 10;
    const toolIterationCount = (options as any)?._toolIterations || 0;
    
    // Salvar primeira resposta válida (para fallback se entrar em loop)
    const firstValidContent = (options as any)?._firstValidContent || null;
    if (!firstValidContent && data.choices?.[0]?.message?.content?.trim()) {
      options = { ...options, _firstValidContent: data.choices[0].message.content };
      console.log('[IA Client] Salvando primeira resposta válida:', data.choices[0].message.content.substring(0, 100));
    }
    
    // Processar chamadas de ferramenta recursivamente no modo sync
    // IMPORTANTE: Só continuar se há tool_calls E o array não está vazio
    const hasToolCalls = data.choices?.[0]?.message?.tool_calls && 
                         Array.isArray(data.choices[0].message.tool_calls) && 
                         data.choices[0].message.tool_calls.length > 0;
    
    if (hasToolCalls && userContext) {
      // Se já temos tool_calls e conteúdo vazio por várias iterações, usar fallback
      if (toolIterationCount >= 3 && !data.choices[0].message.content?.trim()) {
        const fallbackContent = (options as any)?._firstValidContent;
        if (fallbackContent) {
          console.log('[IA Client] Usando fallback da primeira resposta válida');
          data.choices[0].message.content = fallbackContent + '\n\n(Nota: O sistema buscou informações adicionais mas encontrou dificuldades técnicas. Os dados podem estar desatualizados.)';
          return data;
        }
      }
      
      if (toolIterationCount >= MAX_TOOL_ITERATIONS) {
        console.log('[IA Client] AVISO: Limite de iterações atingido (' + MAX_TOOL_ITERATIONS + '). Forçando resposta.');
        const fallbackContent = (options as any)?._firstValidContent;
        if (fallbackContent) {
          data.choices[0].message.content = fallbackContent;
        } else {
          data.choices[0].message.content = 'Entendo sua solicitação, mas houve dificuldades técnicas ao buscar os dados. Pode reformular sua pergunta ou tentar novamente?';
        }
        return data;
      }
      
      const toolCalls = data.choices[0].message.tool_calls;
      const newMessages = [...messages, data.choices[0].message];
      
      for (const tc of toolCalls) {
        if (tc.type === 'function') {
          const args = JSON.parse(tc.function.arguments || '{}');
          console.log('[IA Client] Executando tool:', tc.function.name, 'args:', JSON.stringify(args).substring(0, 100));
          const result = await executeToolCall(tc.function.name, args, userContext.role, userContext.userId);
          console.log('[IA Client] Tool result length:', result.length);
          newMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: tc.id,
            name: tc.function.name
          } as any);
        }
      }
      console.log('[IA Client] Fazendo chamada recursiva com', newMessages.length, 'mensagens, iteracao:', toolIterationCount + 1);
      return chatCompletion(newMessages, options, userContext);
    }
    
    // Verificar se o conteúdo está vazio e adicionar fallback
    const content = data.choices?.[0]?.message?.content || '';
    if (!content.trim() && userContext) {
      console.log('[IA Client] AVISO: Modelo retornou conteúdo vazio');
      data.choices[0].message.content = 'Desculpe, não consegui processar sua solicitação. Pode tentar novamente?';
    }
    
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Criar stream com resultado final da ferramenta
 */
function createToolResultStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ content, done: true })}\n\n`;
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    }
  });
}

/**
 * Enviar mensagens ao LLM e obter resposta via streaming (SSE)
 * Retorna um ReadableStream que pode ser usado diretamente na Response
 */
export async function chatCompletionStream(
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  },
  userContext?: { role: string; userId: string }
): Promise<ReadableStream<Uint8Array>> {
  console.log('[DEBUG chatCompletionStream] userContext:', !!userContext, 'role:', userContext?.role, 'userId:', userContext?.userId);
  const config = await getIAConfig();
  if (!config) {
    throw new Error('IA não está configurada. Configure o endpoint e token no painel admin.');
  }

  let tools: any[] = IA_TOOLS_DEFINITION;
  if (userContext) {
    const { getAvailableTools } = await import('./tools');
    tools = await getAvailableTools(userContext.userId, userContext.role);
  }

  const body: any = {
    model: options?.model || config.model_default,
    messages,
    max_tokens: options?.maxTokens || config.max_tokens,
    temperature: options?.temperature ?? config.temperatura,
    stream: true,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // 3min para streaming

  const response = await fetch(`${config.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    clearTimeout(timeout);
    const errorText = await response.text().catch(() => 'Sem detalhes');
    throw new Error(`LLM retornou ${response.status}: ${errorText}`);
  }

  // Transformar o stream SSE do LLM em texto puro para o frontend
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let fullContent = '';
  let buffer = '';
  let isToolCallMode = false;
  let toolCallId = '';
  let toolCallName = '';
  let toolCallArgsStr = '';
  let pendingToolCalls: { id: string; name: string; arguments: string }[] = [];
  let fullReasoning = '';
  // Estado do parser de raciocínio inline (<think>...</think>)
  let insideThinkBlock = false;
  let pendingText = ''; // Acumula texto parcial para detectar tag <think> que pode vir fragmentada

  /**
   * Processa um delta de conteúdo do stream, filtrando blocos <think>...</think>.
   * Mantém estado entre chunks via closures (insideThinkBlock, pendingText, fullReasoning).
   * Retorna o texto limpo a ser enviado ao cliente (vazio durante o bloco think).
   */
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
          remaining = remaining.slice(closeIdx + 8); // '</think>'.length === 8
        }
      } else {
        const openIdx = remaining.indexOf('<think>');
        if (openIdx === -1) {
          // Verifica se o final é prefixo parcial de '<think>'
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
          remaining = remaining.slice(openIdx + 7); // '<think>'.length === 7
        }
      }
    }

    return result;
  }

  function findPartialOpenTag(text: string): number {
    const tag = '<think>';
    for (let len = Math.min(tag.length - 1, text.length); len > 0; len--) {
      if (text.endsWith(tag.slice(0, len))) return len;
    }
    return 0;
  }

  function safeParseToolArgs(raw: string): any {
    const rawTrim = (raw || '').trim();
    if (!rawTrim) return {};
    try {
      let parsed: any = JSON.parse(rawTrim);
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // mantenha como string
        }
      }
      return parsed;
    } catch {
      let t = rawTrim;
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        t = t.substring(1, t.length - 1);
      }
      try {
        let parsed2: any = JSON.parse(t);
        if (typeof parsed2 === 'string') {
          try {
            parsed2 = JSON.parse(parsed2);
          } catch {
            // keep as string
          }
        }
        return parsed2;
      } catch {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          try {
            return JSON.parse(t.substring(start, end + 1));
          } catch {
            // fallback below
          }
        }
      }
    }
    return {};
  }

return new ReadableStream<Uint8Array>({
    async pull(streamController) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          // Stream ended - tool handling is done by route.ts pipeline
          console.log('[DEBUG STREAM END] fullContent length:', fullContent.length);
          
          clearTimeout(timeout);
          const finalEvent = `data: ${JSON.stringify({ done: true, fullContent })}\n\n`;
          streamController.enqueue(encoder.encode(finalEvent));
          streamController.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

            const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;

          try {
            console.log('[DEBUG LM STUDIO CHUNK]:', dataStr);
            const parsed = JSON.parse(dataStr);
            
// Detectar inicio/acúmulo de chamadas de ferramenta (Tool Calling)
            // Suporte tanto os formatos: delta.tool_calls quanto root tool_calls (para GLM/OSS)
            if (parsed.choices?.[0]?.delta?.tool_calls && parsed.choices[0].delta.tool_calls.length > 0) {
              isToolCallMode = true;
              console.log('[DEBUG] Tool calls DETECTED:', parsed.choices[0].delta.tool_calls.length);
              for (const tc of parsed.choices[0].delta.tool_calls) {
                if (tc.id && tc.function?.name) {
                  // Check if this tool call already exists in pending
                  const existingIdx = pendingToolCalls.findIndex(p => p.id === tc.id);
                  if (existingIdx >= 0) {
                    // Update arguments for existing
                    pendingToolCalls[existingIdx].arguments += tc.function.arguments || '';
                  } else {
                    // Add new tool call
                    pendingToolCalls.push({
                      id: tc.id,
                      name: tc.function.name,
                      arguments: tc.function.arguments || ''
                    });
                  }
                  // Update current working variables for single-tool compatibility
                  if (!toolCallId) toolCallId = tc.id;
                  if (!toolCallName) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgsStr += tc.function.arguments;
                }
              }
              console.log('[DEBUG] pendingToolCalls:', pendingToolCalls.length, 'current:', toolCallName);
              continue;
            }
            // Fallback: alguns modelos enviam tool_calls no nível raiz
            if (parsed.choices?.[0]?.tool_calls && parsed.choices[0].tool_calls.length > 0) {
              isToolCallMode = true;
              for (const tc of parsed.choices[0].tool_calls) {
                if (tc?.id && tc?.function?.name) {
                  const existingIdx = pendingToolCalls.findIndex(p => p.id === tc.id);
                  if (existingIdx >= 0) {
                    pendingToolCalls[existingIdx].arguments += tc.function.arguments || '';
                  } else {
                    pendingToolCalls.push({
                      id: tc.id,
                      name: tc.function.name,
                      arguments: tc.function.arguments || ''
                    });
                  }
                  if (!toolCallId) toolCallId = tc.id;
                  if (!toolCallName) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgsStr += tc.function.arguments;
                }
              }
              continue;
            }
            // GLM/glm-oss style tool_call (fallback para modelos que usam function_call)
            if (parsed.choices?.[0]?.delta?.function_call) {
              isToolCallMode = true;
              const fc = parsed.choices[0].delta.function_call;
              if (fc.name) toolCallName = fc.name;
              if (fc.arguments) toolCallArgsStr += fc.arguments;
              continue;
            }
            if (parsed.choices?.[0]?.message?.function_call) {
              isToolCallMode = true;
              const fc2 = parsed.choices[0].message.function_call;
              if (fc2.name) toolCallName = fc2.name;
              if (fc2.arguments) toolCallArgsStr += fc2.arguments;
              continue;
            }
            // Inferência/roteiro de raciocínio inline (novos modelos retornam reasoning)
            if (parsed.choices?.[0]?.delta?.reasoning !== undefined) {
              const rc = parsed.choices[0].delta.reasoning;
              if (rc) fullReasoning += rc;
              // Mantém a conexão SSE com um placeholder de pensamento
              streamController.enqueue(encoder.encode(': thinking\n\n'));
              // Não continua aqui; seguimos processando conteúdo normalmente
            }

            let rawContent = '';

            // --- Formato 1: reasoning_content separado (OpenAI o1/o3, GLM-Z1, Qwen-QwQ) ---
            if (parsed.choices?.[0]?.delta?.reasoning_content !== undefined) {
              const rc = parsed.choices[0].delta.reasoning_content;
              if (rc) fullReasoning += rc;
              // Mantém a conexão viva com comentario SSE válido
              streamController.enqueue(encoder.encode(': thinking\n\n'));
            }

            // --- Extração do delta de conteúdo principal ---
            if (parsed.choices?.[0]?.delta?.content !== undefined && parsed.choices[0].delta.content !== null) {
              rawContent = parsed.choices[0].delta.content;
            } else if (parsed.choices?.[0]?.message?.content !== undefined) {
              rawContent = parsed.choices[0].message.content;
            } else if (parsed.response !== undefined) { // Ollama generate
              rawContent = parsed.response;
            } else if (parsed.message?.content !== undefined) { // Ollama chat
              rawContent = parsed.message.content;
            } else if (parsed.choices?.[0]?.text !== undefined) { // Completions format
              rawContent = parsed.choices[0].text;
            } else if (parsed.content !== undefined) { // Bare content format
              rawContent = parsed.content;
            }

            // --- Formatos 2/3: <think>...</think> inline no content (GLM, DeepSeek, gpt-oss) ---
            if (rawContent) {
              const cleanContent = processContentDelta(rawContent);
              if (cleanContent) {
                fullContent += cleanContent;
                const event = `data: ${JSON.stringify({ content: cleanContent, done: false })}\n\n`;
                streamController.enqueue(encoder.encode(event));
              }
            }
          } catch (err) {
            console.log('[DEBUG LM STUDIO ERROR PARSING]:', dataStr, err);
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        streamController.error(err);
      }
    },
    cancel() {
      clearTimeout(timeout);
      reader.cancel();
    },
  });
}

/**
 * Listar modelos disponíveis no endpoint LLM
 */
export async function listModels(): Promise<Array<{ id: string; object: string; owned_by: string }>> {
  const config = await getIAConfig();
  if (!config) {
    throw new Error('IA não está configurada.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${config.endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Erro ao listar modelos: ${response.status}`);
    }

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
