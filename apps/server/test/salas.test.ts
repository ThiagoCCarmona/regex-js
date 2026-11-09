import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GerenciadorSalas } from '../src/salas.ts';

function salaComJogador() {
  const g = new GerenciadorSalas();
  const sala = g.criarSala()!;
  const r = sala.entrar('Ana');
  assert.equal(r.ok, true);
  return { g, sala, id: r.ok ? r.jogador.id : '' };
}

test('sala recebe PIN de 4 dígitos e pode ser encontrada pelo PIN', () => {
  const g = new GerenciadorSalas();
  const sala = g.criarSala()!;
  assert.match(sala.pin, /^[0-9]{4}$/);
  assert.equal(g.obter(sala.pin), sala);
  assert.equal(g.obter('0000x'), undefined);
});

test('apelido: obrigatório, até 16 caracteres e único na sala', () => {
  const { sala } = salaComJogador();
  assert.equal(sala.entrar('   ').ok, false);
  assert.equal(sala.entrar('x'.repeat(17)).ok, false);
  assert.equal(sala.entrar('ana').ok, false, 'duplicado (sem diferenciar maiúsculas)');
  assert.equal(sala.entrar('  Bruno ').ok, true);
});

test('envio só é aceito durante uma rodada', () => {
  const { sala, id } = salaComJogador();
  assert.match(sala.tentarEnvio(id, 1000) ?? '', /rodada/);
  sala.iniciarRodada(1000);
  assert.equal(sala.tentarEnvio(id, 1000), null);
});

test('limite de 1 envio por segundo por jogador', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  assert.equal(sala.tentarEnvio(id, 100), null);
  sala.registrarResultado(id, false, 5, 100);
  assert.match(sala.tentarEnvio(id, 600) ?? '', /1 segundo/i);
  assert.equal(sala.tentarEnvio(id, 1200), null);
});

test('pontos só no primeiro acerto da rodada', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  const p1 = sala.registrarResultado(id, true, 5, 30_000);
  assert.equal(p1, 1000);
  assert.equal(sala.registrarResultado(id, true, 5, 31_000), 0);
  assert.equal(sala.ranking()[0].pontos, 1000);
});

test('erro não pontua; envio após o fim do tempo é recusado', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  assert.equal(sala.registrarResultado(id, false, 5, 10_000), 0);
  assert.match(sala.tentarEnvio(id, 61_000) ?? '', /encerrad|rodada/);
});

test('rodadas seguem a ordem dos desafios sem repetir', () => {
  const { sala } = salaComJogador();
  const a = sala.iniciarRodada(0).desafio.id;
  sala.encerrarRodada();
  const b = sala.iniciarRodada(70_000).desafio.id;
  assert.notEqual(a, b);
});

test('ranking ordena por pontos decrescentes', () => {
  const g = new GerenciadorSalas();
  const sala = g.criarSala()!;
  const ana = sala.entrar('Ana');
  const bia = sala.entrar('Bia');
  assert.ok(ana.ok && bia.ok);
  sala.iniciarRodada(0);
  if (ana.ok && bia.ok) {
    sala.registrarResultado(ana.jogador.id, true, 50, 59_000);
    sala.registrarResultado(bia.jogador.id, true, 3, 1_000);
  }
  assert.deepEqual(sala.ranking().map((j) => j.apelido), ['Bia', 'Ana']);
});

test('criarSala devolve null quando o limite de salas é atingido (não trava procurando PIN)', () => {
  const g = new GerenciadorSalas({ maxSalas: 3 });
  assert.ok(g.criarSala());
  assert.ok(g.criarSala());
  assert.ok(g.criarSala());
  assert.equal(g.criarSala(), null);
});

test('mesmo com todas as 9000 PINs ocupadas, criarSala termina e devolve null', () => {
  const g = new GerenciadorSalas({ maxSalas: 20_000 });
  for (let i = 0; i < 9000; i++) assert.ok(g.criarSala());
  assert.equal(g.criarSala(), null);
});

test('sala recusa jogadores acima do limite', () => {
  const g = new GerenciadorSalas({ maxJogadores: 2 });
  const sala = g.criarSala()!;
  assert.equal(sala.entrar('a').ok, true);
  assert.equal(sala.entrar('b').ok, true);
  assert.equal(sala.entrar('c').ok, false);
});

test('só uma avaliação pendente por jogador', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  assert.equal(sala.tentarEnvio(id, 100), null);
  assert.match(sala.tentarEnvio(id, 5_000) ?? '', /avalia/i, 'ainda avaliando o envio anterior');
  sala.registrarResultado(id, false, 5, 100);
  assert.equal(sala.tentarEnvio(id, 5_100), null);
});

test('pontuação usa o horário do envio, mesmo que a avaliação termine depois do fim', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  assert.equal(sala.tentarEnvio(id, 59_900), null);
  sala.encerrarRodada(); // a rodada termina enquanto a regex ainda é avaliada
  assert.ok(sala.registrarResultado(id, true, 5, 59_900) > 0);
});
