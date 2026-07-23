/**
 * Closes the ASO ↔ e-Social loop: when S-2220 is sent/consulted,
 * mirror status onto gt_documentos_aso via esocial_evento_id / entidade_origem_id.
 */

import { supabaseAdmin } from '@/lib/supabase';

export type AsoEsocialMirrorStatus = 'enviado' | 'processado' | 'erro' | 'pendente';

export async function syncAsoEsocialStatusFromEvento(params: {
  eventoId: string;
  status: AsoEsocialMirrorStatus;
  protocolo?: string | null;
  numeroRecibo?: string | null;
  entidadeOrigemId?: string | null;
  entidadeOrigemTipo?: string | null;
  eventoCodigo?: string | null;
}): Promise<void> {
  const {
    eventoId,
    status,
    protocolo,
    numeroRecibo,
    entidadeOrigemId,
    entidadeOrigemTipo,
    eventoCodigo,
  } = params;

  if (eventoCodigo && eventoCodigo !== 'S-2220') return;

  const update: Record<string, unknown> = {
    esocial_status: status,
    updated_at: new Date().toISOString(),
  };

  if (protocolo) update.esocial_protocolo = protocolo;
  if (numeroRecibo) update.esocial_numero_recibo = numeroRecibo;
  if (status === 'enviado' || status === 'processado') {
    update.esocial_data_envio = new Date().toISOString();
  }

  // Prefer link by esocial_evento_id
  const { data: byEvento, error: errEvento } = await supabaseAdmin
    .from('gt_documentos_aso')
    .update(update)
    .eq('esocial_evento_id', eventoId)
    .select('id');

  if (errEvento) {
    console.error('[ASO/eSocial sync] update by esocial_evento_id failed:', errEvento);
  }

  if (byEvento && byEvento.length > 0) return;

  // Fallback: entidade_origem_id = documento_id when tipo is aso/ocr
  if (
    entidadeOrigemId &&
    (!entidadeOrigemTipo || entidadeOrigemTipo === 'aso' || entidadeOrigemTipo === 'documento')
  ) {
    const { error: errDoc } = await supabaseAdmin
      .from('gt_documentos_aso')
      .update({
        ...update,
        esocial_evento_id: eventoId,
      })
      .eq('documento_id', entidadeOrigemId);

    if (errDoc) {
      console.error('[ASO/eSocial sync] update by documento_id failed:', errDoc);
    }
  }
}
