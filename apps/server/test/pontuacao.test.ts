import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPontos } from '../src/pontuacao.ts';

test('acerto na metade do tempo com regex de 5 caracteres vale 1000', () => {
  assert.equal(calcularPontos(5, 30_000, 60_000), 1000);
});

test('acerto no último instante com regex longa vale só a base', () => {
  assert.equal(calcularPontos(40, 0, 60_000), 500);
});

test('acerto instantâneo com regex de 1 caractere vale o máximo', () => {
  assert.equal(calcularPontos(1, 60_000, 60_000), 1290);
});

test('tempo restante negativo não tira pontos da base', () => {
  assert.equal(calcularPontos(30, -5_000, 60_000), 500);
});
