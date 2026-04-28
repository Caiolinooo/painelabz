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

  const body: any = {
    model: options?.model || config.model_default,
    messages,
    max_tokens: options?.maxTokens || config.max_tokens,
    temperature: options?.temperature ?? config.temperatura,
    stream: false,
    tools: IA_TOOLS_DEFINITION,
    tool_choice: 'auto',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2min timeout

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
    
    // Processar chamadas de ferramenta recursivamente no modo sync
    if (data.choices?.[0]?.message?.tool_calls && userContext) {
      const toolCalls = data.choices[0].message.tool_calls;
      const newMessages = [...messages, data.choices[0].message];
      
      for (const tc of toolCalls) {
        if (tc.type === 'function') {
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await executeToolCall(tc.function.name, args, userContext.role, userContext.userId);
          newMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: tc.id,
            name: tc.function.name
          } as any);
        }
      }
      return chatCompletion(newMessages, options, userContext);
    }
    
    return data;
  } finally {
    clearTimeout(timeout);
  }
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
  const config = await getIAConfig();
  if (!config) {
    throw new Error('IA não está configurada. Configure o endpoint e token no painel admin.');
  }

  const body: any = {
    model: options?.model || config.model_default,
    messages,
    max_tokens: options?.maxTokens || config.max_tokens,
    temperature: options?.temperature ?? config.temperatura,
    stream: true,
    // Removendo ferramentas temporariamente para testar se é isso que está quebrando o LM Studio
    // tools: IA_TOOLS_DEFINITION,
    // tool_choice: 'auto',
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
  let fullReasoning = '';

  return new ReadableStream<Uint8Array>({
    async pull(streamController) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          if (isToolCallMode && userContext) {
            // Executa a ferramenta e reinicia o stream
            const args = JSON.parse(toolCallArgsStr || '{}');
            const result = await executeToolCall(toolCallName, args, userContext.role, userContext.userId);
            
            const newMessages = [...messages, {
              role: 'assistant',
              tool_calls: [{ id: toolCallId, type: 'function', function: { name: toolCallName, arguments: toolCallArgsStr } }]
            } as any, {
              role: 'tool',
              content: result,
              tool_call_id: toolCallId,
              name: toolCallName
            } as any];

            const nextStream = await chatCompletionStream(newMessages, options, userContext);
            const nextReader = nextStream.getReader();
            
            while (true) {
              const nextVal = await nextReader.read();
              if (nextVal.done) {
                // Apenas fecha, o finish_reason de lá será propagado
                streamController.close();
                clearTimeout(timeout);
                return;
              }
              streamController.enqueue(nextVal.value);
            }
          }

          // Enviar evento final com conteúdo completo (se não for tool call)
          console.log('[DEBUG LM STUDIO STREAM END] Final fullContent length:', fullContent.length);
          if (!fullContent && !isToolCallMode) {
             console.log('[DEBUG LM STUDIO STREAM END] WARNING: fullContent is empty! Fallback to reasoning.');
             if (fullReasoning) {
               fullContent = fullReasoning; // Fallback se o modelo colocou tudo no raciocínio
             }
          }
          const finalEvent = `data: ${***REMOVED*** done: true, fullContent })}\n\n`;
          streamController.enqueue(encoder.encode(finalEvent));
          streamController.close();
          clearTimeout(timeout);
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
            if (parsed.choices?.[0]?.delta?.tool_calls && parsed.choices[0].delta.tool_calls.length > 0) {
              isToolCallMode = true;
              const tc = parsed.choices[0].delta.tool_calls[0];
              if (tc.id) toolCallId = tc.id;
              if (tc.function?.name) toolCallName = tc.function.name;
              if (tc.function?.arguments) toolCallArgsStr += tc.function.arguments;
              continue; // Pular enqueue de texto
            }

            let content = '';
            
            if (parsed.choices?.[0]?.delta?.content !== undefined && parsed.choices[0].delta.content !== null) {
              content = parsed.choices[0].delta.content;
            } else if (parsed.choices?.[0]?.delta?.reasoning_content !== undefined) { // Thinking models
              // Ocultando o pensamento do modelo conforme solicitado
              // Logando para sabermos que ele está pensando
              const rc = parsed.choices[0].delta.reasoning_content;
              if (rc) fullReasoning += rc;
              content = ''; 
            } else if (parsed.choices?.[0]?.message?.content !== undefined) {
              content = parsed.choices[0].message.content;
            } else if (parsed.response !== undefined) { // Ollama generate
              content = parsed.response;
            } else if (parsed.message?.content !== undefined) { // Ollama chat
              content = parsed.message.content;
            } else if (parsed.choices?.[0]?.text !== undefined) { // Completions format
              content = parsed.choices[0].text;
            } else if (parsed.content !== undefined) { // Bare content format
              content = parsed.content;
            }

            if (content) {
              fullContent += content;
              const event = `data: ${***REMOVED*** content, done: false })}\n\n`;
              streamController.enqueue(encoder.encode(event));
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
