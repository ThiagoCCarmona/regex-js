import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarRegex, encerrarAvaliador } from '../src/avaliador.ts';

after(() => encerrarAvaliador());

test('regex correta: casa todas as "deve" e nenhuma "não deve"', async () => {
  const r = await avaliarRegex('^[0-9]+$', '', ['12', '7'], ['a1', '']);
  assert.deepEqual(r, { ok: true, acertosDeve: [true, true], acertosNaoDeve: [false, false], correto: true });
});

test('regex parcial: correto=false e indica quais falharam', async () => {
  const r = await avaliarRegex('[0-9]', '', ['12'], ['a1']);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.correto, false);
    assert.deepEqual(r.acertosNaoDeve, [true]);
  }
});

test('flag i é aceita', async () => {
  const r = await avaliarRegex('^info$', 'i', ['INFO'], ['WARN']);
  assert.equal(r.ok && r.correto, true);
});

test('regex com erro de sintaxe é recusada com mensagem', async () => {
  const r = await avaliarRegex('(', '', ['a'], []);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.erro, /inválida/i);
});

test('padrão com mais de 100 caracteres é recusado', async () => {
  const r = await avaliarRegex('a'.repeat(101), '', ['a'], []);
  assert.equal(r.ok, false);
});

test('flags fora de i/u são recusadas', async () => {
  const r = await avaliarRegex('a', 'g', ['a'], []);
  assert.equal(r.ok, false);
});

test('ReDoS: (a+)+$ é interrompida por timeout e o avaliador continua funcionando', async () => {
  const inicio = Date.now();
  const r = await avaliarRegex('(a+)+$', '', ['a'.repeat(32) + '!'], []);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.erro, /Tempo excedido/);
  assert.ok(Date.now() - inicio < 1500, 'demorou demais para abortar');

  const depois = await avaliarRegex('^a$', '', ['a'], ['b']);
  assert.equal(depois.ok && depois.correto, true);
});

test('avaliações simultâneas retornam cada uma o seu resultado', async () => {
  const [a, b] = await Promise.all([
    avaliarRegex('^a$', '', ['a'], []),
    avaliarRegex('^b$', '', ['a'], []),
  ]);
  assert.equal(a.ok && a.correto, true);
  assert.equal(b.ok && b.correto, false);
});
