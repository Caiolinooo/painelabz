/**
 * Generic e-Social ↔ Module sync: mirrors event status changes back to the
 * originating entity (gt_colaboradores, gt_documentos_aso, gt_afastamentos, gt_acidentes).
 *
 * Replaces the old S-2220-only aso-esocial-sync.ts.
 */

import { supabaseAdmin } from '@/lib/supabase';

export type EsocialMirrorStatus = 'enviado' | 'processado' | 'erro' | 'pendente' | 'pendente_revisao';

interface SyncParams {
  eventoId: string;
  status: EsocialMirrorStatus;
  protocolo?: string | null;
  numeroRecibo?: string | null;
  entidadeOrigemId?: string | null;
  entidadeOrigemTipo?: string | null;
  eventoCodigo?: string | null;
}

// ────────────────────────────────────────────────────────────────
// Mapping: evento_codigo → which table/column to update
// ────────────────────────────────────────────────────────────────
interface SyncTarget {
  table: string;
  /** Column that links to esocial_eventos.id */
  eventoIdColumn: string;
  /** Column that holds the mirrored status */
  statusColumn: string;
  /** Column for protocolo */
  protocoloColumn?: string;
  /** Column for numero_recibo */
  reciboColumn?: string;
  /** Column for data_envio */
  dataEnvioColumn?: string;
  /** How to locate the row: 'by_evento_id' uses eventoIdColumn, 'by_origem' uses entidade_origem_id */
  lookupStrategy: 'by_evento_id' | 'by_origem' | 'by_colaborador_tracking';
  /** For colaborador tracking: which status/evento_id pair on gt_colaboradores */
  colaboradorStatusField?: string;
  colaboradorEventoIdField?: string;
}

const SYNC_MAP: Record<string, SyncTarget> = {
  'S-2200': {
    table: 'gt_colaboradores',
    eventoIdColumn: 'esocial_admissao_evento_id',
    statusColumn: 'esocial_admissao_status',
    lookupStrategy: 'by_colaborador_tracking',
    colaboradorStatusField: 'esocial_admissao_status',
    colaboradorEventoIdField: 'esocial_admissao_evento_id',
  },
  'S-2205': {
    table: 'gt_colaboradores',
    eventoIdColumn: 'esocial_cadastro_evento_id',
    statusColumn: 'esocial_cadastro_status',
    lookupStrategy: 'by_colaborador_tracking',
    colaboradorStatusField: 'esocial_cadastro_status',
    colaboradorEventoIdField: 'esocial_cadastro_evento_id',
  },
  'S-2206': {
    table: 'gt_colaboradores',
    eventoIdColumn: 'esocial_contrato_evento_id',
    statusColumn: 'esocial_contrato_status',
    lookupStrategy: 'by_colaborador_tracking',
    colaboradorStatusField: 'esocial_contrato_status',
    colaboradorEventoIdField: 'esocial_contrato_evento_id',
  },
  'S-2220': {
    table: 'gt_documentos_aso',
    eventoIdColumn: 'esocial_evento_id',
    statusColumn: 'esocial_status',
    protocoloColumn: 'esocial_protocolo',
    reciboColumn: 'esocial_numero_recibo',
    dataEnvioColumn: 'esocial_data_envio',
    lookupStrategy: 'by_evento_id',
  },
  'S-2230': {
    table: 'gt_afastamentos',
    eventoIdColumn: 'esocial_evento_id',
    statusColumn: 'esocial_status',
    protocoloColumn: 'esocial_protocolo',
    reciboColumn: 'esocial_numero_recibo',
    dataEnvioColumn: 'esocial_data_envio',
    lookupStrategy: 'by_evento_id',
  },
  'S-2210': {
    table: 'gt_acidentes',
    eventoIdColumn: 'esocial_evento_id',
    statusColumn: 'esocial_status',
    protocoloColumn: 'esocial_protocolo',
    reciboColumn: 'esocial_numero_recibo',
    dataEnvioColumn: 'esocial_data_envio',
    lookupStrategy: 'by_evento_id',
  },
  'S-2240': {
    table: 'gt_colaboradores',
    eventoIdColumn: 'esocial_risco_evento_id',
    statusColumn: 'esocial_risco_status',
    lookupStrategy: 'by_colaborador_tracking',
    colaboradorStatusField: 'esocial_risco_status',
    colaboradorEventoIdField: 'esocial_risco_evento_id',
  },
  'S-2299': {
    table: 'gt_colaboradores',
    eventoIdColumn: 'esocial_desligamento_evento_id',
    statusColumn: 'esocial_desligamento_status',
    lookupStrategy: 'by_colaborador_tracking',
    colaboradorStatusField: 'esocial_desligamento_status',
    colaboradorEventoIdField: 'esocial_desligamento_evento_id',
  },
};

