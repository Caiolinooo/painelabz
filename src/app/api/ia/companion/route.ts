/**
 * API: /api/ia/companion
 * POST — Companion flutuante conectado à IA real (mesmas tools do chat),
 * com navegação fuzzy (typos) e extração de commands para o Portal Action Bus.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chatCompletion } from '@/lib/ia/client';
import type { AICommandPayload } from '@/lib/ia/portal-action-bus';
import {
  buildNavCommand,
  isNavigationIntent,
  resolvePortalNavigation,
} from '@/lib/ia/portal-navigation';
import type { LLMMessage } from '@/types/ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const COMPANION_SYSTEM = `Você é o **ABZ Companion**, assistente flutuante do Portal ABZ Group.

## Papel
- Você ESTÁ conectado à IA real do portal — use tools para dados e navegação. Nunca diga que é um atalho genérico ou que o usuário deve "usar o chat completo".
- Respostas curtas (2–6 frases), português do Brasil, cordial e objetivo.

## Navegação
- Para abrir módulos, chame a tool \`navegar_portal\` com o destino (aceita typos: feririas, reemboso, tripuentes…).
- Confirme na resposta para onde está levando o usuário.
- Intenções: "abre ferias", "ir pra reembolso", "quero ver tripulantes", "e-social", "kpi", "minhas férias".
- Contextos compostos: "aprovar férias" → férias/aprovações; "estoque epi" → EPI; "meus cursos" → Academy.

## Consultas
- Use tools para férias, reembolsos, KPIs, e-mails, calendário, Teams, EPI, Academy, tripulantes, etc.
- Se a pergunta for ambígua, faça UMA pergunta curta OU escolha o destino mais provável e diga o que fez.

## Memória
- Use \`salvar_memoria_usuario\` quando o usuário pedir para lembrar algo ou revelar preferências duráveis.
- Fatos importantes já salvos aparecem no contexto — use-os; não invente.

## Formato
- Texto natural para o usuário.
- Não exponha JSON cru, tags de pensamento ou nomes internos de tools.`;

function extractCommandsFromText(text: string): AICommandPayload[] {
  const commands: AICommandPayload[] = [];
  // Tenta bloco JSON embutido { "commands": [...] }
  const jsonMatch = text.match(/\{[\s\S]*"commands"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.commands)) {
        for (const c of parsed.commands) {
          if (c?.action && c?.target) {
            commands.push({
              action: c.action,
              target: c.target,
              label: c.label,
              value: c.value,
            });
          }
        }
      }
    } catch { /* ignore */ }
  }
  return commands;
}

function extractCommandsFromToolishPayload(content: string): AICommandPayload[] {
  const commands = extractCommandsFromText(content);
  // Também tenta se a mensagem inteira for o JSON da tool navegar_portal
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.commands)) {
      for (const c of parsed.commands) {
        if (c?.action && c?.target) {
          commands.push({
            action: c.action,
            target: c.target,
            label: c.label,
            value: c.value,
          });
        }
      }
    }
  } catch { /* not json */ }
  return commands;
}

