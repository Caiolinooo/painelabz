import { supabaseAdmin } from '@/lib/supabase';
import { msGraphClient } from './microsoft/client';
import { analyzeKPIs } from './agent-service';
import { getTeamMemberIds, canAccessUserData } from './permissions';

type IAUserRole = 'ADMIN' | 'GERENTE' | 'USER';

function normalizeRole(role?: string): IAUserRole {
  if (!role) return 'USER';
  const r = role.toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'GERENTE') return 'GERENTE';
  return 'USER';
}

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  departamento: string;
  role: string;
  reportsTo?: string;
  teamIds: string[];
}

export interface HolisticDataResult {
  perfil: UserProfile;
  emails: { recent: any[]; unread: number; total: number };
  calendario: { eventosHoje: any[]; eventosSemana: any[] };
  tarefas: { pendentes: any[]; total: number };
  arquivosOneDrive: { recentes: any[] };
  equipe?: { membros: UserProfile[]; stats: any };
  kpis: { analises: any[]; metas: any[] };
  portal: {
    reembolsos: { pendentes: number; total: number };
    ferias: { pendentes: number; aprovadas: number };
    avaliacoes: { pendentes: number; concluidas: number };
    epis: { ativos: number; vencidos: number };
    pontoHoje?: any;
  };
  microsoft365: {
    presenca?: string;
    chatsRecentes: number;
    reunioesHoje: number;
    grupos: number;
  };
}

export interface AggregationOptions {
  userId: string;
  targetUserId?: string;
  includeEmail?: boolean;
  includeCalendar?: boolean;
  includeTasks?: boolean;
  includeFiles?: boolean;
  includeTeam?: boolean;
  includeKPIs?: boolean;
  includePortalData?: boolean;
  includeMicrosoft365?: boolean;
  scope?: 'self' | 'team' | 'department' | 'all';
}

function getDefaultAggregationOptions(userId: string, role: string): AggregationOptions {
  const effectiveRole = normalizeRole(role);

  const base: AggregationOptions = {
    userId,
    scope: 'self',
    includeEmail: false,
    includeCalendar: true,
    includeTasks: false,
    includeFiles: false,
    includeKPIs: true,
    includePortalData: true,
    includeMicrosoft365: false,
  };

  if (effectiveRole === 'ADMIN') {
    return {
      ...base,
      includeEmail: true,
      includeCalendar: true,
      includeTasks: true,
      includeFiles: true,
      includeTeam: true,
      includeKPIs: true,
      includePortalData: true,
      includeMicrosoft365: true,
      scope: 'all',
    };
  }

  if (effectiveRole === 'GERENTE') {
    return {
      ...base,
      includeEmail: true,
      includeTeam: true,
      includeKPIs: true,
      scope: 'team',
    };
  }

  return base;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: user } = await supabaseAdmin
    .from('users_unified')
    .select('id, first_name, last_name, email, role, department, position')
    .eq('id', userId)
    .maybeSingle();

  if (!user) return null;

  const teamIds = await getTeamMemberIds(userId);

  return {
    id: user.id,
    nome: `${(user as any).first_name} ${(user as any).last_name}`,
    email: (user as any).email || '',
    cargo: (user as any).position || 'N/A',
    departamento: (user as any).department || 'N/A',
    role: (user as any).role || 'USER',
    teamIds,
  };
}

