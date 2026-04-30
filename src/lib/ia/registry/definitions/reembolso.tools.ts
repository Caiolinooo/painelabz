/**
 * Ferramentas do Módulo Reembolso
 * Portal ABZ - IA Tools
 */
import { supabaseAdmin } from '@/lib/supabase';
import { registerTool } from '../tools-registry';
import type { IATool } from '@/types/ia-global';

/**
 * Busca reembolsos de um funcionário
 */
const buscarReembolsosTool: IATool = {
  id: 'reembolso_buscar',
  name: 'buscar_reembolsos',
  description: 'Busca o histórico de solicitações de reembolso de um funcionário',
  module: 'reembolso',
  definition: {
    name: 'buscar_reembolsos',
    description: 'Retorna histórico de solicitações de reembolso',
    parameters: {
      type: 'object',
      properties: {
        funcionario_id: { type: 'string', description: 'ID do funcionário', required: true },
        status: { type: 'string', description: 'Filtrar por status (pending, approved, rejected)', required: false },
      },
      required: ['funcionario_id'],
    },
  },
  requireModule: 'reembolsos',
  adminOnly: false,
  handler: async (args) => {
    const { funcionario_id, status } = args as { funcionario_id: string; status?: string };
    
    try {
      let query = supabaseAdmin
        .from('Reimbursement')
        .select('id, status, valor_total, descricao, data, user_id')
        .eq('user_id', funcionario_id);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('data', { ascending: false }).limit(20);

      if (error) return { success: false, error: error.message };
      
      const total = data?.length || 0;
      const pendentes = data?.filter(r => r.status === 'pending').length || 0;
      const aprovados = data?.filter(r => r.status === 'approved').length || 0;
      const rejeitados = data?.filter(r => r.status === 'rejected').length || 0;

      return {
        success: true,
        data: {
          total,
          pendentes,
          aprovados,
          rejeitados,
          reembolsos: data?.map(r => ({
            id: r.id,
            status: r.status,
            valor: r.valor_total,
            descricao: r.descricao,
            data: r.data,
          })) || [],
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

/**
 * Busca pendências de reembolso para aprovação
 */
const buscarPendenciasReembolsoTool: IATool = {
  id: 'reembolso_pendencias',
  name: 'buscar_pendencias_reembolso',
  description: 'Retorna solicitações de reembolso pendentes de aprovação',
  module: 'reembolso',
  definition: {
    name: 'buscar_pendencias_reembolso',
    description: 'Retorna reembolsos aguardando aprovação',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  requireModule: 'reembolsos',
  adminOnly: false,
  handler: async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('Reimbursement')
        .select('*, user:users_unified(first_name, last_name, department)')
        .eq('status', 'pending')
        .order('data', { ascending: true })
        .limit(20);

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        data: {
          total_pendencias: data?.length || 0,
          pendencias: data?.map(r => ({
            id: r.id,
            funcionario: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Desconhecido',
            departamento: r.user?.department || 'N/A',
            valor: r.valor_total,
            descricao: r.descricao,
            data_solicitacao: r.data,
          })) || [],
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

/**
 * Busca detalhes de um reembolso específico
 */
const buscarDetalheReembolsoTool: IATool = {
  id: 'reembolso_detalhes',
  name: 'buscar_detalhes_reembolso',
  description: 'Retorna detalhes completos de uma solicitação de reembolso',
  module: 'reembolso',
  definition: {
    name: 'buscar_detalhes_reembolso',
    description: 'Retorna detalhes de um reembolso específico',
    parameters: {
      type: 'object',
      properties: {
        reembolso_id: { type: 'string', description: 'ID do reembolso', required: true },
      },
      required: ['reembolso_id'],
    },
  },
  requireModule: 'reembolsos',
  adminOnly: false,
  handler: async (args) => {
    const { reembolso_id } = args as { reembolso_id: string };
    
    try {
      const { data, error } = await supabaseAdmin
        .from('Reimbursement')
        .select('*')
        .eq('id', reembolso_id)
        .single();

      if (error || !data) return { success: false, error: 'Reembolso não encontrado' };

      return {
        success: true,
        data: {
          id: data.id,
          status: data.status,
          valor: data.valor_total,
          descricao: data.descricao,
          data_criacao: data.data,
          data_aprovacao: data.approvedAt,
          aprovado_por: data.approvedBy,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export function registerTools() {
  registerTool(buscarReembolsosTool);
  registerTool(buscarPendenciasReembolsoTool);
  registerTool(buscarDetalheReembolsoTool);
  console.log('[IA Tools] Reembolso module loaded');
}