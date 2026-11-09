import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarEstado, iniciarJogo, passo, disparar, larguraEstimada, ALTURA, VIDAS_INICIAIS, ALVOS_POR_FASE, type Estado } from './motor.ts';
import { FASES } from './fases.ts';

const sempre = (v: number) => () => v;

function comPalavras(palavras: Estado['palavras']): Estado {
  return { ...iniciarJogo(criarEstado()), palavras, ateSurgir: 99_999 };
}

test('há 6 fases e cada uma tem inimigas e aliadas', () => {
  assert.equal(FASES.length, 6);
  for (const f of FASES) {
    assert.ok(f.inimigas.length >= 3 && f.aliadas.length >= 3, f.nome);
  }
});

test('estado inicial: tela de início, 3 vidas, 0 pontos', () => {
  const e = criarEstado();
  assert.equal(e.status, 'inicio');
  assert.equal(e.vidas, VIDAS_INICIAIS);
  assert.equal(e.pontos, 0);
});

test('passo faz surgir uma palavra quando o intervalo termina', () => {
  const e = { ...iniciarJogo(criarEstado()), ateSurgir: 10 };
  const d = passo(e, 20, sempre(0.1));
  assert.equal(d.palavras.length, 1);
  assert.equal(d.palavras[0].inimiga, true, 'aleatório baixo sorteia inimiga');
});

test('palavras caem com o tempo', () => {
  const e = comPalavras([{ id: 1, texto: 'total', inimiga: true, x: 10, y: 0, atingida: 0 }]);
  const d = passo(e, 1000, sempre(0.5));
  assert.ok(d.palavras[0].y > 0);
});

test('inimiga que chega ao chão tira uma vida', () => {
  const e = comPalavras([{ id: 1, texto: 'total', inimiga: true, x: 10, y: ALTURA - 0.01, atingida: 0 }]);
  const d = passo(e, 1000, sempre(0.5));
  assert.equal(d.vidas, VIDAS_INICIAIS - 1);
  assert.equal(d.palavras.length, 0);
});

test('aliada que chega ao chão não tira vida', () => {
  const e = comPalavras([{ id: 1, texto: '2valor', inimiga: false, x: 10, y: ALTURA - 0.01, atingida: 0 }]);
  const d = passo(e, 1000, sempre(0.5));
  assert.equal(d.vidas, VIDAS_INICIAIS);
});

test('disparo destrói inimigas atingidas e soma pontos', () => {
  const e = comPalavras([
    { id: 1, texto: 'total', inimiga: true, x: 10, y: 10, atingida: 0 },
    { id: 2, texto: '_x', inimiga: true, x: 40, y: 10, atingida: 0 },
  ]);
  const d = disparar(e, [1, 2]);
  assert.equal(d.pontos, 250, '100 + 100 + bônus de 50 pelo combo');
  assert.equal(d.destruidasFase, 2);
});

test('disparo que atinge aliada custa uma vida por aliada', () => {
  const e = comPalavras([
    { id: 1, texto: '2valor', inimiga: false, x: 10, y: 10, atingida: 0 },
    { id: 2, texto: 'total', inimiga: true, x: 40, y: 10, atingida: 0 },
  ]);
  const d = disparar(e, [1, 2]);
  assert.equal(d.vidas, VIDAS_INICIAIS - 1);
  assert.equal(d.pontos, 100);
});

test('ids que já saíram da tela são ignorados', () => {
  const e = comPalavras([]);
  const d = disparar(e, [42]);
  assert.equal(d.pontos, 0);
  assert.equal(d.vidas, VIDAS_INICIAIS);
});

test('perder todas as vidas encerra o jogo', () => {
  const e = { ...comPalavras([{ id: 1, texto: '2valor', inimiga: false, x: 10, y: 10, atingida: 0 }]), vidas: 1 };
  assert.equal(disparar(e, [1]).status, 'fim');
});

test(`destruir ${ALVOS_POR_FASE} inimigas passa de fase`, () => {
  const e = { ...comPalavras([{ id: 1, texto: 'total', inimiga: true, x: 10, y: 10, atingida: 0 }]), destruidasFase: ALVOS_POR_FASE - 1 };
  const d = disparar(e, [1]);
  assert.equal(d.status, 'entreFases');
});

test('vencer a última fase leva à vitória', () => {
  const e = {
    ...comPalavras([{ id: 1, texto: '==', inimiga: true, x: 10, y: 10, atingida: 0 }]),
    fase: FASES.length - 1,
    destruidasFase: ALVOS_POR_FASE - 1,
  };
  assert.equal(disparar(e, [1]).status, 'vitoria');
});

test('fora do status jogando, passo e disparo não alteram nada', () => {
  const e = criarEstado();
  assert.equal(passo(e, 1000, sempre(0.1)), e);
  assert.equal(disparar(e, [1]), e);
});

test('cada fase é vencível pela sua solução de referência', () => {
  for (const f of FASES) {
    const re = new RegExp(f.solucao);
    assert.ok(f.inimigas.every((s) => re.test(s)), `${f.nome}: alguma inimiga não casa`);
    assert.ok(!f.aliadas.some((s) => re.test(s)), `${f.nome}: alguma aliada casa`);
  }
});

test('palavra longa surge inteira dentro da arena (não corta na borda direita)', () => {
  const e = { ...iniciarJogo(criarEstado()), fase: 2, ateSurgir: 1 };
  // aleatório alto: sorteia aliada (>= 0.6), a última da lista e a posição mais à direita
  const d = passo(e, 10, () => 0.999);
  const p = d.palavras[0];
  assert.ok(p.x + larguraEstimada(p.texto) <= 97, `x=${p.x} texto=${p.texto}`);
});
