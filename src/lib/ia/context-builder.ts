/**
 * Context Builder para o sistema de IA
 * Monta o system prompt e contexto do usuário para enviar ao LLM
 */
import { supabaseAdmin } from '@/lib/supabase';
import { getEffectiveRole, getTeamMemberIds } from './permissions';
import { getIAConfig } from './client';
import type { IAUserContext, IAUserRole, LLMMessage, IAChatMessage } from '@/types/ia';

const MAX_HISTORY_MESSAGES = 16; // últimas 16 mensagens (~8 pares user/assistant)
const MAX_CONTEXT_TOKENS_ESTIMATE = 6000; // chars como proxy de tokens

/**
 * Buscar dados do perfil do usuário
 */
async function getUserProfile(userId: string): Promise<{
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  department: string;
  position: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('users_unified')
    .select('first_name, last_name, email, phone_number, role, department, position')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Buscar dados de avaliações do usuário
 */
async function getUserEvaluations(userId: string): Promise<{
  count: number;
  avgScore: number | null;
  lastPeriod: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .select('nota_final, periodo_id')
      .eq('colaborador_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return { count: 0, avgScore: null, lastPeriod: null };
    }

    const scores = data.filter((d: any) => d.nota_final != null).map((d: any) => d.nota_final);
    const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;

    return {
      count: data.length,
      avgScore: avg ? Math.round(avg * 100) / 100 : null,
      lastPeriod: data[0]?.periodo_id || null,
    };
  } catch {
    return { count: 0, avgScore: null, lastPeriod: null };
  }
}

/**
 * Buscar dados de férias do usuário
 */
async function getUserVacations(userId: string): Promise<{
  pending: number;
  upcoming: Array<{ start: string; end: string; status: string }>;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('start_date, end_date, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(5);

    if (error || !data) return { pending: 0, upcoming: [] };

    return {
      pending: data.filter((d: any) => d.status === 'pending').length,
      upcoming: data.map((d: any) => ({
        start: d.start_date,
        end: d.end_date,
        status: d.status,
      })),
    };
  } catch {
    return { pending: 0, upcoming: [] };
  }
}

/**
 * Buscar dados de reembolsos do usuário
 */
async function getUserReimbursements(userId: string): Promise<{
  pending: number;
  totalApproved: number;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('reimbursement_requests')
      .select('status, total_amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return { pending: 0, totalApproved: 0 };

    const pending = data.filter((d: any) => d.status === 'pending').length;
    const totalApproved = data
      .filter((d: any) => d.status === 'approved')
      .reduce((sum: number, d: any) => sum + (d.total_amount || 0), 0);

    return { pending, totalApproved: Math.round(totalApproved * 100) / 100 };
  } catch {
    return { pending: 0, totalApproved: 0 };
  }
}

/**
 * Buscar e-mails recentes do Microsoft Graph API
 */
async function getUserEmails(userId: string): Promise<Array<{subject: string; from: string; date: string}>> {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'microsoft_exchange')
      .single();

    if (error || !integration || !integration.access_token) return [];

    let accessToken = integration.access_token;
    
    // Simples verificação de expiração (se existir expires_at e for no passado)
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      // Renovar token
      const MS_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || '';
      const MS_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || '';
      const MS_TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';
      
      const params = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      });

      const tokenRes = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.error && tokenData.access_token) {
        accessToken = tokenData.access_token;
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        await supabaseAdmin.from('user_integrations').update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || integration.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }).eq('id', integration.id);
      } else {
        return [];
      }
    }

    // Buscar e-mails
    const res = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=5&$select=subject,from,receivedDateTime', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok) return [];

    const mailData = await res.json();
    return (mailData.value || []).map((msg: any) => ({
      subject: msg.subject,
      from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Desconhecido',
      date: new Date(msg.receivedDateTime).toLocaleString('pt-BR')
    }));

  } catch {
    return [];
  }
}

/**
 * Construir contexto completo do usuário
 */
export async function buildUserContext(userId: string): Promise<IAUserContext | null> {
  const profile = await getUserProfile(userId);
  if (!profile) return null;

  const effectiveRole = await getEffectiveRole(userId, profile.role);

  const [evaluations, vacations, reimbursements, recentEmails] = await Promise.all([
    getUserEvaluations(userId),
    getUserVacations(userId),
    getUserReimbursements(userId),
    getUserEmails(userId),
  ]);

  const context: IAUserContext = {
    userId,
    userName: `${profile.first_name} ${profile.last_name}`.trim(),
    role: effectiveRole,
    department: profile.department || 'Não definido',
    position: profile.position || 'Não definido',
    profile: {
      email: profile.email,
      phone: profile.phone_number,
    },
    evaluations,
    vacations,
    reimbursements,
    recentEmails,
  };

  // Se gerente, buscar IDs da equipe
  if (effectiveRole === 'GERENTE') {
    context.teamMemberIds = await getTeamMemberIds(userId);
  }

  return context;
}

