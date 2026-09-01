export type { CatalogDocument, CatalogResolveResult, CollaboratorIdentity, DocumentCatalogSource, DocumentCatalogSourceId } from './types';
export { DOCUMENT_CATALOG_SOURCE_IDS, isDocumentCatalogSourceId } from './types';
export { registerDocumentSource, getDocumentSources, getDocumentSource } from './registry';
export { resolveCollaboratorIdentity } from './identity';
export { normalizePersonName } from './names';
export { resolveCollaboratorDocuments } from './resolver';
export {
  QHSE_MODULE_KEY,
  canViewCollaboratorCatalog,
  canSeeQhseDocuments,
  canDownloadCatalogSource,
  canRequestCollaboratorCatalog,
  hasQhseModule,
  isAdminOrManager,
} from './permissions';
export { isQhseCatalogDocument, isQhseRelatedText, restrictCatalogToQhse } from './qhse';
