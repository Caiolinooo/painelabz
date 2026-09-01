import type { CatalogDocument, CatalogResolveResult, DocumentCatalogSourceId } from './types';

const QHSE_HINT =
  /\b(epi|qhse|hse|sesmt|uniforme|fichas?\s+de\s+epi|an-hse|seguran[cç]a\s+do\s+trabalho|equipamento[s]?\s+de\s+prote[cç][aã]o)\b/i;

export function isQhseRelatedText(...parts: Array<string | null | undefined>): boolean {
  const blob = parts.filter(Boolean).join(' ');
  if (!blob.trim()) return false;
  return QHSE_HINT.test(blob);
}

export function isQhseCatalogDocument(doc: Pick<CatalogDocument, 'qhseRelated' | 'category'>): boolean {
  return doc.qhseRelated === true || doc.category === 'qhse';
}

export function restrictCatalogToQhse(result: CatalogResolveResult): CatalogResolveResult {
  const documents = result.documents.filter(isQhseCatalogDocument);
  const counts = new Map<DocumentCatalogSourceId, number>();
  for (const doc of documents) {
    counts.set(doc.source, (counts.get(doc.source) || 0) + 1);
  }
  return {
    ...result,
    documents,
    sources: result.sources
      .map((source) => ({ ...source, count: counts.get(source.id) || 0 }))
      .filter((source) => source.count > 0),
  };
}

export function catalogDownloadApi(source: string, recordId: string): string {
  const params = new URLSearchParams({ source, recordId });
  return `/api/document-catalog/download?${params.toString()}`;
}