/**
 * Gerar system prompt baseado no contexto do usuário
 */
export function buildSystemPrompt(userContext: IAUserContext, customPrompt?: string): string {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let prompt = `Você é o Assistente IA do Portal ABZ Group, um sistema corporativo de gestão de RH.
Hoje é ${today}.

## Sobre você
- Seu nome é **ABZ Assistant**
- Você ajuda funcionários da ABZ Group com informações sobre seu trabalho
- Responda sempre em Português Brasileiro
- Seja profissional, objetivo e amigável
- Use markdown para formatar respostas quando útil (listas, negrito, tabelas)
- Nunca invente dados — use apenas as informações fornecidas no contexto

## Usuário atual
- **Nome:** ${userContext.userName}
- **Cargo:** ${userContext.position}
- **Departamento:** ${userContext.department}
- **Nível de acesso:** ${userContext.role}`;

  // Adicionar dados de avaliações
  if (userContext.evaluations && userContext.evaluations.count > 0) {
    prompt += `\n\n## Avaliações de Desempenho
- Total de avaliações: ${userContext.evaluations.count}`;
    if (userContext.evaluations.avgScore) {
      prompt += `\n- Nota média: ${userContext.evaluations.avgScore}`;
    }
    if (userContext.evaluations.lastPeriod) {
      prompt += `\n- Último período avaliado: ${userContext.evaluations.lastPeriod}`;
    }
  }

  // Adicionar dados de férias
  if (userContext.vacations) {
    const { pending, upcoming } = userContext.vacations;
    if (pending > 0 || upcoming.length > 0) {
      prompt += `\n\n## Férias`;
      if (pending > 0) prompt += `\n- Solicitações pendentes: ${pending}`;
      if (upcoming.length > 0) {
        prompt += `\n- Próximas férias:`;
        for (const v of upcoming) {
          prompt += `\n  - ${v.start} a ${v.end} (${v.status === 'approved' ? 'aprovada' : 'pendente'})`;
        }
      }
    }
  }

  // Adicionar dados de reembolsos
  if (userContext.reimbursements) {
    const { pending, totalApproved } = userContext.reimbursements;
    if (pending > 0 || totalApproved > 0) {
      prompt += `\n\n## Reembolsos`;
      if (pending > 0) prompt += `\n- Pendentes: ${pending}`;
      if (totalApproved > 0) prompt += `\n- Total aprovado recente: R$ ${totalApproved.toLocaleString('pt-BR')}`;
    }
  }

  // Adicionar dados de e-mails
  if (userContext.recentEmails && userContext.recentEmails.length > 0) {
    prompt += `\n\n## E-mails Recentes (Microsoft 365)\nO usuário conectou sua caixa de entrada. Aqui estão os 5 e-mails mais recentes recebidos:`;
    userContext.recentEmails.forEach(email => {
      prompt += `\n- De: ${email.from} | Assunto: "${email.subject}" | Data: ${email.date}`;
    });
  }

  // Adicionar informação sobre equipe (gerente)
  if (userContext.role === 'GERENTE' && userContext.teamMemberIds) {
    prompt += `\n\n## Equipe
- Você gerencia ${userContext.teamMemberIds.length} colaborador(es)
- Você pode perguntar sobre dados da sua equipe`;
  }

  if (userContext.role === 'ADMIN') {
    prompt += `\n\n## Acesso Administrativo
- Você tem acesso total ao sistema
- Pode consultar dados de qualquer funcionário ou departamento`;
  }

  // Adicionar prompt customizado do admin
  if (customPrompt) {
    prompt += `\n\n## Instruções adicionais\n${customPrompt}`;
  }

  return prompt;
}

/**
 * Buscar histórico de mensagens da sessão para incluir no contexto
 */
export async function getSessionHistory(sessionId: string): Promise<LLMMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('ia_chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (error || !data) return [];

  // Limitar por tamanho estimado de contexto
  const messages: LLMMessage[] = [];
  let totalChars = 0;

  // Processar do mais recente para o mais antigo para priorizar mensagens recentes
  const reversed = [...data].reverse();
  for (const msg of reversed) {
    totalChars += msg.content.length;
    if (totalChars > MAX_CONTEXT_TOKENS_ESTIMATE) break;
    messages.unshift({ role: msg.role as 'user' | 'assistant', content: msg.content });
  }

  return messages;
}

/**
 * Montar array completo de mensagens para enviar ao LLM
 * system prompt + histórico + mensagem nova
 */
export async function buildChatMessages(
  userId: string,
  sessionId: string,
  newMessage: string
): Promise<LLMMessage[]> {
  const [userContext, history, config] = await Promise.all([
    buildUserContext(userId),
    getSessionHistory(sessionId),
    getIAConfig(),
  ]);

  if (!userContext) {
    throw new Error('Usuário não encontrado');
  }

  const systemPrompt = buildSystemPrompt(userContext, config?.system_prompt || undefined);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: newMessage },
  ];

  return messages;
}