export async function POST(req: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(req);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId as string;
    const body = await req.json();
    const { prompt, commands: incomingCommands, history = [], session_id } = body;

    if (Array.isArray(incomingCommands) && incomingCommands.length > 0) {
      return NextResponse.json({
        reply: body.reply || 'Executando navegação no portal...',
        commands: incomingCommands as AICommandPayload[],
        userId,
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt é obrigatório.' }, { status: 400 });
    }

    const commands: AICommandPayload[] = [];

    // 1) Navegação fuzzy (typos / sinônimos) — caminho rápido quando intenção é clara
    const navIntent = isNavigationIntent(prompt);
    const navMatch = resolvePortalNavigation(prompt);
    // Limiar 0.78 com verbo de navegação; 0.88 se for frase curta só com destino
    const fuzzyThreshold = navIntent ? 0.78 : 0.9;
    if (navMatch && navMatch.score >= fuzzyThreshold) {
      commands.push(buildNavCommand(navMatch));
    }

    // 2) IA real com tools
    const { data: profile } = await supabaseAdmin
      .from('users_unified')
      .select('role, first_name')
      .eq('id', userId)
      .maybeSingle();
    const userRole = profile?.role || 'USER';
    const firstName = profile?.first_name || '';

    const historyMessages: LLMMessage[] = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((m: any) => m?.role && m?.content)
          .map((m: any) => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: String(m.content),
          }))
      : [];

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          COMPANION_SYSTEM +
          (firstName ? `\nUsuário logado: ${firstName} (role ${userRole}).` : '') +
          (navMatch
            ? `\nSugestão de navegação detectada: ${navMatch.route.label} → ${navMatch.route.path} (score ${navMatch.score.toFixed(2)}, match "${navMatch.matchedOn}"). Se fizer sentido, confirme e use navegar_portal.`
            : '') +
          (await (async () => {
            try {
              const { buildUserMemoryPromptBlock } = await import('@/lib/ia/user-memory');
              return await buildUserMemoryPromptBlock(userId);
            } catch {
              return '';
            }
          })()),
      },
      ...historyMessages,
      // Prefixo interno para o router de sub-agentes priorizar o agente companion
      { role: 'user', content: `[ABZ_COMPANION] ${prompt.trim()}` },
    ];

    let replyText = '';
    try {
      const llmResponse = await chatCompletion(
        messages,
        { maxTokens: 2048, temperature: 0.45, _timeoutMs: 90_000 },
        { role: userRole, userId }
      );

      replyText =
        llmResponse.choices?.[0]?.message?.content?.trim() ||
        '';

      // Commands vindos da tool navegar_portal (via _metadata acumulado no client)
      const metaCommands = (llmResponse.choices?.[0]?.message as { metadata?: { portalCommands?: AICommandPayload[] } })
        ?.metadata?.portalCommands;
      if (Array.isArray(metaCommands)) {
        for (const c of metaCommands) {
          if (c?.action && c?.target && !commands.some(x => x.action === c.action && x.target === c.target)) {
            commands.push(c);
          }
        }
      }

      // Extrai commands se a IA/tools embutiram JSON no texto
      const fromContent = extractCommandsFromToolishPayload(replyText);
      for (const c of fromContent) {
        if (!commands.some(x => x.action === c.action && x.target === c.target)) {
          commands.push(c);
        }
      }

      // Remove JSON cru da resposta ao usuário quando possível
      if (fromContent.length > 0) {
        replyText = replyText
          .replace(/\{[\s\S]*"commands"\s*:\s*\[[\s\S]*?\][\s\S]*\}/g, '')
          .trim();
      }
    } catch (iaErr) {
      console.error('[Companion] IA error:', iaErr);
      // Fallback: se já temos navegação fuzzy, confirma; senão erro amigável
      if (commands.length > 0 && navMatch) {
        replyText = `Vou te levar para **${navMatch.route.label}**.`;
      } else {
        const msg = iaErr instanceof Error ? iaErr.message : 'Erro na IA';
        if (msg.includes('IA não está configurada')) {
          return NextResponse.json(
            { error: 'A IA ainda não foi configurada. Configure em /admin/ia-config.' },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Não consegui processar com a IA agora. Tente novamente em instantes.' },
          { status: 502 }
        );
      }
    }

    if (!replyText && commands.length > 0 && navMatch) {
      replyText = `Abrindo ${navMatch.route.label} para você.`;
    }
    if (!replyText) {
      replyText = 'Pronto — como posso ajudar?';
    }

    // Extrai / salva LTM (Hermes-like) — não bloqueia resposta
    void (async () => {
      try {
        const { extractAndSaveMemoriesFromTurn } = await import('@/lib/ia/user-memory');
        await extractAndSaveMemoriesFromTurn({
          userId,
          userMessage: prompt.trim(),
          assistantReply: replyText,
          source: 'companion',
          sessionId: session_id,
        });
      } catch (memErr) {
        console.warn('[Companion] memory extract skip:', memErr);
      }
    })();

    // Persistência leve (sessão companion dedicada, opcional)
    let sessionId = session_id as string | undefined;
    try {
      if (!sessionId) {
        const { data: sess } = await supabaseAdmin
          .from('ia_chat_sessions')
          .insert({
            user_id: userId,
            session_title: `Companion: ${prompt.trim().slice(0, 40)}`,
          })
          .select('id')
          .single();
        sessionId = sess?.id;
      }
      if (sessionId) {
        await supabaseAdmin.from('ia_chat_messages').insert([
          { session_id: sessionId, role: 'user', content: prompt.trim() },
          { session_id: sessionId, role: 'assistant', content: replyText },
        ]);
      }
    } catch (persistErr) {
      console.warn('[Companion] persist skip:', persistErr);
    }

    return NextResponse.json({
      reply: replyText,
      commands,
      session_id: sessionId,
      navigation: navMatch
        ? {
            path: navMatch.route.path,
            label: navMatch.route.label,
            confidence: navMatch.confidence,
            matchedOn: navMatch.matchedOn,
          }
        : null,
      userId,
    });
  } catch (error: unknown) {
    console.error('[Companion API] Erro:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar comando do assistente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
