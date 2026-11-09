import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisar, construirThompson, aceita, NaoFormal, classificar } from './thompson.ts';

const afnDe = (p: string) => construirThompson(analisar(p).ast);

test('símbolo único: 2 estados e 1 transição', () => {
  const a = afnDe('a');
  assert.equal(a.estados.length, 2);
  assert.equal(a.transicoes.length, 1);
  assert.equal(a.transicoes[0].rotulo, 'a');
});

test('contagem de estados segue a construção de Thompson', () => {
  assert.equal(afnDe('ab').estados.length, 4); // concat liga com ε
  assert.equal(afnDe('a|b').estados.length, 6);
  assert.equal(afnDe('a*').estados.length, 4);
  assert.equal(afnDe('(a|b)*abb').estados.length, 14);
});

test('(a|b)*abb aceita exatamente as cadeias que terminam em abb', () => {
  const a = afnDe('(a|b)*abb');
  for (const s of ['abb', 'aabb', 'babb', 'ababb']) assert.equal(aceita(a, s), true, s);
  for (const s of ['', 'ab', 'abba', 'bbb', 'abbc']) assert.equal(aceita(a, s), false, s);
});

/** Gerador pseudoaleatório determinístico (testes reprodutíveis). */
function rng(semente: number) {
  let x = semente;
  return () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

const PADROES = [
  'a', 'ab', 'a|b', 'a*', 'a+', 'a?', '(ab)*', '(a|b)*abb', 'a(b|c)+d?', '[a-c]+', '[^a]b', 'a.c', '(a|)b',
  'a{2}', 'a{1,3}', 'a{2,}', '(ab|c){0,2}', '\\d+', 'x\\.y', '((a|b)c)*', '^a+b$', '(?:ab)+', '(?<g>a|b)c', 'a*?b',
];

test('equivalência: o AFN aceita exatamente o que a RegExp ancorada aceita', () => {
  const r = rng(42);
  const alfabeto = 'abcdxy.1';
  for (const p of PADROES) {
    const afn = afnDe(p);
    const corpo = p.replace(/^\^/, '').replace(/\$$/, '');
    const re = new RegExp(`^(?:${corpo})$`);
    for (let i = 0; i < 300; i++) {
      const tam = Math.floor(r() * 7);
      let s = '';
      for (let k = 0; k < tam; k++) s += alfabeto[Math.floor(r() * alfabeto.length)];
      assert.equal(aceita(afn, s), re.test(s), `padrão /${p}/ com "${s}"`);
    }
  }
});

test('retro-referência é recusada: a linguagem pode não ser regular', () => {
  for (const p of ['(a)\\1', '(?<p>a+)\\k<p>']) {
    assert.throws(() => analisar(p), (e: unknown) => e instanceof NaoFormal && e.regular === false);
  }
});

test('retro-referência tem prioridade: mesmo com \\b ou lookaround antes, o padrão é "pode não ser regular"', () => {
  assert.equal(classificar(String.raw`\b(?<p>[a-z]+) \k<p>\b`).tipo, 'nao-regular');
  assert.equal(classificar(String.raw`(?=a)(b)\1`).tipo, 'nao-regular');
  // \1 dentro de classe não é retro-referência
  assert.notEqual(classificar(String.raw`[\1]a`).tipo, 'nao-regular');
});

test('lookaround, \\b e âncora no meio ficam fora da notação formal, mas não deixam de ser regulares', () => {
  for (const p of ['a(?=b)', 'a(?!b)', '(?<=a)b', '(?<!a)b', '\\ba', 'a^b']) {
    assert.throws(() => analisar(p), (e: unknown) => e instanceof NaoFormal && e.regular === true, p);
  }
});

test('âncoras só no começo e no fim são aceitas e anotadas', () => {
  const r = analisar('^ab$');
  assert.ok(r.notas.some((n) => /âncora/i.test(n)));
});

test('regex inválida gera erro de sintaxe (não NaoFormal)', () => {
  for (const p of ['(a', 'a)', '[ab', '*a']) {
    assert.throws(() => analisar(p), (e: unknown) => !(e instanceof NaoFormal), p);
  }
});

test('repetição grande demais para desenhar é recusada com explicação', () => {
  assert.throws(() => afnDe('a{50}'), /grande/);
});

test('classificar resume a natureza do padrão para o aviso do playground', () => {
  assert.equal(classificar('(a|b)*abb').tipo, 'formal');
  assert.equal(classificar('(a)\\1').tipo, 'nao-regular');
  assert.equal(classificar('a(?=b)').tipo, 'fora-da-notacao');
  assert.equal(classificar('(').tipo, 'invalida');
});

test('layout: todos os estados têm coordenadas dentro da área desenhável', () => {
  const a = afnDe('(a|b)*abb');
  for (const e of a.estados) {
    assert.ok(e.x >= 0 && e.x <= a.largura && e.y >= 0 && e.y <= a.altura, JSON.stringify(e));
  }
});
