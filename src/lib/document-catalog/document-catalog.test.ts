import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isQhseRelatedText, isQhseCatalogDocument } from './qhse';
import { normalizePersonName } from './names';
import { DOCUMENT_CATALOG_SOURCE_IDS, isDocumentCatalogSourceId } from './types';
import { canSeeQhseDocuments } from './permissions';

describe('document-catalog qhse hints', () => {
  it('detects EPI / QHSE attendance titles', () => {
    assert.equal(isQhseRelatedText('Treinamento de EPI e Uniformes'), true);
    assert.equal(isQhseRelatedText('Ficha de EPI — Taifeiro'), true);
    assert.equal(isQhseRelatedText('Reunião QHSE semanal'), true);
    assert.equal(isQhseRelatedText('Lista de presença DDS'), false);
  });
});

describe('document-catalog identity', () => {
  it('normalizes names for attendance matching', () => {
    assert.equal(normalizePersonName('José da Silva'), normalizePersonName('JOSE DA SILVA'));
    assert.equal(normalizePersonName('  Ana   Souza  '), 'ana souza');
  });
});

describe('document-catalog source ids', () => {
  it('accepts registered sources and rejects unknown', () => {
    assert.equal(isDocumentCatalogSourceId('epi'), true);
    assert.equal(isDocumentCatalogSourceId('lista_presenca'), true);
    assert.equal(isDocumentCatalogSourceId('unknown'), false);
    assert.ok(DOCUMENT_CATALOG_SOURCE_IDS.includes('gt'));
  });
});

describe('document-catalog qhse module gate', () => {
  it('allows USER with module epi and ADMIN without extra ACLs', () => {
    assert.equal(
      canSeeQhseDocuments({
        id: 'u1',
        role: 'USER',
        access_permissions: { modules: { epi: true } },
      }),
      true
    );
    assert.equal(canSeeQhseDocuments({ id: 'a1', role: 'ADMIN' }), true);
    assert.equal(canSeeQhseDocuments({ id: 'm1', role: 'MANAGER' }), true);
  });

  it('hides QHSE when module epi is off and does not require catalog ACLs', () => {
    assert.equal(
      canSeeQhseDocuments({
        id: 'u1',
        role: 'USER',
        access_permissions: {
          modules: { epi: false },
          features: { 'lista-presenca.manage': true, 'gestao-tripulantes.view': true },
        },
      }),
      false
    );
  });

  it('treats category qhse as a QHSE catalog document', () => {
    assert.equal(isQhseCatalogDocument({ qhseRelated: true, category: 'rh' }), true);
    assert.equal(isQhseCatalogDocument({ qhseRelated: false, category: 'qhse' }), true);
    assert.equal(isQhseCatalogDocument({ qhseRelated: false, category: 'gt' }), false);
  });
});
