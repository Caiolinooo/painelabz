/**
 * Validação de consistência e-Social ↔ Gestão de Tripulantes (ASOs).
 *
 * Detecta três classes de problema:
 *  1. CPF_MISMATCH   — ASO enviado ao e-Social cujo cpf_documento diverge
 *                      do cpf_trabalhador do evento.
 *  2. EVENTO_ORFAO   — evento com entidade_origem_id que não corresponde a
 *                      nenhum documento existente (ou documento soft-deleted).
 *  3. STATUS_DIVERGENTE — gt_documentos_aso.esocial_status divergente do
 *                      status real do último evento S-2220 vinculado.
 *
 * Usado por GET /api/gestao-tripulantes/esocial-consistencia (dados
 * consultáveis; o painel visual pode ser ligado depois).
 */

import { supabaseAdmin } from '@/lib/supabase';
import { cpfsMatch, normalizeCpf } from '@/lib/gestao-tripulantes/cpf';

export type ConsistenciaTipo = 'CPF_MISMATCH' | 'EVENTO_ORFAO' | 'STATUS_DIVERGENTE';

export interface AchadoConsistencia {
  tipo: ConsistenciaTipo;
  severidade: 'alta' | 'media' | 'baixa';
  descricao: string;
  evento_id?: string;
  documento_id?: string;
  aso_documento_id?: string;
  cpf_evento?: string | null;
  cpf_documento?: string | null;
  status_esperado?: string | null;
  status_atual?: string | null;
}

export interface RelatorioConsistencia {
  gerado_em: string;
  total_eventos_analisados: number;
  total_asos_analisados: number;
  total_orfaos: number;
  achados: AchadoConsistencia[];
  resumo: Record<ConsistenciaTipo, number>;
}

/**
 * Mapa esocial_eventos.status → gt_documentos_aso.esocial_status espelhado.
 * Mesma semântica dos backfills em 20260724_000002_esocial_tracking_columns.sql
 * e do GET /documentos/[id]/esocial.
 */
export function mapEventoStatusParaAso(status: string): string {
  switch (status) {
    case 'rascunho':
    case 'devolvido':
    case 'revisao_rejeitado':
      return 'erro_validacao';
    case 'erro':
      return 'erro';
    case 'processado':
      return 'processado';
    case 'enviado':
    case 'enviando':
    case 'fila_envio':
      return 'enviado';
    case 'pendente_revisao':
    case 'revisao_aprovado':
      return 'pendente_revisao';
    default:
      return 'pendente';
  }
}

