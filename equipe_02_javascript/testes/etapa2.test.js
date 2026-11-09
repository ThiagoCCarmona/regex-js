// Etapa 2 — Validação de formatos
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarMatricula,
  validarData,
  validarTelefone,
  validarCodigoLfa,
  dataExiste,
} from '../src/etapa2-validacao.js';

test('matrícula CC-AAAA-NNN', () => {
  assert.equal(validarMatricula('CC-2026-001'), true);
  assert.equal(validarMatricula('SI-2026-001'), false);
  assert.equal(validarMatricula('CC-26-001'), false);
});

test('matrícula: valida a cadeia inteira, não um trecho', () => {
  assert.equal(validarMatricula(' CC-2026-001'), false);
  assert.equal(validarMatricula('CC-2026-0012'), false);
  assert.equal(validarMatricula('xCC-2026-001'), false);
  assert.equal(validarMatricula(''), false);
});

test('data 01/09/2026: formato válido e data existente', () => {
  const r = validarData('01/09/2026');
  assert.equal(r.sintatica, true);
  assert.equal(r.semantica, true);
});

test('data 1/9/2026: formato inválido', () => {
  const r = validarData('1/9/2026');
  assert.equal(r.sintatica, false);
  assert.equal(r.semantica, false);
});

test('data 99/99/9999: formato válido, data inexistente', () => {
  const r = validarData('99/99/9999');
  assert.equal(r.sintatica, true);
  assert.equal(r.semantica, false);
  assert.match(r.motivo, /mês/);
});

test('semântica: anos bissextos', () => {
  assert.equal(validarData('29/02/2024').semantica, true);
  assert.equal(validarData('29/02/2026').semantica, false);
  assert.equal(validarData('29/02/1900').semantica, false);
  assert.equal(validarData('29/02/2000').semantica, true);
  assert.equal(validarData('31/04/2026').semantica, false);
  assert.equal(validarData('00/01/2026').semantica, false);
});

test('dataExiste recebe números', () => {
  assert.equal(dataExiste(31, 12, 2026), true);
  assert.equal(dataExiste(32, 12, 2026), false);
  assert.equal(dataExiste(1, 13, 2026), false);
});

test('telefone (DD) DDDDD-DDDD', () => {
  assert.equal(validarTelefone('(45) 99999-1234'), true);
  assert.equal(validarTelefone('45 99999-1234'), false);
  assert.equal(validarTelefone('(45)99999-1234'), false);
  assert.equal(validarTelefone(''), false);
});

test('desafio: código institucional LFA-2026-01', () => {
  assert.equal(validarCodigoLfa('LFA-2026-01'), true);
  assert.equal(validarCodigoLfa('LFA-2026-1'), false);
  assert.equal(validarCodigoLfa('lfa-2026-01'), false);
});
