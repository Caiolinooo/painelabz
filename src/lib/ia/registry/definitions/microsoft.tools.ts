/**
 * Ferramentas Microsoft Graph (non-admin + pesquisa)
 */
import { registerTool } from '../tools-registry';
import type { IATool, IAToolResult } from '@/types/ia-global';
import { msGraphClient, resolveGraphLimit } from '../../microsoft/client';
import { supabaseAdmin } from '@/lib/supabase';
import { collectKpiCommunicationSignals } from '../../kpi-comms-signals';

async function resolveOwnEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users_unified')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return data?.email || null;
}

const meusEmailsTool: IATool = {
  id: 'ms_meus_emails',
  name: 'meus_emails',
  description: 'Lista/pesquisa e-mails da própria caixa do usuário',
  module: 'microsoft',
  adminOnly: false,
  definition: {
    name: 'meus_emails',
    description: 'E-mails da própria caixa com filtros flexíveis',
    parameters: {
      type: 'object',
      properties: {
        consulta: { type: 'string', description: 'Texto livre', required: false },
        de: { type: 'string', description: 'Remetente', required: false },
        limite: { type: 'number', description: 'Limite (0=máx)', required: false },
      },
      required: [],
    },
  },
  handler: async (args, ctx): Promise<IAToolResult> => {
    const email = await resolveOwnEmail(ctx.userId);
    if (!email) return { success: false, error: 'E-mail não cadastrado' };
    const emails = await msGraphClient.searchEmails(email, args.consulta as string | undefined, {
      from: args.de as string | undefined,
      top: resolveGraphLimit(args.limite as number | undefined, 50),
    });
    return { success: true, data: { total: emails.length, emails } };
  },
};

const minhasConversasTeamsTool: IATool = {
  id: 'ms_minhas_conversas_teams',
  name: 'minhas_conversas_teams',
  description: 'Chats/mensagens Teams do usuário',
  module: 'microsoft',
  adminOnly: false,
  definition: {
    name: 'minhas_conversas_teams',
    description: 'Lista chats ou pesquisa mensagens Teams',
    parameters: {
      type: 'object',
      properties: {
        consulta: { type: 'string', description: 'Filtro de texto', required: false },
        limite: { type: 'number', description: 'Limite', required: false },
      },
      required: [],
    },
  },
  handler: async (args, ctx): Promise<IAToolResult> => {
    const email = await resolveOwnEmail(ctx.userId);
    if (!email) return { success: false, error: 'E-mail não cadastrado' };
    if (args.consulta) {
      const mensagens = await msGraphClient.searchTeamsMessages(email, {
        consulta: String(args.consulta),
        limite: resolveGraphLimit(args.limite as number | undefined, 40),
      });
      return { success: true, data: { mensagens } };
    }
    const chats = await msGraphClient.listTeamsChats(email);
    return { success: true, data: { chats } };
  },
};

const sinaisKpiCommsTool: IATool = {
  id: 'ms_sinais_kpi_comms',
  name: 'buscar_sinais_kpi_comunicacao',
  description: 'Sinais de e-mail/Teams ligados a KPIs',
  module: 'microsoft',
  adminOnly: false,
  definition: {
    name: 'buscar_sinais_kpi_comunicacao',
    description: 'Varre e-mail e Teams por pendências/conclusões de KPI',
    parameters: {
      type: 'object',
      properties: {
        dias: { type: 'number', description: 'Janela em dias', required: false },
        limite: { type: 'number', description: 'Limite', required: false },
      },
      required: [],
    },
  },
  handler: async (args, ctx): Promise<IAToolResult> => {
    const email = await resolveOwnEmail(ctx.userId);
    if (!email) return { success: false, error: 'E-mail não cadastrado' };
    const data = await collectKpiCommunicationSignals({
      emailUsuario: email,
      dias: Number(args.dias) || 14,
      limite: resolveGraphLimit(args.limite as number | undefined, 30),
    });
    return { success: true, data };
  },
};

export async function registerTools() {
  registerTool(meusEmailsTool);
  registerTool(minhasConversasTeamsTool);
  registerTool(sinaisKpiCommsTool);
  console.log('[IA Tools] Microsoft loaded (3 tools)');
}
