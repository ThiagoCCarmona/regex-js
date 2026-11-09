// Etapa 1 — Fundamentos e reconhecimento
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ehIdentificador,
  ehIdentificadorMaiusculo,
  primeiraOcorrencia,
  todasOcorrencias,
  extrairNumeros,
  palavrasComL,
  FRASE_ETAPA1,
} from '../src/etapa1-reconhecimento.js';

test('reconhece identificadores válidos do enunciado (cadeia inteira)', () => {
  for (const s of ['total', '_contador', 'nome_completo']) {
    assert.equal(ehIdentificador(s), true, s);
  }
});

test('rejeita identificadores inválidos do enunciado', () => {
  for (const s of ['2valor', 'x-y']) {
    assert.equal(ehIdentificador(s), false, s);
  }
});

test('borda: cadeia vazia (λ) e espaços nas pontas não são identificadores', () => {
  assert.equal(ehIdentificador(''), false);
  assert.equal(ehIdentificador(' total'), false);
  assert.equal(ehIdentificador('total '), false);
});

test('borda: acentos não pertencem ao alfabeto ASCII do enunciado', () => {
  assert.equal(ehIdentificador('ação'), false);
});

test('borda: chamadas repetidas não sofrem com lastIndex', () => {
  assert.deepEqual(
    [ehIdentificador('total'), ehIdentificador('total'), ehIdentificador('total')],
    [true, true, true],
  );
});

test('desafio: primeira letra restrita a [A-Z]', () => {
  assert.equal(ehIdentificadorMaiusculo('Total'), true);
  assert.equal(ehIdentificadorMaiusculo('TOTAL_2'), true);
  assert.equal(ehIdentificadorMaiusculo('total'), false);
  assert.equal(ehIdentificadorMaiusculo('_Total'), false);
});

test('extrai os números da frase do enunciado', () => {
  assert.deepEqual(extrairNumeros(FRASE_ETAPA1), ['2026', '32', '6']);
});

test('extrai palavras que começam por L/l, preservando acentos', () => {
  assert.deepEqual(palavrasComL(FRASE_ETAPA1), ['LFA', 'laboratórios']);
});

test('busca a primeira ocorrência de identificador (equivalente a re.search)', () => {
  assert.deepEqual(primeiraOcorrencia('  2x soma'), { valor: 'x', indice: 3 });
  assert.equal(primeiraOcorrencia('123 456'), null);
});

test('extrai todas as ocorrências de identificadores (equivalente a re.findall)', () => {
  assert.deepEqual(todasOcorrencias('x = y2 + _z'), ['x', 'y2', '_z']);
});
