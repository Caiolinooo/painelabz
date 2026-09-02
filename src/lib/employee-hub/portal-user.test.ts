import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PORTAL_USER_SELECT,
  emailsMatchExact,
  pickUniqueEmailMatch,
  pickUniqueNameCpfMatch,
  pickUniqueTaxIdMatch,
  portalDisplayName,
  portalUsersCompatibleForModules,
  compatibleModuleUserIds,
  shouldBackfillUserId,
  taxIdDigitsMatch,
  uniqueUserIds,
  type PortalUser,
} from './portal-user-match';

const AISLAN_CPF = '13984165765';

const gmailUser: PortalUser = {
  id: '0d69cd7b-ec52-45ed-a87e-f452e6d2f152',
  first_name: 'AISLAN',
  last_name: 'ROCHA DE ARAUJO LEITE',
  email: 'aislan.roocha@gmail.com',
  role: 'USER',
  tax_id: AISLAN_CPF,
};

const corpUser: PortalUser = {
  id: 'd93d659d-70d4-4be0-bea9-6af2d5e1f486',
  first_name: 'Aislan',
  last_name: 'Rocha',
  email: 'aislan.rocha@groupabz.com',
  role: 'USER',
  tax_id: null,
};

describe('PORTAL_USER_SELECT', () => {
  it('selects tax_id and never cpf/full_name/phone', () => {
    assert.match(PORTAL_USER_SELECT, /\btax_id\b/);
    assert.match(PORTAL_USER_SELECT, /\bfirst_name\b/);
    assert.match(PORTAL_USER_SELECT, /\blast_name\b/);
    assert.match(PORTAL_USER_SELECT, /\bemail\b/);
    assert.doesNotMatch(PORTAL_USER_SELECT, /(^|,\s*)cpf(,|$)/);
    assert.doesNotMatch(PORTAL_USER_SELECT, /\bfull_name\b/);
    assert.doesNotMatch(PORTAL_USER_SELECT, /(^|,\s*)phone(,|$)/);
  });
});

describe('taxIdDigitsMatch', () => {
  it('matches Aislan CPF against digits or masked tax_id', () => {
    assert.equal(taxIdDigitsMatch('13984165765', AISLAN_CPF), true);
    assert.equal(taxIdDigitsMatch('139.841.657-65', AISLAN_CPF), true);
    assert.equal(taxIdDigitsMatch(null, AISLAN_CPF), false);
    assert.equal(taxIdDigitsMatch('00000000000', AISLAN_CPF), false);
  });
});

describe('emailsMatchExact', () => {
  it('is case-insensitive and exact', () => {
    assert.equal(emailsMatchExact('Aislan.Roocha@Gmail.com', 'aislan.roocha@gmail.com'), true);
    assert.equal(emailsMatchExact('aislan.rocha@groupabz.com', 'aislan.roocha@gmail.com'), false);
    assert.equal(emailsMatchExact('', 'aislan.roocha@gmail.com'), false);
  });
});

describe('pickUniqueTaxIdMatch', () => {
  it('links Aislan via tax_id even when a corporate clone has null tax_id', () => {
    const hit = pickUniqueTaxIdMatch([gmailUser, corpUser], AISLAN_CPF);
    assert.equal(hit?.id, gmailUser.id);
  });

  it('returns null when two users share the same CPF digits', () => {
    const clone = { ...corpUser, tax_id: '139.841.657-65' };
    assert.equal(pickUniqueTaxIdMatch([gmailUser, clone], AISLAN_CPF), null);
  });
});

describe('pickUniqueEmailMatch', () => {
  it('links the colaborador gmail exactly', () => {
    const hit = pickUniqueEmailMatch([gmailUser, corpUser], 'aislan.roocha@gmail.com');
    assert.equal(hit?.id, gmailUser.id);
  });
});

describe('pickUniqueNameCpfMatch', () => {
  it('requires both exact normalized name and CPF digits', () => {
    const hit = pickUniqueNameCpfMatch(
      [gmailUser, corpUser],
      'AISLAN ROCHA DE ARAUJO LEITE',
      AISLAN_CPF,
    );
    assert.equal(hit?.id, gmailUser.id);
    assert.equal(pickUniqueNameCpfMatch([gmailUser, corpUser], 'Aislan Rocha', AISLAN_CPF), null);
  });
});

describe('shouldBackfillUserId', () => {
  it('fills only when colaborador.user_id is empty', () => {
    assert.equal(shouldBackfillUserId(null, gmailUser.id), true);
    assert.equal(shouldBackfillUserId(gmailUser.id, corpUser.id), false);
    assert.equal(shouldBackfillUserId(undefined, null), false);
  });

  it('does not persist email-only matches when tax_id disagrees or is missing', () => {
    assert.equal(
      shouldBackfillUserId(null, corpUser.id, {
        reason: 'email',
        cpfDigits: AISLAN_CPF,
        matchedTaxId: corpUser.tax_id,
      }),
      false,
    );
    const otherCpfUser = { ...gmailUser, tax_id: '00000000000' };
    assert.equal(
      shouldBackfillUserId(null, otherCpfUser.id, {
        reason: 'email',
        cpfDigits: AISLAN_CPF,
        matchedTaxId: otherCpfUser.tax_id,
      }),
      false,
    );
    assert.equal(
      shouldBackfillUserId(null, gmailUser.id, {
        reason: 'email',
        cpfDigits: AISLAN_CPF,
        matchedTaxId: gmailUser.tax_id,
      }),
      true,
    );
  });
});

describe('compatibleModuleUserIds', () => {
  it('keeps Aislan gmail + corporate clone (null tax_id)', () => {
    assert.deepEqual(compatibleModuleUserIds(gmailUser, AISLAN_CPF, corpUser), [
      gmailUser.id,
      corpUser.id,
    ]);
  });

  it('drops an email hit whose tax_id is a different person', () => {
    const victim: PortalUser = {
      id: 'victim-id',
      first_name: 'Other',
      last_name: 'Person',
      email: 'other@groupabz.com',
      role: 'USER',
      tax_id: '52998224725',
    };
    assert.equal(portalUsersCompatibleForModules(gmailUser, victim, AISLAN_CPF), false);
    assert.deepEqual(compatibleModuleUserIds(gmailUser, AISLAN_CPF, victim), [gmailUser.id]);
  });
});

describe('portalDisplayName / uniqueUserIds', () => {
  it('prefers first+last and de-dupes module ids', () => {
    assert.equal(portalDisplayName(gmailUser), 'AISLAN ROCHA DE ARAUJO LEITE');
    assert.deepEqual(uniqueUserIds(gmailUser.id, gmailUser.id, corpUser.id, null), [
      gmailUser.id,
      corpUser.id,
    ]);
  });
});
