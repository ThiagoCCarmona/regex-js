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
