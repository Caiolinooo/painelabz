import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import type { GTDocumento } from '@/types/gestao-tripulantes';

/**
 * Document integrity helpers for Gestão de Tripulantes.
 *
 * Contracts (see src/app/api/gestao-tripulantes/AGENTS.md):
 * - Every consultable document MUST have data_emissao, data_validade
 *   and a unique numero_rastreio (hard validation on save; quarantine exempt).
 * - Anti-duplication: same file content (hash/path) or same
 *   (tipo + titulo + numero_documento) for the same colaborador must UPDATE
 *   the existing row instead of inserting a new one.
 * - Identity gate applies to ALL document types: a document may only live on
 *   the colaborador that owns the CPF; anything ambiguous goes to quarantine.
 */

export type GTIdentityMatch = 'match' | 'reassigned' | 'quarantine' | 'unknown' | 'frozen';

// ---------------------------------------------------------------------------
// Tracking number (numero_rastreio)
// ---------------------------------------------------------------------------

export function gerarNumeroRastreio(
  tipoDocumento: string,
  cpf?: string | null,
  ano?: number
): string {
  const tipo = (tipoDocumento || 'DOC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cpfDigits = String(cpf || '').replace(/\D/g, '');
  const cpf4 = cpfDigits.slice(0, 4) || '0000';
  const year = ano ?? new Date().getFullYear();
  // Random suffix resolved against DB in garantirNumeroRastreioUnico
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return `GT-${tipo}-${cpf4}-${year}-${rand}`;
}

/** Generates a tracking number guaranteed unique in gt_documentos. */
export async function garantirNumeroRastreioUnico(
  tipoDocumento: string,
  cpf?: string | null,
  ano?: number
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = gerarNumeroRastreio(tipoDocumento, cpf, ano);
    const { data } = await supabaseAdmin
      .from('gt_documentos')
      .select('id')
      .eq('numero_rastreio', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Practically unreachable; fall back to short uuid-style suffix
  return `GT-${tipoDocumento.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// File hashing / duplicate detection
// ---------------------------------------------------------------------------

export function calcularArquivoHash(buffer: Uint8Array | Buffer): string {
  return createHash('sha256').update(Buffer.from(buffer)).digest('hex');
}

export interface DuplicidadeCriterio {
  colaborador_id?: string | null;
  tipo_documento: string;
  titulo?: string | null;
  numero_documento?: string | null;
  arquivo_hash?: string | null;
  arquivo_path?: string | null;
}

/**
 * Finds an existing non-deleted document that duplicates the candidate:
 * priority 1 — same file hash; 2 — same storage path; 3 — same
 * (colaborador + tipo + titulo normalizado + numero_documento).
 */
export async function buscarDuplicado(
  criterio: DuplicidadeCriterio
): Promise<GTDocumento | null> {
  let query = supabaseAdmin
    .from('gt_documentos')
    .select('*')
    .is('deleted_at', null)
    .limit(1);

  if (criterio.arquivo_hash) {
    const { data } = await query.eq('arquivo_hash', criterio.arquivo_hash).maybeSingle();
    if (data) return data as GTDocumento;
  }

  if (criterio.arquivo_path) {
    const { data } = await supabaseAdmin
      .from('gt_documentos')
      .select('*')
      .is('deleted_at', null)
      .eq('arquivo_path', criterio.arquivo_path)
      .limit(1)
      .maybeSingle();
    if (data) return data as GTDocumento;
  }

  if (criterio.titulo && criterio.colaborador_id) {
    const { data } = await supabaseAdmin
      .from('gt_documentos')
      .select('*')
      .is('deleted_at', null)
      .eq('colaborador_id', criterio.colaborador_id)
      .eq('tipo_documento', criterio.tipo_documento)
      .ilike('titulo', criterio.titulo.trim());
    if (data && data.length > 0) {
      const numero = (criterio.numero_documento || '').trim();
      const match =
        (numero && data.find(d => (d.numero_documento || '').trim() === numero)) ||
        data.find(
          d =>
            !d.arquivo_path &&
            !criterio.arquivo_path &&
            !(d.numero_documento || '').trim() &&
            !numero
        );
      if (match) return match as GTDocumento;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hard validation: emissão + validade obrigatórias (quarentena is exempt)
// ---------------------------------------------------------------------------

export interface ValidacaoIntegridadeInput {
  data_emissao?: string | null;
  data_validade?: string | null;
}

export function validarDatasObrigatorias(
  data: ValidacaoIntegridadeInput,
  opts?: { permitirQuarentena?: boolean }
): { ok: boolean; errors: string[] } {
  if (opts?.permitirQuarentena) return { ok: true, errors: [] };
  const errors: string[] = [];
  if (!data.data_emissao?.trim()) {
    errors.push('Data de emissão é obrigatória');
  }
  if (!data.data_validade?.trim()) {
    errors.push('Data de validade é obrigatória');
  }
  if (
    data.data_emissao &&
    data.data_validade &&
    new Date(data.data_validade) < new Date(data.data_emissao)
  ) {
    errors.push('Data de validade não pode ser anterior à data de emissão');
  }
  return { ok: errors.length === 0, errors };
}

export function calcularStatusValidacaoPorValidade(
  dataValidade?: string | null
): GTDocumento['status_validacao'] {
  if (!dataValidade) return 'pendente';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(`${dataValidade}T00:00:00`);
  const diffDays = Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'vencendo';
  return 'valido';
}
