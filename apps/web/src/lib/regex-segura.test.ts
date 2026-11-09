import { test } from 'node:test';
import assert from 'node:assert/strict';
import { literalRegex, testarEmWorker, definirFabricaWorker, MSG_TEMPO_EXCEDIDO } from './regex-segura.ts';

test('literalRegex não lança com regex inválida (o usuário digita caractere a caractere)', () => {
  assert.equal(literalRegex('(', ''), '/(/');
  assert.equal(literalRegex('[a-', 'g'), '/[a-/g');
});

test('literalRegex escapa a barra como no código-fonte', () => {
  assert.equal(literalRegex('a/b', 'g'), '/a\\/b/g');
});

/**
 * Worker falso que, como o real, processa UM pedido por vez. O padrão 'lento'
 * nunca termina (simula backtracking catastrófico) até o worker ser encerrado.
 */
function fabricaFalsa() {
  return () => {
    const ouvintes = new Set<(ev: { data: unknown }) => void>();
    const fila: any[] = [];
    let ocupado = false;
    let morto = false;
    const processar = () => {
      if (ocupado || morto || fila.length === 0) return;
      const p = fila.shift();
      if (p.padrao === 'lento') {
        ocupado = true; // trava para sempre
        return;
      }
      ocupado = true;
      setTimeout(() => {
        ocupado = false;
        if (morto) return;
        const re = new RegExp(p.padrao, p.flags);
        for (const f of ouvintes) f({ data: { id: p.id, ok: true, testes: p.textos.map((t: string) => re.test(t)) } });
        processar();
      }, 1);
    };
    return {
      addEventListener: (_: string, f: any) => ouvintes.add(f),
      removeEventListener: (_: string, f: any) => ouvintes.delete(f),
      postMessage: (p: unknown) => {
        fila.push(p);
        processar();
      },
      terminate: () => {
        morto = true;
      },
    } as unknown as Worker;
  };
}

test('regex rápida enfileirada atrás de uma lenta não é acusada de ReDoS', async () => {
  definirFabricaWorker(fabricaFalsa());
  const [lenta, rapida] = await Promise.all([testarEmWorker('lento', '', ['a'], 50), testarEmWorker('^a$', '', ['a'], 50)]);
  assert.deepEqual(lenta, { erro: MSG_TEMPO_EXCEDIDO });
  assert.deepEqual(rapida, [true]);
});
