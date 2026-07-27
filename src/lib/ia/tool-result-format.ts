/**
 * Formata resultados de tools para o LLM: summary curto + payload útil, com cap de tamanho.
 * Metadados (`_metadata`) são preservados no JSON bruto para o client acumular; a versão
 * enviada ao modelo pode omitir blobs grandes sem perder o sinal.
 */

const DEFAULT_MAX_CHARS = 10_000;
const ARRAY_PREVIEW = 25;

function countHint(value: unknown): string | null {
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.total === 'number') return `total=${o.total}`;
    if (typeof o.total_pendencias === 'number') return `pendencias=${o.total_pendencias}`;
    if (Array.isArray(o.data)) return `${o.data.length} em data`;
    if (Array.isArray(o.pendentes)) return `${o.pendentes.length} pendente(s)`;
  }
  return null;
}

function buildSummary(toolName: string, parsed: unknown): string {
  if (parsed == null) return `${toolName}: (vazio)`;
  if (typeof parsed === 'string') {
    const t = parsed.trim();
    if (!t) return `${toolName}: (vazio)`;
    if (t.length <= 220) return `${toolName}: ${t}`;
    return `${toolName}: ${t.slice(0, 200)}…`;
  }
  if (typeof parsed !== 'object') return `${toolName}: ${String(parsed)}`;

  const o = parsed as Record<string, unknown>;
  if (o.success === false || o.error) {
    return `${toolName}: ERRO — ${String(o.error || o.message || 'falhou')}`;
  }

  const parts: string[] = [toolName];
  if (typeof o.message === 'string' && o.message.trim()) {
    parts.push(o.message.trim().slice(0, 180));
  }
  if (o.resumo_geral && typeof o.resumo_geral === 'object') {
    const r = o.resumo_geral as Record<string, unknown>;
    if (typeof r.mensagem === 'string') parts.push(String(r.mensagem).slice(0, 200));
  }
  const hint = countHint(parsed);
  if (hint) parts.push(hint);

  // Contagens comuns de KPI / pendências
  for (const key of [
    'ferias_pendentes',
    'reembolsos_pendentes',
    'compras_pendentes',
    'avaliacoes_pendentes',
    'epis_pendentes',
    'total_pendencias',
    'total_usuarios',
  ]) {
    if (typeof o[key] === 'number') parts.push(`${key}=${o[key]}`);
  }

  if (o.ferias && typeof o.ferias === 'object') {
    const f = o.ferias as Record<string, unknown>;
    if (Array.isArray(f.pendentes)) parts.push(`ferias_pend=${f.pendentes.length}`);
  }
  if (o.reembolsos && typeof o.reembolsos === 'object') {
    const r = o.reembolsos as Record<string, unknown>;
    if (Array.isArray(r.pendentes)) parts.push(`reemb_pend=${r.pendentes.length}`);
    if (typeof r.total_pendente === 'number') parts.push(`R$_pend=${r.total_pendente}`);
  }

  return parts.join(' | ').slice(0, 480);
}

function truncateDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[…]';
  if (typeof value === 'string') {
    return value.length > 1500 ? `${value.slice(0, 1400)}…[truncado]` : value;
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, ARRAY_PREVIEW).map((v) => truncateDeep(v, depth + 1));
    if (value.length > ARRAY_PREVIEW) {
      return [...head, { _truncated: true, omitted: value.length - ARRAY_PREVIEW }];
    }
    return head;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '_metadata') continue; // client já extraiu; não poluir contexto do LLM
      out[k] = truncateDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type FormattedToolResult = {
  /** Conteúdo a enviar na mensagem role=tool */
  contentForLlm: string;
  /** JSON parseado (se houver) — útil para metadata */
  parsed: unknown | null;
};

/**
 * Prepara resultado de tool para o loop do LLM.
 * - Sempre inclui `_summary` legível
 * - Corta arrays/strings longos
 * - Cap total de caracteres
 */
export function formatToolResultForLLM(
  toolName: string,
  rawResult: string,
  options?: { maxChars?: number; keepRawForTools?: string[] }
): FormattedToolResult {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const keepRaw = options?.keepRawForTools || [];

  let parsed: unknown | null = null;
  try {
    parsed = JSON.parse(rawResult);
  } catch {
    parsed = null;
  }

  // Tools cujo payload completo já é curto / essencial
  if (keepRaw.includes(toolName) && rawResult.length <= maxChars) {
    return { contentForLlm: rawResult, parsed };
  }

  if (parsed == null) {
    const text =
      rawResult.length > maxChars
        ? `${rawResult.slice(0, maxChars - 80)}\n…[truncado ${rawResult.length - maxChars} chars]`
        : rawResult;
    return {
      contentForLlm: JSON.stringify({
        _summary: buildSummary(toolName, text),
        resultado: text,
      }),
      parsed: null,
    };
  }

  const summary = buildSummary(toolName, parsed);
  const slim = truncateDeep(parsed);
  const payload = {
    _summary: summary,
    ...(typeof slim === 'object' && slim && !Array.isArray(slim)
      ? (slim as Record<string, unknown>)
      : { data: slim }),
  };

  let content = JSON.stringify(payload);
  if (content.length > maxChars) {
    // Fallback: só summary + campos de alto sinal
    const o = parsed as Record<string, unknown>;
    const compact: Record<string, unknown> = { _summary: summary };
    for (const k of [
      'success',
      'message',
      'resumo_geral',
      'total',
      'total_pendencias',
      'ferias_pendentes',
      'reembolsos_pendentes',
      'comunicacao',
      'usuario',
      'commands',
      'instrucao_companion',
    ]) {
      if (o[k] !== undefined) compact[k] = truncateDeep(o[k]);
    }
    content = JSON.stringify(compact);
    if (content.length > maxChars) {
      content = JSON.stringify({
        _summary: summary,
        _note: `Resultado truncado (${rawResult.length} chars originais). Use os números do _summary; peça filtros/limite se precisar de mais detalhe.`,
      });
    }
  }

  return { contentForLlm: content, parsed };
}