// ────────────────────────────────────────────────────────────────
// Main sync function
// ────────────────────────────────────────────────────────────────
export async function syncEsocialStatusFromEvento(params: SyncParams): Promise<void> {
  const {
    eventoId,
    status,
    protocolo,
    numeroRecibo,
    entidadeOrigemId,
    entidadeOrigemTipo,
    eventoCodigo,
  } = params;

  if (!eventoCodigo) {
    console.warn('[eSocial/sync] No eventoCodigo provided, skipping sync');
    return;
  }

  const target = SYNC_MAP[eventoCodigo];
  if (!target) {
    console.log(`[eSocial/sync] No sync target for event ${eventoCodigo}, skipping`);
    return;
  }

  try {
    if (target.lookupStrategy === 'by_colaborador_tracking') {
      await syncColaboradorTracking(eventoId, status, target, entidadeOrigemId);
    } else if (target.lookupStrategy === 'by_evento_id') {
      await syncByEventoId(eventoId, status, protocolo, numeroRecibo, target, entidadeOrigemId);
    }
    console.log(`[eSocial/sync] ${eventoCodigo} synced: evento=${eventoId} → ${target.table}.${target.statusColumn}=${status}`);
  } catch (err) {
    console.error(`[eSocial/sync] Error syncing ${eventoCodigo} evento=${eventoId}:`, err);
  }
}

// ────────────────────────────────────────────────────────────────
// Strategy: update gt_colaboradores tracking columns
// ────────────────────────────────────────────────────────────────
async function syncColaboradorTracking(
  eventoId: string,
  status: EsocialMirrorStatus,
  target: SyncTarget,
  entidadeOrigemId?: string | null
): Promise<void> {
  if (!target.colaboradorStatusField || !target.colaboradorEventoIdField) return;

  const update: Record<string, unknown> = {
    [target.colaboradorStatusField]: status,
    [target.colaboradorEventoIdField]: eventoId,
    updated_at: new Date().toISOString(),
  };

  // Try by entidade_origem_id first (should be the colaborador ID)
  if (entidadeOrigemId) {
    const { error } = await supabaseAdmin
      .from('gt_colaboradores')
      .update(update)
      .eq('id', entidadeOrigemId);

    if (!error) return;
    console.warn('[eSocial/sync] Update by entidade_origem_id failed, trying by CPF:', error);
  }

  // Fallback: lookup the event to get the CPF, then find the colaborador
  const { data: evento } = await supabaseAdmin
    .from('esocial_eventos')
    .select('cpf_trabalhador')
    .eq('id', eventoId)
    .maybeSingle();

  if (evento?.cpf_trabalhador) {
    const cpf = evento.cpf_trabalhador.replace(/\D/g, '');
    // Try normalized CPF match
    const { error } = await supabaseAdmin
      .from('gt_colaboradores')
      .update(update)
      .or(`cpf.eq.${cpf},cpf.eq.${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`);

    if (error) {
      console.error('[eSocial/sync] Colaborador tracking update by CPF failed:', error);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Strategy: update by esocial_evento_id on target table
// ────────────────────────────────────────────────────────────────
async function syncByEventoId(
  eventoId: string,
  status: EsocialMirrorStatus,
  protocolo: string | null | undefined,
  numeroRecibo: string | null | undefined,
  target: SyncTarget,
  entidadeOrigemId?: string | null
): Promise<void> {
  const update: Record<string, unknown> = {
    [target.statusColumn]: status,
    updated_at: new Date().toISOString(),
  };

  if (protocolo && target.protocoloColumn) update[target.protocoloColumn] = protocolo;
  if (numeroRecibo && target.reciboColumn) update[target.reciboColumn] = numeroRecibo;
  if ((status === 'enviado' || status === 'processado') && target.dataEnvioColumn) {
    update[target.dataEnvioColumn] = new Date().toISOString();
  }

  // Prefer link by esocial_evento_id
  const { data: byEvento, error: errEvento } = await supabaseAdmin
    .from(target.table)
    .update(update)
    .eq(target.eventoIdColumn, eventoId)
    .select('id');

  if (errEvento) {
    console.error(`[eSocial/sync] update by ${target.eventoIdColumn} failed on ${target.table}:`, errEvento);
  }

  if (byEvento && byEvento.length > 0) return;

  // Fallback: entidade_origem_id
  if (entidadeOrigemId) {
    const idColumn = target.table === 'gt_documentos_aso' ? 'documento_id' : 'id';
    const { error: errDoc } = await supabaseAdmin
      .from(target.table)
      .update({
        ...update,
        [target.eventoIdColumn]: eventoId,
      })
      .eq(idColumn, entidadeOrigemId);

    if (errDoc) {
      console.error(`[eSocial/sync] update by ${idColumn} failed on ${target.table}:`, errDoc);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Backward-compatible wrapper (old aso-esocial-sync API)
// ────────────────────────────────────────────────────────────────
export async function syncAsoEsocialStatusFromEvento(params: {
  eventoId: string;
  status: EsocialMirrorStatus;
  protocolo?: string | null;
  numeroRecibo?: string | null;
  entidadeOrigemId?: string | null;
  entidadeOrigemTipo?: string | null;
  eventoCodigo?: string | null;
}): Promise<void> {
  return syncEsocialStatusFromEvento(params);
}