export async function collectHolisticData(
  options: Partial<AggregationOptions>
): Promise<HolisticDataResult> {
  const mergedOptions = options;

  const targetUserId = mergedOptions.targetUserId || mergedOptions.userId || '';
  const profile = await getUserProfile(targetUserId);
  if (!profile) throw new Error(`Usuário ${targetUserId} não encontrado`);

  const effectiveRole = normalizeRole(profile.role);

  const fullOpts = getDefaultAggregationOptions(mergedOptions.userId || targetUserId || '', effectiveRole);
  const opts = { ...fullOpts, ...mergedOptions };

  const result: HolisticDataResult = {
    perfil: profile,
    emails: { recent: [], unread: 0, total: 0 },
    calendario: { eventosHoje: [], eventosSemana: [] },
    tarefas: { pendentes: [], total: 0 },
    arquivosOneDrive: { recentes: [] },
    kpis: { analises: [], metas: [] },
    portal: {
      reembolsos: { pendentes: 0, total: 0 },
      ferias: { pendentes: 0, aprovadas: 0 },
      avaliacoes: { pendentes: 0, concluidas: 0 },
      epis: { ativos: 0, vencidos: 0 },
    },
    microsoft365: {
      chatsRecentes: 0,
      reunioesHoje: 0,
      grupos: 0,
    },
  };

  const promises: Promise<void>[] = [];

  if (opts.includeEmail && profile.email) {
    promises.push(
      (async () => {
        try {
          const msEmail = profile.email;
          const emails = await msGraphClient.listEmails(msEmail, 10);
          result.emails.recent = emails;
          result.emails.unread = emails.filter((e: any) => !e.isRead).length;
          result.emails.total = emails.length;
        } catch { /* silent fail for optional data */ }
      })()
    );
  }

  if (opts.includeCalendar && profile.email) {
    promises.push(
      (async () => {
        try {
          const hoje = new Date().toISOString().split('T')[0];
          const semana = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
          const eventos = await msGraphClient.listCalendarEvents(profile.email, hoje, semana, 20);
          result.calendario.eventosHoje = eventos.filter((e: any) =>
            e.start?.dateTime?.startsWith(hoje)
          );
          result.calendario.eventosSemana = eventos;
          result.microsoft365.reunioesHoje = result.calendario.eventosHoje.length;
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includeTasks && profile.email) {
    promises.push(
      (async () => {
        try {
          const lists = await msGraphClient.listTaskLists(profile.email);
          if (lists.length > 0) {
            const tasks = await msGraphClient.listTasks(profile.email, lists[0].id);
            result.tarefas.pendentes = tasks.filter((t: any) => t.status !== 'completed');
            result.tarefas.total = tasks.length;
          }
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includeFiles && profile.email) {
    promises.push(
      (async () => {
        try {
          const files = await msGraphClient.listOneDriveFiles(profile.email);
          result.arquivosOneDrive.recentes = files.slice(0, 5);
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includeTeam) {
    promises.push(
      (async () => {
        try {
          const teamMembers = await Promise.all(
            profile.teamIds.slice(0, 20).map(async (tid) => {
              const p = await getUserProfile(tid);
              return p;
            })
          );
          result.equipe = {
            membros: teamMembers.filter(Boolean) as UserProfile[],
            stats: {
              totalMembros: teamMembers.length,
              departamentos: [...new Set(teamMembers.filter(Boolean).map(m => m!.departamento))],
            },
          };
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includeKPIs) {
    promises.push(
      (async () => {
        try {
          const analyses = await analyzeKPIs(profile.departamento);
          result.kpis.analises = analyses;

          const { data: targets } = await supabaseAdmin
            .from('kpi_targets')
            .select('*')
            .eq('is_active', true)
            .or(`department.eq.${profile.departamento},department.is.null`);
          result.kpis.metas = (targets || []).map((t: any) => ({
            id: t.id,
            label: t.kpi_label,
            target: t.target_value,
            current: t.current_value,
            unit: t.unit,
            autoCalculated: t.auto_calculated,
          }));
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includePortalData) {
    promises.push(
      (async () => {
        try {
          const [
            { count: reembolsosTotal },
            { count: reembolsosPendentes },
            { count: feriasPendentes },
            { count: feriasAprovadas },
            { count: avaliacoesPendentes },
            { count: avaliacoesConcluidas },
            { count: episAtivos },
            { count: episVencidos },
          ] = await Promise.all([
            supabaseAdmin.from('Reimbursement').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
            supabaseAdmin.from('Reimbursement').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId).eq('status', 'pendente'),
            supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId).in('status', ['PENDING_LEADER', 'PENDING_MANAGER']),
            supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId).eq('status', 'APPROVED'),
            supabaseAdmin.from('evaluation_metrics').select('*', { count: 'exact', head: true }).eq('employee_id', targetUserId).is('overall_score', null),
            supabaseAdmin.from('evaluation_metrics').select('*', { count: 'exact', head: true }).eq('employee_id', targetUserId).not('overall_score', 'is', null),
            supabaseAdmin.from('epi_records').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId).eq('status', 'active'),
            supabaseAdmin.from('epi_records').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId).eq('status', 'expired'),
          ]);

          result.portal = {
            reembolsos: { pendentes: reembolsosPendentes || 0, total: reembolsosTotal || 0 },
            ferias: { pendentes: feriasPendentes || 0, aprovadas: feriasAprovadas || 0 },
            avaliacoes: { pendentes: avaliacoesPendentes || 0, concluidas: avaliacoesConcluidas || 0 },
            epis: { ativos: episAtivos || 0, vencidos: episVencidos || 0 },
          };
        } catch { /* silent */ }
      })()
    );
  }

  if (opts.includeMicrosoft365 && profile.email) {
    promises.push(
      (async () => {
        try {
          const [chats, grupos] = await Promise.all([
            msGraphClient.listTeamsChats(profile.email).catch(() => []),
            msGraphClient.listGroups(5).catch(() => []),
          ]);
          result.microsoft365.chatsRecentes = (chats || []).length;
          result.microsoft365.grupos = (grupos || []).length;
        } catch { /* silent */ }
      })()
    );
  }

  await Promise.allSettled(promises);

  return result;
}

export function formatHolisticDataForAI(result: HolisticDataResult): string {
  const p = result.perfil;
  let output = `\n=== PERFIL DO USUÁRIO ===
Nome: ${p.nome}
Email: ${p.email}
Cargo: ${p.cargo}
Departamento: ${p.departamento}
Nível de Acesso: ${p.role === 'ADMIN' ? 'Administrador' : p.role === 'GERENTE' ? 'Gerente' : 'Usuário'}
`;

  if (result.emails.recent.length > 0) {
    output += `\n=== EMAILS RECENTES (${result.emails.total} total, ${result.emails.unread} não lidos) ===\n`;
    for (const e of result.emails.recent.slice(0, 5)) {
      output += `- ${e.subject} (De: ${e.from?.emailAddress?.name || 'Desconhecido'}, ${e.receivedDateTime})\n`;
    }
  }

  if (result.calendario.eventosHoje.length > 0) {
    output += `\n=== EVENTOS DE HOJE (${result.calendario.eventosHoje.length}) ===\n`;
    for (const ev of result.calendario.eventosHoje) {
      output += `- ${ev.subject} (${ev.start?.dateTime} - ${ev.end?.dateTime})\n`;
    }
  }

  if (result.tarefas.pendentes.length > 0) {
    output += `\n=== TAREFAS PENDENTES (${result.tarefas.pendentes.length}) ===\n`;
    for (const t of result.tarefas.pendentes.slice(0, 5)) {
      output += `- ${t.title} (Importância: ${t.importance})\n`;
    }
  }

  if (result.kpis.analises.length > 0) {
    output += `\n=== KPIs CRÍTICOS (${result.kpis.analises.length}) ===\n`;
    for (const kpi of result.kpis.analises.slice(0, 5)) {
      output += `- ${kpi.kpiLabel}: ${kpi.currentValue}/${kpi.targetValue}${kpi.unit} (Gap: ${kpi.gap}%, Prioridade: ${kpi.priority})\n    Ação Sugerida: ${kpi.suggestedAction}\n`;
    }
  }

  if (result.kpis.metas.length > 0) {
    output += `\n=== METAS ATIVAS (${result.kpis.metas.length}) ===\n`;
    for (const m of result.kpis.metas) {
      const pct = m.current ? ((m.current / m.target) * 100).toFixed(1) : 'N/A';
      output += `- ${m.label}: ${m.current || 'N/A'}/${m.target} ${m.unit} (${pct}%)\n`;
    }
  }

  output += `\n=== RESUMO DO PORTAL ===
- Reembolsos: ${result.portal.reembolsos.pendentes} pendentes de ${result.portal.reembolsos.total} total
- Férias: ${result.portal.ferias.pendentes} pendentes, ${result.portal.ferias.aprovadas} aprovadas
- Avaliações: ${result.portal.avaliacoes.pendentes} pendentes, ${result.portal.avaliacoes.concluidas} concluídas
- EPIs: ${result.portal.epis.ativos} ativos, ${result.portal.epis.vencidos} vencidos
`;

  if (result.equipe) {
    output += `\n=== EQUIPE (${result.equipe.membros.length} membros) ===\n`;
    for (const m of result.equipe.membros) {
      output += `- ${m.nome} (${m.cargo}, ${m.departamento})\n`;
    }
  }

  output += `\n=== MICROSOFT 365 ===
- Reuniões Hoje: ${result.microsoft365.reunioesHoje}
- Chats Recentes: ${result.microsoft365.chatsRecentes}
- Grupos: ${result.microsoft365.grupos}
`;

  return output;
}

export async function collectHolisticForUser(
  requestingUserId: string,
  targetUserId?: string
): Promise<{ data: HolisticDataResult | null; aiContext: string; error?: string }> {
  try {
    const requestingProfile = await getUserProfile(requestingUserId);
    if (!requestingProfile) {
      return { data: null, aiContext: '', error: 'Usuário solicitante não encontrado' };
    }

    const effectiveRole = normalizeRole(requestingProfile.role);
    const dataTargetId = targetUserId || requestingUserId;

    if (targetUserId && targetUserId !== requestingUserId) {
      const hasAccess = await canAccessUserData(requestingUserId, effectiveRole as any, targetUserId);
      if (!hasAccess) {
        return { data: null, aiContext: '', error: 'Sem permissão para acessar dados deste usuário' };
      }
    }

    const opts = getDefaultAggregationOptions(requestingUserId, effectiveRole as string);
    const data = await collectHolisticData({
      ...opts,
      userId: requestingUserId,
      targetUserId: dataTargetId,
    });

    const aiContext = formatHolisticDataForAI(data);

    return { data, aiContext };
  } catch (err: any) {
    return { data: null, aiContext: '', error: err.message || 'Erro ao coletar dados holísticos' };
  }
}