/**
 * Ferramentas do Módulo Férias
 * Portal ABZ - IA Tools
 */
import { supabaseAdmin } from '@/lib/supabase';
import type { IAUserRole } from '@/types/ia';
import { getEffectiveRole, getAccessibleUserIds, applyGlobalAccessFilter } from '../../permissions';
import { registerTool } from '../tools-registry';
import type { IATool, IAToolContext, IAToolResult } from '@/types/ia-global';

/**
 * Busca informações de férias de um funcionário
 */
const buscarFeriasTool: IATool = {
  id: 'ferias_buscar',
  name: 'buscar_ferias',
  description: 'Busca as informações de férias de um funcionário específico usando seu ID',
  module: 'ferias',
  definition: {
    name: 'buscar_ferias',
    description: 'Retorna informações de férias de um funcionário específico',
    parameters: {
      type: 'object',
      properties: {
        funcionario_id: {
          type: 'string',
          description: 'ID (UUID) do funcionário',
          required: true,
        },
        incluir_pendentes: {
          type: 'boolean',
          description: 'Incluir solicitações pendentes',
          required: false,
        },
      },
      required: ['funcionario_id'],
    },
  },
  requireModule: 'ferias',
  adminOnly: false,
  handler: async (args, context): Promise<IAToolResult> => {
    const { funcionario_id, incluir_pendentes = true } = args;

    try {
      let query = supabaseAdmin
        .from('leave_requests')
        .select('id, start_date, end_date, status, reason, created_at, user_id')
        .eq('user_id', funcionario_id as string);

      if (incluir_pendentes) {
        query = query.in('status', ['PENDING_LEADER', 'PENDING_MANAGER', 'APPROVED', 'REJECTED']);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return { success: false, error: `Erro ao buscar férias: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { 
          success: true, 
          data: { message: 'Nenhuma solicitação de férias encontrada', ferias: [] },
        };
      }

      return {
        success: true,
        data: {
          total: data.length,
          ferias: data.map(f => ({
            id: f.id,
            inicio: f.start_date,
            fim: f.end_date,
            status: f.status,
            motivo: f.reason,
            data_solicitacao: f.created_at,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  },
};

/**
 * Busca saldo de férias disponível
 */
const buscarSaldoFeriasTool: IATool = {
  id: 'ferias_saldo',
  name: 'buscar_saldo_ferias',
  description: 'Retorna o saldo de férias disponível de um funcionário',
  module: 'ferias',
  definition: {
    name: 'buscar_saldo_ferias',
    description: 'Retorna informações sobre dias de férias disponíveis e próximos períodos',
    parameters: {
      type: 'object',
      properties: {
        funcionario_id: {
          type: 'string',
          description: 'ID (UUID) do funcionário',
          required: true,
        },
      },
      required: ['funcionario_id'],
    },
  },
  requireModule: 'ferias',
  adminOnly: false,
  handler: async (args): Promise<IAToolResult> => {
    const { funcionario_id } = args;

    try {
      // Buscar saldo do banco
      const { data: balanceData } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('user_id', funcionario_id as string)
        .single();

      // Contar dias disponíveis das solicitações aprovadas futuras
      const { data: approvedLeaves } = await supabaseAdmin
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('user_id', funcionario_id as string)
        .eq('status', 'approved')
        .gte('end_date', new Date().toISOString().split('T')[0]);

      let diasDisponiveis = balanceData?.total_days || 30;
      
      if (approvedLeaves && approvedLeaves.length > 0) {
        const diasUsados = approvedLeaves.reduce((total: number, leave: any) => {
          const inicio = new Date(leave.start_date);
          const fim = new Date(leave.end_date);
          const diff = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return total + diff;
        }, 0);
        diasDisponiveis -= diasUsados;
      }

      return {
        success: true,
        data: {
          saldo_atual: Math.max(0, diasDisponiveis),
          saldo_total: balanceData?.total_days || 30,
          saldo_utilizado: (balanceData?.total_days || 30) - Math.max(0, diasDisponiveis),
          mensagem: diasDisponiveis > 0 
            ? `O funcionário tem ${diasDisponiveis} dias de férias disponíveis`
            : 'O funcionário não tem dias de férias disponíveis no momento',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao buscar saldo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  },
};

/**
 * Busca pendências de aprovação para gerentes
 */
const buscarPendenciasFeriasTool: IATool = {
  id: 'ferias_pendencias',
  name: 'buscar_pendencias_ferias',
  description: 'Retorna solicitações de férias pendentes de aprovação',
  module: 'ferias',
  definition: {
    name: 'buscar_pendencias_ferias',
    description: 'Retorna todas as solicitações de férias que estão aguardando aprovação',
    parameters: {
      type: 'object',
      properties: {
        days_limit: {
          type: 'number',
          description: 'Limite de dias para buscar pendências',
          required: false,
        },
      },
      required: [],
    },
  },
  requireModule: 'ferias',
  adminOnly: false,
  handler: async (args, context): Promise<IAToolResult> => {
    const { days_limit = 30 } = args as { days_limit?: number };

    try {
      let baseQuery = supabaseAdmin
        .from('leave_requests')
        .select('*, user:users_unified(first_name, last_name, department)')
        .in('status', ['PENDING_LEADER', 'PENDING_MANAGER'])
        .gte('created_at', new Date(Date.now() - days_limit * 24 * 60 * 60 * 1000).toISOString());

      const accessFilter = await applyGlobalAccessFilter(baseQuery, context.userId, context.userRole, 'user_id');
      if (!accessFilter.hasAccess) {
        return { success: false, error: accessFilter.error || 'Acesso negado' };
      }

      const { data, error } = await accessFilter.query.order('created_at', { ascending: true });

      if (error) {
        return { success: false, error: `Erro: ${error.message}` };
      }

      return {
        success: true,
        data: {
          total_pendencias: data?.length || 0,
           pendencias: data?.map((p: any) => ({
            id: p.id,
            funcionario: p.user ? `${p.user.first_name} ${p.user.last_name}` : 'Desconhecido',
            departamento: p.user?.department || 'N/A',
            inicio: p.start_date,
            fim: p.end_date,
            dias: Math.ceil((new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
            motivo: p.reason,
            data_solicitacao: p.created_at,
          })) || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  },
};

/**
 * Registra todas as ferramentas do módulo Férias
 */
export function registerTools(): void {
  registerTool(buscarFeriasTool);
  registerTool(buscarSaldoFeriasTool);
  registerTool(buscarPendenciasFeriasTool);
  console.log('[IA Tools] Ferias module loaded');
}