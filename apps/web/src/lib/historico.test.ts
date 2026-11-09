import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adicionarAoHistorico, navegarHistorico, NAVEGACAO_INICIAL, type Navegacao } from './historico.ts';

test('adiciona no fim, ignora vazio e repetição consecutiva', () => {
  let h: string[] = [];
  h = adicionarAoHistorico(h, '^a$');
  h = adicionarAoHistorico(h, '^a$');
  h = adicionarAoHistorico(h, '   ');
  h = adicionarAoHistorico(h, '^b$');
  assert.deepEqual(h, ['^a$', '^b$']);
});

test('limita o tamanho, descartando os mais antigos', () => {
  let h: string[] = [];
  for (let i = 0; i < 60; i++) h = adicionarAoHistorico(h, `r${i}`, 50);
  assert.equal(h.length, 50);
  assert.equal(h[0], 'r10');
  assert.equal(h.at(-1), 'r59');
});

test('↑ traz o último comando, ↑ de novo o anterior, e para no mais antigo', () => {
  const h = ['um', 'dois', 'tres'];
  let nav: Navegacao = NAVEGACAO_INICIAL;
  let r = navegarHistorico(h, nav, 'rascunho', 'cima');
  assert.equal(r.valor, 'tres');
  r = navegarHistorico(h, r.nav, r.valor, 'cima');
  assert.equal(r.valor, 'dois');
  r = navegarHistorico(h, r.nav, r.valor, 'cima');
  assert.equal(r.valor, 'um');
  r = navegarHistorico(h, r.nav, r.valor, 'cima');
  assert.equal(r.valor, 'um', 'no mais antigo, ↑ não sai do lugar');
  nav = r.nav;
  assert.equal(nav.indice, 0);
});

test('↓ volta para os mais recentes e, passando do último, devolve o rascunho', () => {
  const h = ['um', 'dois'];
  let r = navegarHistorico(h, NAVEGACAO_INICIAL, 'digitando', 'cima'); // dois
  r = navegarHistorico(h, r.nav, r.valor, 'cima'); // um
  r = navegarHistorico(h, r.nav, r.valor, 'baixo');
  assert.equal(r.valor, 'dois');
  r = navegarHistorico(h, r.nav, r.valor, 'baixo');
  assert.equal(r.valor, 'digitando', 'volta ao que estava sendo digitado');
  assert.equal(r.nav.indice, null);
});

test('↓ sem estar navegando não muda nada', () => {
  const r = navegarHistorico(['um'], NAVEGACAO_INICIAL, 'atual', 'baixo');
  assert.equal(r.valor, 'atual');
  assert.equal(r.nav.indice, null);
});

test('histórico vazio: ↑ mantém o texto atual', () => {
  const r = navegarHistorico([], NAVEGACAO_INICIAL, 'atual', 'cima');
  assert.equal(r.valor, 'atual');
});
