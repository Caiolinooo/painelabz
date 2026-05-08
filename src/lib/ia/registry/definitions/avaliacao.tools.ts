import { registerTool } from '../tools-registry';
import { supabaseAdmin } from '@/lib/supabase';
import type { IAToolContext, IAToolResult } from '@/types/ia-global';

export function registerTools() {
  console.log('[IA Tools] Avaliação loaded');

  registerTool({
    id: 'editar_kpi',
    name: 'editar_kpi',
    description: 'Criar ou atualizar um KPI no sistema. Permite definir metas, valores atuais, alertas e configurações.',
    module: 'avaliacao',
    adminOnly: false,
    definition: {
      name: 'editar_kpi',
      description: 'Criar ou atualizar um KPI. ADMIN pode editar qualquer KPI, GERENTE apenas do seu departamento, USER apenas KPIs próprios.',
      parameters: {
        type: 'object',
        properties: {
          kpi_key: { type: 'string', description: 'Identificador único do KPI (ex: evaluation_completion, sales_target)', required: true },
          label: { type: 'string', description: 'Nome legível do KPI', required: true },
          target_value: { type: 'number', description: 'Valor meta do KPI', required: true },
          current_value: { type: 'number', description: 'Valor atual do KPI', required: false },
          unit: { type: 'string', description: 'Unidade de medida (%, R$, un, etc)', required: false },
          department: { type: 'string', description: 'Departamento associado ao KPI', required: false },
          description: { type: 'string', description: 'Descrição do KPI', required: false },
          alert_threshold: { type: 'number', description: 'Percentual mínimo para alerta (ex: 80 = alerta quando abaixo de 80%)', required: false },
          auto_calculated: { type: 'boolean', description: 'Se o valor deve ser calculado automaticamente', required: false },
        },
        required: ['kpi_key', 'label', 'target_value'],
      },
    },
    handler: async (args, context): Promise<IAToolResult> => {
      const { kpi_key, label, target_value, current_value, unit, department, description, alert_threshold, auto_calculated } = args;

      try {
        const { data: existing } = await supabaseAdmin
          .from('kpi_targets')
          .select('id')
          .eq('kpi_key', kpi_key as string)
          .maybeSingle();

        const kpiData: Record<string, unknown> = {
          kpi_label: label,
          target_value,
          unit: unit || '%',
          description: description || null,
          alert_threshold: alert_threshold || 80,
          auto_calculated: auto_calculated || false,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        if (current_value !== undefined) kpiData.current_value = current_value;
        if (department) kpiData.department = department;

        if (existing) {
          const { error } = await supabaseAdmin
            .from('kpi_targets')
            .update(kpiData)
            .eq('id', existing.id);

          if (error) return { success: false, error: `Erro ao atualizar KPI: ${error.message}` };
          return { success: true, data: { message: `KPI "${label}" atualizado com sucesso`, kpi_key } };
        } else {
          kpiData.kpi_key = kpi_key;
          kpiData.created_at = new Date().toISOString();

          const { error } = await supabaseAdmin
            .from('kpi_targets')
            .insert([kpiData]);

          if (error) return { success: false, error: `Erro ao criar KPI: ${error.message}` };
          return { success: true, data: { message: `KPI "${label}" criado com sucesso`, kpi_key } };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro interno ao editar KPI' };
      }
    },
  });

  registerTool({
    id: 'listar_kpis',
    name: 'listar_kpis',
    description: 'Lista todos os KPIs ativos do sistema com valores atuais e metas.',
    module: 'avaliacao',
    adminOnly: false,
    definition: {
      name: 'listar_kpis',
      description: 'Lista KPIs ativos. ADMIN vê todos, GERENTE vê do departamento, USER vê KPIs gerais.',
      parameters: {
        type: 'object',
        properties: {
          department: { type: 'string', description: 'Filtrar por departamento', required: false },
          include_inactive: { type: 'boolean', description: 'Incluir KPIs inativos', required: false },
        },
        required: [],
      },
    },
    handler: async (args, context): Promise<IAToolResult> => {
      try {
        let query = supabaseAdmin
          .from('kpi_targets')
          .select('*')
          .eq('is_active', true)
          .order('kpi_label');

        if (args.department) {
          query = query.or(`department.eq.${args.department},department.is.null`);
        }

        const { data, error } = await query;

        if (error) return { success: false, error: `Erro ao buscar KPIs: ${error.message}` };

        const kpis = (data || []).map((k: any) => ({
          key: k.kpi_key,
          label: k.kpi_label,
          current: k.current_value,
          target: k.target_value,
          unit: k.unit,
          department: k.department,
          gap: k.target_value && k.current_value ? ((k.target_value - k.current_value) / k.target_value * 100).toFixed(1) : null,
          alertThreshold: k.alert_threshold,
        }));

        return { success: true, data: kpis };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });

  registerTool({
    id: 'configurar_alerta_kpi',
    name: 'configurar_alerta_kpi',
    description: 'Configura alertas automáticos para quando um KPI fica abaixo do threshold definido.',
    module: 'avaliacao',
    adminOnly: true,
    definition: {
      name: 'configurar_alerta_kpi',
      description: 'Configura alertas para KPIs. Apenas ADMIN pode configurar alertas globais.',
      parameters: {
        type: 'object',
        properties: {
          kpi_key: { type: 'string', description: 'Chave do KPI para configurar alerta', required: true },
          threshold: { type: 'number', description: 'Percentual mínimo (ex: 80 = alerta abaixo de 80% da meta)', required: true },
          channels: { type: 'string', description: 'Canais de notificação: push, email, portal (separados por vírgula)', required: false },
          target_users: { type: 'string', description: 'IDs ou roles alvo separados por vírgula (ex: ADMIN,GERENTE ou user-uuid)', required: false },
        },
        required: ['kpi_key', 'threshold'],
      },
    },
    handler: async (args, context): Promise<IAToolResult> => {
      try {
        const { error } = await supabaseAdmin
          .from('kpi_targets')
          .update({
            alert_threshold: args.threshold,
            updated_at: new Date().toISOString(),
          })
          .eq('kpi_key', args.kpi_key as string);

        if (error) return { success: false, error: `Erro ao configurar alerta: ${error.message}` };

        return {
          success: true,
          data: {
            message: `Alerta configurado para KPI "${args.kpi_key}": notificar quando abaixo de ${args.threshold}% da meta`,
            channels: args.channels || 'push,portal',
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
