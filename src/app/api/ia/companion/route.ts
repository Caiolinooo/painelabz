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
  ensureNavigationCommand,
  getDashboardNavMatch,
  isNavigationIntent,
  isTourIntent,
  resolvePortalNavigation,
} from '@/lib/ia/portal-navigation';
import type { LLMMessage } from '@/types/ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const COMPANION_SYSTEM = `Você é o **ABZ Companion**, assistente flutuante do Portal ABZ Group.

## Papel
- Você ESTÁ conectado à IA real do portal — use tools para dados e navegação. Nunca diga que é um atalho genérico ou que o usuário deve "usar o chat completo".
- Respostas curtas (2–6 frases), português do Brasil, cordial e objetivo.

## Navegação (OBRIGATÓRIO)
- Para abrir módulos, chame a tool \`navegar_portal\` com o destino (aceita typos: feririas, reemboso, tripuentes…).
- NUNCA diga que vai abrir/levar o usuário a um módulo sem chamar \`navegar_portal\` na mesma resposta.
- Se escrever "vou te levar", "abrindo", "vamos começar pela Home/Dashboard", etc., a tool DEVE ter sido chamada.
- Tours / "modulo a modulo" / "guia do portal": SEMPRE chame \`navegar_portal\` com destino \`dashboard\` (primeiro hop) antes de descrever o roteiro.
- Confirme na resposta para onde está levando o usuário (só depois da tool).
- Intenções: "abre ferias", "ir pra reembolso", "quero ver tripulantes", "e-social", "kpi" → /kpi, "me leva ao dashboard" → /dashboard, "minhas férias".
- Contextos compostos: "aprovar férias" → férias/aprovações; "estoque epi" → EPI; "meus cursos" → Academy.

## Consultas
- Use tools para férias, reembolsos, KPIs, e-mails, calendário, Teams, EPI, Academy, tripulantes, etc.
- Se a pergunta for ambígua, faça UMA pergunta curta OU escolha o destino mais provável e diga o que fez.

## Memória
- Use \`salvar_memoria_usuario\` quando o usuário pedir para lembrar algo ou revelar preferências duráveis.
- Fatos importantes já salvos aparecem no contexto — use-os; não invente.

## Skills (procedimentos Hermes-like)
- Use \`criar_skill_usuario\` quando o usuário ensinar um fluxo reutilizável OU você descobrir um procedimento multi-passos útil no portal.
- Skills listadas no contexto: chame \`usar_skill\` pelo nome quando a tarefa bater.
- Use \`listar_skills_usuario\` / \`esquecer_skill\` sob pedido. Não armazene senhas/tokens.

## Quadro branco KPI (OBRIGATÓRIO quando o usuário quiser alterar /kpi)
- Para mudar o que aparece em /kpi: chame \`criar_quadro_kpi\` ou \`render_dashboard\` e depois \`abrir_quadro_kpi\` (emite OPEN_KPI_BOARD + NAVIGATE /kpi).
- Harness por role (server-side): veja o bloco “Harness KPI” injetado abaixo — ADMIN tem liberdade máxima (html_sandbox); USER/MANAGER só conteúdo profissional.
- Widgets: metric | table | list | chart | markdown (+ html_sandbox só ADMIN). dataSource só tools allowlisted do papel.
- USER/MANAGER pedem minigame/HTML/JS: recuse com o harness; ofereça quadro de KPIs de trabalho; NÃO dumping HTML; NÃO “salve .html”.
- ADMIN pede minigame/HTML: monte widget \`html_sandbox\` com \`data.srcdoc\` no quadro + abrir /kpi (iframe sandboxed). NUNCA peça salvar .html fora do portal.
- NUNCA diga que “não consegue injetar” no KPI.

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
    const tourIntent = isTourIntent(prompt);
    const navIntent = isNavigationIntent(prompt);
    let navMatch = resolvePortalNavigation(prompt);
    // Tour sem destino explícito → primeiro hop = Dashboard/Home
    if (tourIntent && (!navMatch || navMatch.score < 0.78)) {
      navMatch = getDashboardNavMatch();
    }
    // Limiar 0.78 com verbo/tour; 0.9 se for frase sem intenção clara
    const fuzzyThreshold = navIntent || tourIntent ? 0.78 : 0.9;
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
            ? `\nSugestão de navegação detectada: ${navMatch.route.label} → ${navMatch.route.path} (score ${navMatch.score.toFixed(2)}, match "${navMatch.matchedOn}"). Você DEVE chamar navegar_portal com este destino (não só descrever).`
            : '') +
          (tourIntent
            ? `\nTour do portal pedido: chame navegar_portal(destino="dashboard") AGORA como primeiro passo, depois descreva o roteiro.`
            : '') +
          (await (async () => {
            try {
              const { buildUserMemoryPromptBlock } = await import('@/lib/ia/user-memory');
              const { buildUserSkillsPromptBlock } = await import('@/lib/ia/user-skills');
              const { buildKpiBoardsPromptBlock } = await import('@/lib/ia/kpi-board');
              const [mem, skills, boards] = await Promise.all([
                buildUserMemoryPromptBlock(userId),
                buildUserSkillsPromptBlock(userId),
                buildKpiBoardsPromptBlock(userId, userRole),
              ]);
              return `${mem || ''}${skills || ''}${boards || ''}`;
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

    // Safety net: resposta prometeu navegação / tour sem NAVIGATE → injeta comando
    const injected = ensureNavigationCommand({
      prompt,
      reply: replyText,
      commands,
      navMatch,
    });
    if (injected && !navMatch) {
      navMatch = injected;
    }

    if (!replyText && commands.length > 0 && navMatch) {
      replyText = `Abrindo ${navMatch.route.label} para você.`;
    }
    if (!replyText) {
      replyText = 'Pronto — como posso ajudar?';
    }

    // Extrai / salva LTM + skills (Hermes-like) — não bloqueia resposta
    void (async () => {
      try {
        const { extractAndSaveMemoriesFromTurn } = await import('@/lib/ia/user-memory');
        const { extractAndSaveSkillsFromTurn } = await import('@/lib/ia/user-skills');
        await Promise.all([
          extractAndSaveMemoriesFromTurn({
            userId,
            userMessage: prompt.trim(),
            assistantReply: replyText,
            source: 'companion',
            sessionId: session_id,
          }),
          extractAndSaveSkillsFromTurn({
            userId,
            userMessage: prompt.trim(),
            assistantReply: replyText,
            source: 'companion-auto',
          }),
        ]);
      } catch (memErr) {
        console.warn('[Companion] memory/skill extract skip:', memErr);
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
