/**
 * Serviço de Dashboard Inteligente da IA
 * Agrega dados de múltiplas fontes e gera KPIs, pendências e resumo
 */
import { supabaseAdmin } from '@/lib/supabase';
import { getEffectiveRole, getAccessibleUserIds } from './permissions';
import type {
  IADashboardData,
  IADashboardKPI,
  IADashboardPendency,
  IADashboardSummary,
  IAUserRole,
} from '@/types/ia';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

// =====================================================
// Cache
// =====================================================

/**
 * Buscar dashboard do cache
 */
async function getCachedDashboard(userId: string): Promise<IADashboardData | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ia_dashboard_cache')
      .select('data, generated_at, expires_at')
      .eq('user_id', userId)
      .eq('dashboard_type', 'summary')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Verificar se expirou
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data.data as unknown as IADashboardData;
  } catch {
    return null;
  }
}

/**
 * Salvar dashboard no cache
 */
async function cacheDashboard(userId: string, dashboardData: IADashboardData): Promise<void> {
  try {
    // Deletar cache antigo
    await supabaseAdmin
      .from('ia_dashboard_cache')
      .delete()
      .eq('user_id', userId)
      .eq('dashboard_type', 'summary');

    // Inserir novo
    await supabaseAdmin
      .from('ia_dashboard_cache')
      .insert({
        user_id: userId,
        dashboard_type: 'summary',
        data: dashboardData as any,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      });
  } catch (err) {
    console.error('[IA Dashboard] Erro ao cachear:', err);
  }
}

// =====================================================
// Buscas de dados
// =====================================================

