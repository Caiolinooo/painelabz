/**
 * Ações do Módulo Suprimentos
 * Portal ABZ - IA Actions
 */
import { supabaseAdmin } from '@/lib/supabase';
import { registerAction } from '../actions-registry';
import type { IAAction, IAActionContext, IAActionResult } from '@/types/ia-global';

/**
 * Ação: Aprovar solicitação de compra
 */
const approveSolicitacaoAction: IAAction = {
  id: 'suprimentos_approve',
  name: 'aprovar_solicitacao_compra',
  label: 'Aprovar Solicitação',
  description: 'Aprovar uma solicitação de compra',
  module: 'suprimentos',
  icon: '✅',
  requiresPermission: 'suprimentos:write',
  requiresRole: ['ADMIN', 'GERENTE'],
  parameters: [
    { name: 'solicitacao_id', type: 'string', description: 'ID da solicitação', required: true },
    { name: 'comentario', type: 'string', description: 'Comentário opcional', required: false },
  ],
  confirmBeforeExecute: true,
  requiresTargetVerification: true,
  execute: async (params, context): Promise<IAActionResult> => {
    const { solicitacao_id, comentario } = params;

    try {
      const { data: solicitacao, error: fetchError } = await supabaseAdmin
        .from('purchase_requests')
        .select('*, user:users_unified(first_name, last_name)')
        .eq('id', solicitacao_id)
        .single();

      if (fetchError || !solicitacao) {
        return { success: false, message: 'Solicitação não encontrada' };
      }

      if (solicitacao.status !== 'pending') {
        return { success: false, message: `Solicitação já está ${solicitacao.status}` };
      }

      const { error: updateError } = await supabaseAdmin
        .from('purchase_requests')
        .update({
          status: 'approved',
          approved_by: context.userId,
          approved_at: new Date().toISOString(),
          approved_comment: comentario || null,
        })
        .eq('id', solicitacao_id);

      if (updateError) {
        return { success: false, message: `Erro: ${updateError.message}` };
      }

      return {
        success: true,
        message: `✅ Solicitação aprovada!\n\n**Número:** ${solicitacao.rqf_number}\n**Valor:** R$ ${solicitacao.total_amount}\n**Solicitante:** ${solicitacao.user ? `${solicitacao.user.first_name} ${solicitacao.user.last_name}` : 'N/A'}`,
        notification: { type: 'success', title: 'Solicitação Aprovada', message: `RCF: ${solicitacao.rqf_number}` },
        requiresRefresh: true,
      };
    } catch (error) {
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Erro'}` };
    }
  },
};

/**
 * Ação: Reprovar solicitação de compra
 */
const rejectSolicitacaoAction: IAAction = {
  id: 'suprimentos_reject',
  name: 'reprovar_solicitacao_compra',
  label: 'Reprovar Solicitação',
  description: 'Reprovar uma solicitação de compra',
  module: 'suprimentos',
  icon: '❌',
  requiresPermission: 'suprimentos:write',
  requiresRole: ['ADMIN', 'GERENTE'],
  parameters: [
    { name: 'solicitacao_id', type: 'string', description: 'ID da solicitação', required: true },
    { name: 'motivo', type: 'string', description: 'Motivo da reprovação', required: true },
  ],
  confirmBeforeExecute: true,
  requiresTargetVerification: true,
  execute: async (params, context): Promise<IAActionResult> => {
    const { solicitacao_id, motivo } = params as { solicitacao_id?: string; motivo?: string };

    if (!motivo) {
      return { success: false, message: 'Informe o motivo da reprovação' };
    }

    try {
      const { error: updateError } = await supabaseAdmin
        .from('purchase_requests')
        .update({
          status: 'rejected',
          approved_by: context.userId,
          approved_at: new Date().toISOString(),
          approved_comment: motivo,
        })
        .eq('id', solicitacao_id);

      if (updateError) {
        return { success: false, message: `Erro: ${updateError.message}` };
      }

      return {
        success: true,
        message: `❌ Solicitação reprovada!\n\n**Motivo:** ${motivo}`,
        notification: { type: 'warning', title: 'Solicitação Reprovada', message: motivo || '' },
        requiresRefresh: true,
      };
    } catch (error) {
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Erro'}` };
    }
  },
};

export function registerActions() {
  registerAction(approveSolicitacaoAction);
  registerAction(rejectSolicitacaoAction);
  console.log('[IA Actions] Suprimentos loaded');
}