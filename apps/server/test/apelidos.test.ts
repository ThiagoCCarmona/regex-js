import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apelidoImproprio, normalizarApelido } from '../src/apelidos.ts';

test('normaliza acentos, maiúsculas e trocas de letras por números/símbolos', () => {
  assert.equal(normalizarApelido('CaRáLh0'), 'caralho');
  assert.equal(normalizarApelido('p0rr4'), 'porra');
  assert.equal(normalizarApelido('m e r d a'), 'merda');
  assert.equal(normalizarApelido('$h1t'), 'shit');
});

test('bloqueia palavrões comuns mesmo disfarçados', () => {
  for (const s of ['porra', 'P0RR4', 'merdinha', 'caralho123', 'fdp', 'v.i.a.d.o', 'Buceta', 'fuck_you', 'prof_lixo']) {
    assert.equal(apelidoImproprio(s), true, s);
  }
});

test('não bloqueia apelidos comuns (sem falso positivo óbvio)', () => {
  for (const s of ['Ana', 'Bruno', 'Thiago', 'Computação', 'Sextante', 'Cucamonga', 'Marcelo', 'Rafa', 'Analu', 'Regex_Master']) {
    assert.equal(apelidoImproprio(s), false, s);
  }
});
