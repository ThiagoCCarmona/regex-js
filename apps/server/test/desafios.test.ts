import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DESAFIOS } from '../src/desafios.ts';
import { avaliarRegex, encerrarAvaliador } from '../src/avaliador.ts';

after(() => encerrarAvaliador());

test('há pelo menos 10 desafios cobrindo as 6 etapas, com ids únicos', () => {
  assert.ok(DESAFIOS.length >= 10);
  assert.deepEqual([...new Set(DESAFIOS.map((d) => d.etapa))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(DESAFIOS.map((d) => d.id)).size, DESAFIOS.length);
});

for (const d of DESAFIOS) {
  test(`desafio "${d.titulo}" é resolvido pela solução de referência`, async () => {
    const r = await avaliarRegex(d.solucao, '', d.deveCasar, d.naoDeveCasar);
    assert.equal(r.ok && r.correto, true, JSON.stringify(r));
  });
}

test('cada desafio tem casos ocultos e a solução de referência passa neles também', async () => {
  for (const d of DESAFIOS) {
    assert.ok(d.deveOculto.length + d.naoDeveOculto.length >= 2, `${d.id}: poucos casos ocultos`);
    const r = await avaliarRegex(d.solucao, '', [...d.deveCasar, ...d.deveOculto], [...d.naoDeveCasar, ...d.naoDeveOculto]);
    assert.equal(r.ok && r.correto, true, `${d.id}: ${JSON.stringify(r)}`);
  }
});

test('listar as palavras visíveis não vence desafios com casos ocultos positivos', async () => {
  for (const d of DESAFIOS.filter((x) => x.deveOculto.length > 0)) {
    const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
    const lista = '^(' + d.deveCasar.map(escapar).join('|') + ')$';
    const r = await avaliarRegex(lista, '', [...d.deveCasar, ...d.deveOculto], [...d.naoDeveCasar, ...d.naoDeveOculto]);
    assert.equal(r.ok && r.correto, false, d.id);
  }
});

test('CPF: ponto sem escape é pego pelos casos do desafio', async () => {
  const d = DESAFIOS.find((x) => x.id === 'cpf')!;
  const r = await avaliarRegex(String.raw`^\d{3}.\d{3}.\d{3}-\d{2}$`, '', [...d.deveCasar, ...d.deveOculto], [...d.naoDeveCasar, ...d.naoDeveOculto]);
  assert.equal(r.ok && r.correto, false);
  assert.ok(d.naoDeveCasar.includes('123-456-789-00'));
});
