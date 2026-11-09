// Etapa 3 — Extração e grupos nomeados
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extrairEmails,
  extrairDatas,
  extrairHashtags,
  validarHorario,
  extrairHorarios,
  decomporDataPosicional,
  decomporDataNomeada,
} from '../src/etapa3-extracao.js';
import { carregarTextoBase } from '../src/node.js';

const texto = carregarTextoBase();

test('extrai os 2 e-mails do texto-base (sem o ponto final da frase)', () => {
  assert.deepEqual(extrairEmails(texto), ['ana.silva@udc.edu.br', 'joao123@gmail.com']);
});

test('extrai as 2 datas e decompõe em dia, mês e ano', () => {
  const datas = extrairDatas(texto);
  assert.deepEqual(datas.map((d) => d.texto), ['01/09/2026', '03/09/2026']);
  assert.deepEqual(
    { dia: datas[0].dia, mes: datas[0].mes, ano: datas[0].ano },
    { dia: '01', mes: '09', ano: '2026' },
  );
});

test('extrai as 3 hashtags', () => {
  assert.deepEqual(extrairHashtags(texto), ['#LFA', '#Python', '#Regex']);
});

test('horários HH:MM entre 00:00 e 23:59', () => {
  assert.equal(validarHorario('08:30'), true);
  assert.equal(validarHorario('23:59'), true);
  assert.equal(validarHorario('00:00'), true);
  assert.equal(validarHorario('25:61'), false);
  assert.equal(validarHorario('24:00'), false);
  assert.equal(validarHorario('8:30'), false);
  assert.equal(validarHorario(''), false);
});

test('extrai horários do texto e indica quais são válidos', () => {
  assert.deepEqual(extrairHorarios(texto), [
    { texto: '08:30', valido: true },
    { texto: '23:59', valido: true },
    { texto: '25:61', valido: false },
  ]);
});

test('desafio: captura posicional e nomeada produzem o mesmo resultado', () => {
  const esperado = { dia: '03', mes: '09', ano: '2026' };
  assert.deepEqual(decomporDataPosicional('03/09/2026'), esperado);
  assert.deepEqual(decomporDataNomeada('03/09/2026'), esperado);
  assert.equal(decomporDataNomeada('3/9/2026'), null);
});

test('borda: texto sem ocorrências devolve listas vazias', () => {
  assert.deepEqual(extrairEmails('nada aqui'), []);
  assert.deepEqual(extrairDatas(''), []);
  assert.deepEqual(extrairHashtags('# solto'), []);
});
