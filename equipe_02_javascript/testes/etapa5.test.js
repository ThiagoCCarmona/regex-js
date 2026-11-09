// Etapa 5 — Parser de logs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarLogs, analisarLinha, validarSemantica } from '../src/etapa5-logs.js';
import { carregarLog } from '../src/node.js';

test('arquivo-base: 6 linhas, 5 reconhecidas e 1 inválida', () => {
  const r = analisarLogs(carregarLog('logs.txt'));
  assert.equal(r.validas.length, 5);
  assert.equal(r.rejeitadas.length, 1);
  assert.equal(r.rejeitadas[0].linha, 6);
});

test('arquivo-base: contagens por nível, usuário e ação', () => {
  const r = analisarLogs(carregarLog('logs.txt'));
  assert.deepEqual(r.porNivel, { INFO: 3, WARN: 1, ERROR: 1 });
  assert.deepEqual(r.porUsuario, { ana: 2, bruno: 2, carla: 1 });
  assert.equal(Object.keys(r.porAcao).length, 5);
  assert.ok(Object.values(r.porAcao).every((n) => n === 1));
});

test('grupos nomeados extraem os seis campos', () => {
  assert.deepEqual(analisarLinha('01/09/2026 08:15:02 INFO ana 192.168.0.10 login'), {
    data: '01/09/2026', hora: '08:15:02', nivel: 'INFO', usuario: 'ana', ip: '192.168.0.10', acao: 'login',
  });
  assert.equal(analisarLinha('linha corrompida sem o formato esperado'), null);
});

test('desafio: arquivo ampliado com 2 válidas e 1 inválida a mais', () => {
  const r = analisarLogs(carregarLog('logs_ampliado.txt'));
  assert.equal(r.validas.length, 7);
  assert.equal(r.rejeitadas.length, 2);
  assert.deepEqual(r.porNivel, { INFO: 4, WARN: 2, ERROR: 1 });
  assert.deepEqual(r.porUsuario, { ana: 3, bruno: 2, carla: 2 });
  assert.equal(r.porAcao.login, 2);
  assert.equal(Object.keys(r.porAcao).length, 6);
});

test('desafio: IP fora de faixa, data impossível e hora impossível são rejeitados', () => {
  const r = analisarLogs(carregarLog('logs_semantica.txt'));
  assert.equal(r.validas.length, 0);
  assert.equal(r.rejeitadas.length, 3);
  const motivos = r.rejeitadas.map((x) => x.motivo).join(' | ');
  assert.match(motivos, /IP/);
  assert.match(motivos, /data/);
  assert.match(motivos, /hora/);
});

test('sem validação semântica, as mesmas linhas passam (só sintaxe)', () => {
  const r = analisarLogs(carregarLog('logs_semantica.txt'), { semantica: false });
  assert.equal(r.validas.length, 3);
});

test('validarSemantica devolve null para campos corretos', () => {
  assert.equal(validarSemantica({ data: '01/09/2026', hora: '08:15:02', ip: '192.168.0.10' }), null);
});

test('borda: CRLF do Windows e linhas em branco no fim não alteram o resultado', () => {
  const crlf = carregarLog('logs.txt').replace(/\n/g, '\r\n') + '\r\n\r\n';
  const r = analisarLogs(crlf);
  assert.equal(r.validas.length, 5);
  assert.equal(r.rejeitadas.length, 1);
  assert.deepEqual(r.porNivel, { INFO: 3, WARN: 1, ERROR: 1 });
});
