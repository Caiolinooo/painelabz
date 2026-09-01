import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assinaturaCobreAprovador,
  avaliarAssinaturasFechamento,
  displayNameFromUser,
  isFechamentoRole,
  isFechamentoStatus,
  labelFechamentoStatus,
  montarHashFechamento,
  normalizeAprovadoresObrigatorios,
} from './fechamento-assinatura';

describe('isFechamentoRole', () => {
  it('accepts ADMIN/MANAGER family regardless of case', () => {
    assert.equal(isFechamentoRole('ADMIN'), true);
    assert.equal(isFechamentoRole('manager'), true);
    assert.equal(isFechamentoRole('GERENTE'), true);
    assert.equal(isFechamentoRole('USER'), false);
    assert.equal(isFechamentoRole(''), false);
  });
});

describe('displayNameFromUser', () => {
  it('prefers first+last over name/email', () => {
    assert.equal(displayNameFromUser({
      first_name: 'Ana',
      last_name: 'Silva',
      name: 'Outro',
      email: 'ana@groupabz.com',
    }), 'Ana Silva');
    assert.equal(displayNameFromUser({ email: 'so@email.com' }), 'so@email.com');
  });
});

describe('normalizeAprovadoresObrigatorios', () => {
  it('drops entries without email or id and dedupes by email', () => {
    const list = normalizeAprovadoresObrigatorios([
      { nome: 'A', email: 'a@x.com' },
      { nome: 'A2', email: 'A@x.com' },
      { nome: 'Sem email' },
      { id: 'u-1', nome: 'B', email: '' },
      null,
    ]);
    assert.equal(list.length, 2);
    assert.equal(list[0].email, 'a@x.com');
    assert.equal(list[1].id, 'u-1');
  });
});

describe('avaliarAssinaturasFechamento', () => {
  it('empty required list is 100% only after at least one signature', () => {
    assert.deepEqual(avaliarAssinaturasFechamento([], []), {
      todosAssinaram: false,
      pendentes: [],
    });
    assert.equal(
      avaliarAssinaturasFechamento([], [{ email: 'gestor@groupabz.com', userId: '1' }]).todosAssinaram,
      true,
    );
  });

  it('named list requires every member; extras do not block', () => {
    const obr = normalizeAprovadoresObrigatorios([
      { id: '1', nome: 'Ana', email: 'ana@x.com' },
      { id: '2', nome: 'Beto', email: 'beto@x.com' },
    ]);
    const partial = avaliarAssinaturasFechamento(obr, [{ email: 'ANA@x.com', userId: '1' }]);
    assert.equal(partial.todosAssinaram, false);
    assert.equal(partial.pendentes.length, 1);
    assert.equal(partial.pendentes[0].email, 'beto@x.com');

    const done = avaliarAssinaturasFechamento(obr, [
      { email: 'ana@x.com', userId: '1' },
      { email: 'beto@x.com', userId: '2' },
      { email: 'extra@x.com', userId: '9' },
    ]);
    assert.equal(done.todosAssinaram, true);
    assert.equal(done.pendentes.length, 0);
  });

  it('matches by user id when emails differ', () => {
    assert.equal(
      assinaturaCobreAprovador(
        { id: 'u-9', nome: 'X', email: 'old@x.com' },
        [{ userId: 'u-9', email: 'new@x.com' }],
      ),
      true,
    );
  });
});

describe('montarHashFechamento', () => {
  it('uses GT_FECHAMENTO:mesAno:nome:cpf:data:ip', () => {
    const hash = montarHashFechamento({
      mesAno: '2026-08',
      nome: 'Ana Silva',
      cpf: '123.456.789-09',
      dataIso: '2026-09-01T15:00:00.000Z',
      ip: '1.2.3.4',
    });
    assert.equal(hash, 'GT_FECHAMENTO:2026-08:Ana Silva:12345678909:2026-09-01T15:00:00.000Z:1.2.3.4');
  });
});

describe('labelFechamentoStatus', () => {
  it('covers every status variant', () => {
    assert.equal(labelFechamentoStatus('enviado'), 'Enviado ao DP');
    assert.equal(labelFechamentoStatus('aprovado'), 'Aprovado (100%)');
    assert.equal(labelFechamentoStatus('em_aprovacao', { assinados: 1, obrigatorios: 3 }), 'Em Aprovação (1/3)');
    assert.equal(labelFechamentoStatus('em_aprovacao', { assinados: 1, obrigatorios: 0 }), 'Em Aprovação (1/1)');
    assert.equal(labelFechamentoStatus('rejeitado'), 'Rejeitado');
    assert.equal(labelFechamentoStatus('pendente_revisao'), 'Pendente');
    assert.equal(isFechamentoStatus('enviado'), true);
    assert.equal(isFechamentoStatus('nope'), false);
  });
});