async function fetchEvaluationKPIs(
  userId: string,
  role: IAUserRole,
  accessibleIds: string[] | null
): Promise<IADashboardKPI[]> {
  const kpis: IADashboardKPI[] = [];

  try {
    let query = supabaseAdmin
      .from('avaliacoes_desempenho')
      .select('nota_final, status, created_at, colaborador_id');

    if (accessibleIds) {
      query = query.in('colaborador_id', accessibleIds);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(50);

    if (data && data.length > 0) {
      const scores = data
        .filter((d: any) => d.nota_final != null)
        .map((d: any) => d.nota_final);

      if (scores.length > 0) {
        const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        kpis.push({
          label: role === 'USER' ? 'Sua Nota Média' : 'Nota Média da Equipe',
          value: Math.round(avg * 10) / 10,
          icon: '📊',
          trend: 'stable',
        });
      }

      kpis.push({
        label: 'Total de Avaliações',
        value: data.length,
        icon: '📝',
      });

      const pending = data.filter((d: any) => d.status === 'pending' || d.status === 'em_andamento');
      if (pending.length > 0) {
        kpis.push({
          label: 'Avaliações Pendentes',
          value: pending.length,
          icon: '⏳',
        });
      }
    }
  } catch {
    // tabela pode não existir
  }

  return kpis;
}

async function fetchVacationKPIs(
  userId: string,
  accessibleIds: string[] | null
): Promise<IADashboardKPI[]> {
  const kpis: IADashboardKPI[] = [];

  try {
    let query = supabaseAdmin
      .from('leave_requests')
      .select('status, start_date, end_date, user_id');

    if (accessibleIds) {
      query = query.in('user_id', accessibleIds);
    }

    const { data } = await query
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(20);

    if (data && data.length > 0) {
      const pending = data.filter((d: any) => d.status === 'pending');
      const approved = data.filter((d: any) => d.status === 'approved');

      if (pending.length > 0) {
        kpis.push({
          label: 'Férias Pendentes',
          value: pending.length,
          icon: '🏖️',
        });
      }

      if (approved.length > 0) {
        kpis.push({
          label: 'Férias Aprovadas (próximas)',
          value: approved.length,
          icon: '✅',
        });
      }
    }
  } catch {
    // tabela pode não existir
  }

  return kpis;
}

async function fetchReimbursementKPIs(
  userId: string,
  accessibleIds: string[] | null
): Promise<IADashboardKPI[]> {
  const kpis: IADashboardKPI[] = [];

  try {
let query = supabaseAdmin
      .from('Reimbursement')
      .select('status, valor_total, user_id');

    if (accessibleIds) {
      query = query.in('user_id', accessibleIds);
    }

    const { data } = await query
      .order('data', { ascending: false })
      .limit(30);

    if (data && data.length > 0) {
      const pending = data.filter((d: any) => d.status === 'PENDING');
      if (pending.length > 0) {
        const total = pending.reduce((s: number, d: any) => s + (d.valor_total || 0), 0);
        kpis.push({
          label: 'Reembolsos Pendentes',
          value: `${pending.length} (R$ ${Math.round(total).toLocaleString('pt-BR')})`,
          icon: '💰',
        });
      }
    }
  } catch {
    // tabela pode não existir
  }

  return kpis;
}

// =====================================================
// Pendências
// =====================================================

async function fetchPendencies(
  userId: string,
  role: IAUserRole,
  accessibleIds: string[] | null
): Promise<IADashboardPendency[]> {
  const pendencies: IADashboardPendency[] = [];

  // Avaliações pendentes
  try {
    let query = supabaseAdmin
      .from('avaliacoes_desempenho')
      .select('id, colaborador_id, status, created_at')
      .in('status', ['pending', 'em_andamento']);

    if (accessibleIds) {
      query = query.in('colaborador_id', accessibleIds);
    }

    const { data } = await query.limit(10);
    if (data) {
      for (const item of data) {
        pendencies.push({
          id: item.id,
          title: 'Avaliação de Desempenho',
          description: `Avaliação pendente para ${role === 'USER' ? 'você' : 'um colaborador'}`,
          priority: 'high',
          module: 'Avaliação',
        });
      }
    }
  } catch { /* tabela pode não existir */ }

  // Férias pendentes (apenas para gerentes/admin que precisam aprovar)
  if (role !== 'USER') {
    try {
      const { data } = await supabaseAdmin
        .from('leave_requests')
        .select('id, user_id, start_date, status')
        .eq('status', 'pending')
        .order('start_date', { ascending: true })
        .limit(5);

      if (data) {
        for (const item of data) {
          pendencies.push({
            id: item.id,
            title: 'Solicitação de Férias',
            description: `Férias a partir de ${item.start_date} aguardando aprovação`,
            priority: 'medium',
            deadline: item.start_date,
            module: 'Férias',
          });
        }
      }
    } catch { /* tabela pode não existir */ }
  }

  // Reembolsos pendentes (para quem aprova)
  if (role !== 'USER') {
    try {
      const { data } = await supabaseAdmin
        .from('Reimbursement')
        .select('id, status, valor_total, data')
        .eq('status', 'PENDING')
        .order('data', { ascending: true })
        .limit(5);

      if (data) {
        for (const item of data) {
          pendencies.push({
            id: item.id,
            title: 'Reembolso Pendente',
            description: `R$ ${(item.valor_total || 0).toLocaleString('pt-BR')} aguardando aprovação`,
            priority: 'medium',
            module: 'Reembolso',
          });
        }
      }
    } catch { /* tabela pode não existir */ }
  }

  return pendencies;
}

// =====================================================
// Resumo
// =====================================================

function buildSummary(
  userName: string,
  role: IAUserRole,
  kpis: IADashboardKPI[],
  pendencies: IADashboardPendency[]
): IADashboardSummary {
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) greeting = `Bom dia, ${userName}! ☀️`;
  else if (hour < 18) greeting = `Boa tarde, ${userName}! 🌤️`;
  else greeting = `Boa noite, ${userName}! 🌙`;

  const highlights: string[] = [];

  if (pendencies.length > 0) {
    highlights.push(`Você tem **${pendencies.length}** pendência(s) para resolver`);
  } else {
    highlights.push('Sem pendências no momento — tudo em dia! ✅');
  }

  const highPriority = pendencies.filter(p => p.priority === 'high');
  if (highPriority.length > 0) {
    highlights.push(`⚠️ **${highPriority.length}** item(ns) de alta prioridade`);
  }

  if (role === 'GERENTE') {
    highlights.push('Acesse o chat IA para consultar dados da sua equipe');
  } else if (role === 'ADMIN') {
    highlights.push('Painel completo — todos os departamentos disponíveis');
  }

  const quickStats = kpis.slice(0, 4); // top 4 KPIs

  return { greeting, highlights, quickStats };
}

// =====================================================
// API principal
// =====================================================

/**
 * Gerar dados completos do dashboard para um usuário
 */
export async function generateDashboard(
  userId: string,
  baseRole: string,
  forceRefresh = false
): Promise<{ data: IADashboardData; cached: boolean }> {
  // Verificar cache
  if (!forceRefresh) {
    const cached = await getCachedDashboard(userId);
    if (cached) {
      return { data: cached, cached: true };
    }
  }

  // Buscar perfil para nome
  const { data: profile } = await supabaseAdmin
    .from('users_unified')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const userName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : 'Usuário';

  const role = await getEffectiveRole(userId, baseRole);
  const accessibleIds = await getAccessibleUserIds(userId, role);

  // Buscar dados em paralelo
  const [evalKPIs, vacKPIs, reimbKPIs, pendencies] = await Promise.all([
    fetchEvaluationKPIs(userId, role, accessibleIds),
    fetchVacationKPIs(userId, accessibleIds),
    fetchReimbursementKPIs(userId, accessibleIds),
    fetchPendencies(userId, role, accessibleIds),
  ]);

  const allKPIs = [...evalKPIs, ...vacKPIs, ...reimbKPIs];
  const summary = buildSummary(userName, role, allKPIs, pendencies);

  const dashboardData: IADashboardData = {
    summary,
    kpis: allKPIs,
    pendencies,
    generatedAt: new Date().toISOString(),
  };

  // Cachear resultado
  await cacheDashboard(userId, dashboardData);

  return { data: dashboardData, cached: false };
}