export async function auditarConsistenciaEsocialAso(): Promise<RelatorioConsistencia> {
  const achados: AchadoConsistencia[] = [];

  // ── 1. Eventos S-2220 de gestão de tripulantes ────────────────
  const { data: eventos, error: evError } = await supabaseAdmin
    .from('esocial_eventos')
    .select('id, evento_codigo, cpf_trabalhador, status, entidade_origem_id, entidade_origem_tipo, created_at')
    .eq('evento_codigo', 'S-2220')
    .order('created_at', { ascending: false });

  if (evError) throw new Error(`Erro ao buscar eventos e-Social: ${evError.message}`);
  const listaEventos = eventos || [];

  // Último evento por entidade_origem_id (ordem desc ⇒ primeiro visto é o último)
  const ultimoEventoPorDoc = new Map<string, (typeof listaEventos)[number]>();
  for (const ev of listaEventos) {
    const docId = ev.entidade_origem_id;
    if (docId && !ultimoEventoPorDoc.has(docId)) ultimoEventoPorDoc.set(docId, ev);
  }

  // ── 2. Documentos ASO + detalhes (cpf_documento, esocial_status) ──
  const { data: docs, error: docError } = await supabaseAdmin
    .from('gt_documentos')
    .select('id, colaborador_id, deleted_at')
    .eq('tipo_documento', 'aso');

  if (docError) throw new Error(`Erro ao buscar documentos ASO: ${docError.message}`);

  const docIds = (docs || []).map(d => d.id);
  const asoMap = new Map<string, { cpf_documento: string | null; esocial_status: string | null; esocial_evento_id: string | null }>();
  if (docIds.length > 0) {
    const { data: asoRows, error: asoError } = await supabaseAdmin
      .from('gt_documentos_aso')
      .select('documento_id, cpf_documento, esocial_status, esocial_evento_id')
      .in('documento_id', docIds);
    if (asoError) throw new Error(`Erro ao buscar dados de ASO: ${asoError.message}`);
    (asoRows || []).forEach(r => {
      if (r.documento_id) {
        asoMap.set(r.documento_id, {
          cpf_documento: r.cpf_documento || null,
          esocial_status: r.esocial_status || null,
          esocial_evento_id: r.esocial_evento_id || null,
        });
      }
    });
  }
  const docsById = new Map((docs || []).map(d => [d.id, d]));

  // ── 3. Check #1: CPF_MISMATCH ─────────────────────────────────
  for (const ev of listaEventos) {
    const docId = ev.entidade_origem_id;
    if (!docId) continue;
    const aso = asoMap.get(docId);
    if (!aso?.cpf_documento || !ev.cpf_trabalhador) continue;
    if (!cpfsMatch(aso.cpf_documento, ev.cpf_trabalhador)) {
      achados.push({
        tipo: 'CPF_MISMATCH',
        severidade: 'alta',
        descricao: `ASO enviado ao e-Social com cpf_documento (${normalizeCpf(aso.cpf_documento)}) divergente do cpf_trabalhador do evento ${ev.evento_codigo} (${normalizeCpf(ev.cpf_trabalhador)}).`,
        evento_id: ev.id,
        documento_id: docId,
        cpf_evento: normalizeCpf(ev.cpf_trabalhador),
        cpf_documento: normalizeCpf(aso.cpf_documento),
      });
    }
  }

  // ── 4. Check #2: EVENTO_ORFAO ─────────────────────────────────
  let orfaos = 0;
  for (const ev of listaEventos) {
    const docId = ev.entidade_origem_id;
    if (!docId) continue; // sem vínculo declarado não é órfão rastreável
    const doc = docsById.get(docId);
    if (!doc || doc.deleted_at) {
      orfaos++;
      achados.push({
        tipo: 'EVENTO_ORFAO',
        severidade: 'media',
        descricao: doc
          ? `Evento ${ev.evento_codigo} aponta para documento ${docId} que foi excluído (soft delete).`
          : `Evento ${ev.evento_codigo} com entidade_origem_id=${docId} sem documento correspondente.`,
        evento_id: ev.id,
        documento_id: docId,
      });
    }
  }

  // ── 5. Check #3: STATUS_DIVERGENTE ────────────────────────────
  for (const [docId, ev] of ultimoEventoPorDoc.entries()) {
    const aso = asoMap.get(docId);
    if (!aso?.esocial_status) continue;
    if (aso.esocial_status === 'quarentena') continue; // estado de identidade, não de envio
    const esperado = mapEventoStatusParaAso(ev.status);
    if (aso.esocial_status !== esperado) {
      achados.push({
        tipo: 'STATUS_DIVERGENTE',
        severidade: 'media',
        descricao: `Documento ${docId} com esocial_status='${aso.esocial_status}' diverge do status real do último evento (${ev.status} → '${esperado}').`,
        evento_id: ev.id,
        documento_id: docId,
        status_esperado: esperado,
        status_atual: aso.esocial_status,
      });
    }
  }

  // ── 6. Resumo ────────────────────────────────────────────────
  const resumo: Record<ConsistenciaTipo, number> = {
    CPF_MISMATCH: 0,
    EVENTO_ORFAO: 0,
    STATUS_DIVERGENTE: 0,
  };
  achados.forEach(a => { resumo[a.tipo]++; });

  return {
    gerado_em: new Date().toISOString(),
    total_eventos_analisados: listaEventos.length,
    total_asos_analisados: docIds.length,
    total_orfaos: orfaos,
    achados,
    resumo,
  };
}
