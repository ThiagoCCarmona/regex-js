// Etapa 4 — Substituição e separação
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarEspacos,
  mascararCpf,
  separar,
  substituirLiteral,
  reformatarDataComGrupos,
} from '../src/etapa4-transformacao.js';

test('normaliza espaços: remove das pontas e colapsa os internos', () => {
  assert.equal(normalizarEspacos('  LFA   com  Python   é   prática!  '), 'LFA com Python é prática!');
});

test('normaliza tabs e quebras de linha internas como espaço', () => {
  assert.equal(normalizarEspacos('\tLFA\t\tcom\nPython '), 'LFA com Python');
  assert.equal(normalizarEspacos('   '), '');
});

test('mascara CPF fictício preservando os 3 primeiros e os 2 últimos dígitos', () => {
  assert.equal(mascararCpf('123.456.789-00'), '123.***.***-00');
});

test('CPF fora do formato não é mascarado', () => {
  assert.equal(mascararCpf('12345678900'), null);
  assert.equal(mascararCpf(''), null);
});

test('separa por ; , ou | com espaços opcionais', () => {
  assert.deepEqual(separar('LFA;Python,Regex | Automatos'), ['LFA', 'Python', 'Regex', 'Automatos']);
  assert.deepEqual(separar('a ;  b'), ['a', 'b']);
});

test('desafio: substituição literal não interpreta $& nem $1', () => {
  assert.equal(substituirLiteral('preço: $5', '$5', '$&$&'), 'preço: $&$&');
  assert.equal(substituirLiteral('1.2.3', '.', '-'), '1-2-3');
});

test('desafio: substituição com grupos nomeados reordena a data', () => {
  assert.equal(reformatarDataComGrupos('01/09/2026'), '2026-09-01');
});
