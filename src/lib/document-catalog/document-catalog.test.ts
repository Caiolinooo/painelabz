import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isQhseRelatedText,
  isQhseCatalogDocument,
  isOccupationalExamTipo,
  qhseFlagsForGtTipo,
  restrictCatalogToQhse,
} from './qhse';
import { normalizePersonName } from './names';
import {
  DOCUMENT_CATALOG_SOURCE_IDS,
  isDocumentCatalogSourceId,
  type CatalogDocument,
  type CatalogResolveResult,
} from './types';
import { canSeeQhseDocuments } from './permissions';

describe('document-catalog qhse hints', () => {
  it('detects EPI / QHSE attendance titles', () => {
    assert.equal(isQhseRelatedText('Treinamento de EPI e Uniformes'), true);
    assert.equal(isQhseRelatedText('Ficha de EPI — Taifeiro'), true);
    assert.equal(isQhseRelatedText('Reunião QHSE semanal'), true);
    assert.equal(isQhseRelatedText('Lista de presença DDS'), false);
  });

  it('does not treat ASO exam titles as QHSE attendance', () => {
    assert.equal(isQhseRelatedText('ASO periódico'), false);
    assert.equal(isQhseRelatedText('Atestado de Saúde Ocupacional'), false);
    assert.equal(isQhseRelatedText('Laudo ocupacional'), false);
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

  it('never treats ASO/laudo as QHSE, even when a source mis-tags them', () => {
    assert.equal(isOccupationalExamTipo('aso'), true);
    assert.equal(isOccupationalExamTipo('laudo'), true);
    assert.equal(isOccupationalExamTipo('LAUDO'), true);
    assert.equal(isOccupationalExamTipo('epi'), false);
    assert.equal(isOccupationalExamTipo('certificado'), false);

    assert.equal(
      isQhseCatalogDocument({ qhseRelated: true, category: 'qhse', tipoDocumento: 'aso' }),
      false
    );
    assert.equal(
      isQhseCatalogDocument({ qhseRelated: true, category: 'qhse', tipoDocumento: 'laudo' }),
      false
    );
    assert.equal(
      isQhseCatalogDocument({ qhseRelated: false, category: 'aso', tipoDocumento: 'passaporte' }),
      false
    );
    assert.equal(
      isQhseCatalogDocument({ qhseRelated: true, category: 'qhse', tipoDocumento: 'epi' }),
      true
    );
  });

  it('tags GT ASO/laudo out of QHSE and GT EPI into QHSE', () => {
    assert.deepEqual(qhseFlagsForGtTipo('aso'), { qhseRelated: false, category: 'gt' });
    assert.deepEqual(qhseFlagsForGtTipo('laudo'), { qhseRelated: false, category: 'gt' });
    assert.deepEqual(qhseFlagsForGtTipo('certificado'), { qhseRelated: false, category: 'gt' });
    assert.deepEqual(qhseFlagsForGtTipo('ficha_epi'), { qhseRelated: true, category: 'qhse' });
  });

  it('restrictCatalogToQhse drops occupational exams from ?qhse=1', () => {
    const aso: CatalogDocument = {
      id: 'gt:aso',
      source: 'gt',
      sourceLabel: 'Gestão de Tripulantes',
      title: 'ASO periódico',
      category: 'qhse',
      signed: false,
      qhseRelated: true,
      tipoDocumento: 'aso',
      recordId: 'aso',
      downloadKind: 'none',
      matchBy: ['cpf'],
    };
    const epi: CatalogDocument = {
      id: 'epi:1',
      source: 'epi',
      sourceLabel: 'QHSE / EPI',
      title: 'Ficha de EPI / Uniformes (AN-HSE-005)',
      category: 'qhse',
      signed: true,
      qhseRelated: true,
      tipoDocumento: 'epi',
      recordId: 'ficha',
      downloadKind: 'api',
      matchBy: ['user_id'],
    };
    const input: CatalogResolveResult = {
      identity: {
        userId: 'u1',
        colaboradorId: 'c1',
        cpfDigits: null,
        email: null,
        emailLower: null,
        fullName: 'Teste',
        fullNameNormalized: 'teste',
        position: null,
        department: null,
        sectorId: null,
      },
      documents: [aso, epi],
      sources: [
        { id: 'gt', label: 'Gestão de Tripulantes', count: 1 },
        { id: 'epi', label: 'QHSE / Ficha de EPI', count: 1 },
      ],
      gaps: [],
    };
    const restricted = restrictCatalogToQhse(input);
    assert.equal(restricted.documents.length, 1);
    assert.equal(restricted.documents[0].id, 'epi:1');
    assert.equal(restricted.sources.some((s) => s.id === 'gt'), false);
  });
});
