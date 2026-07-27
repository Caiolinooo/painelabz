/**
 * API: /api/ia/companion
 * POST — Processa comandos rápidos do AI Companion Widget para controle do portal.
 * Para consultas complexas, o widget deve usar /api/ia/chat que tem tools, streaming e sessions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import type { AICommandPayload } from '@/lib/ia/portal-action-bus';

export const dynamic = 'force-dynamic';

const NAV_RULES: Array<{ keys: string[]; target: string; label: string; reply: string }> = [
  { keys: ['ferias', 'vacation'], target: '/ferias?tab=approvals', label: 'Navegando para o Portal de Férias...', reply: 'Redirecionando você para a tela de Férias e Aprovações.' },
  { keys: ['reembolso', 'reembolsos'], target: '/reembolso', label: 'Abrindo módulo de Reembolso...', reply: 'Navegando para o módulo de Reembolsos.' },
  { keys: ['aso', 'tripulante', 'embarque', 'gestao-tripulantes'], target: '/department/gestao-tripulantes', label: 'Abrindo Gestão de Tripulantes...', reply: 'Redirecionando para Gestão de Tripulantes.' },
  { keys: ['e-social', 'esocial', 'cat'], target: '/department/e-social', label: 'Abrindo e-Social...', reply: 'Navegando para o módulo e-Social.' },
  { keys: ['academy', 'curso', 'treinamento'], target: '/academy', label: 'Abrindo Academy...', reply: 'Navegando para a Academy.' },
  { keys: ['epi'], target: '/epi', label: 'Abrindo EPI...', reply: 'Navegando para o módulo de EPI.' },
  { keys: ['ponto', 'presenca'], target: '/ponto', label: 'Abrindo Ponto...', reply: 'Navegando para o módulo de Ponto.' },
  { keys: ['compra', 'compras', 'suprimento'], target: '/compras', label: 'Abrindo Compras...', reply: 'Navegando para Compras/Suprimentos.' },
  { keys: ['calendario', 'agenda', 'evento'], target: '/calendario', label: 'Abrindo Calendário...', reply: 'Navegando para o Calendário.' },
  { keys: ['kpi', 'indicador'], target: '/dashboard', label: 'Abrindo Dashboard (KPIs)...', reply: 'Abrindo o Dashboard para visualizar indicadores.' },
  { keys: ['admin', 'painel admin'], target: '/admin', label: 'Abrindo Painel Administrativo...', reply: 'Acessando o Painel Admin.' },
  { keys: ['dashboard', 'inicio', 'home'], target: '/dashboard', label: 'Voltando ao Dashboard...', reply: 'Redirecionando para o Dashboard.' },
  { keys: ['ia', 'assistente', 'chat ia'], target: '/ia', label: 'Abrindo Chat IA...', reply: 'Abrindo o Chat IA completo.' },
];

export async function POST(req: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(req);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, commands: incomingCommands } = body;

    // Permite o chat/tool `navegar_portal` despachar commands prontos
    if (Array.isArray(incomingCommands) && incomingCommands.length > 0) {
      return NextResponse.json({
        reply: body.reply || 'Executando navegação no portal...',
        commands: incomingCommands as AICommandPayload[],
        userId: tokenResult.payload.userId,
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt é obrigatório.' }, { status: 400 });
    }

    const lowerPrompt = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const commands: AICommandPayload[] = [];
    let replyText = '';

    const matched = NAV_RULES.find(rule => rule.keys.some(k => lowerPrompt.includes(k)));
    if (matched) {
      commands.push({
        action: 'NAVIGATE',
        target: matched.target,
        label: matched.label,
      });
      replyText = matched.reply;
    } else {
      replyText =
        'Entendi sua solicitação. Para consultas complexas com dados (KPIs, e-mails, Teams), use o Chat IA completo — ele pesquisa pendências e comunicação correlata automaticamente.';
    }

    return NextResponse.json({
      reply: replyText,
      commands,
      userId: tokenResult.payload.userId,
    });
  } catch (error: unknown) {
    console.error('[Companion API] Erro no processamento:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar comando do assistente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
