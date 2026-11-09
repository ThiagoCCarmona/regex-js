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

test('apelido impróprio é recusado com mensagem neutra', () => {
  const g = new GerenciadorSalas();
  const sala = g.criarSala()!;
  const r = sala.entrar('P0rr4');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.erro, /outro apelido/i);
});

test('telão remove um jogador pelo apelido; ele não volta com o mesmo apelido nem id', () => {
  const g = new GerenciadorSalas();
  const sala = g.criarSala()!;
  const r = sala.entrar('Zoeira');
  assert.ok(r.ok);
  const removido = sala.removerPorApelido('zoeira');
  assert.equal(removido, r.ok ? r.jogador.id : '');
  assert.equal(sala.jogadores.size, 0);
  assert.equal(sala.entrar('Zoeira').ok, false);
  assert.equal(sala.estaBanido(r.ok ? r.jogador.id : ''), true);
  assert.equal(sala.removerPorApelido('ninguem'), null);
});

test('partida tem número de rodadas configurável (padrão 5) e a última é sinalizada', () => {
  const { sala } = salaComJogador();
  assert.equal(sala.totalRodadas, 5);
  sala.configurarRodadas(3);
  assert.equal(sala.totalRodadas, 3);
  sala.iniciarRodada(0);
  assert.equal(sala.ehUltimaRodada(), false);
  sala.encerrarRodada();
  sala.iniciarRodada(70_000);
  sala.encerrarRodada();
  sala.iniciarRodada(140_000);
  assert.equal(sala.ehUltimaRodada(), true);
  sala.encerrarRodada();
  assert.equal(sala.partidaEncerrada(), true);
});

test('não configura rodadas no meio da partida; valores fora de 1..20 são recusados', () => {
  const { sala } = salaComJogador();
  assert.equal(sala.configurarRodadas(0), false);
  assert.equal(sala.configurarRodadas(21), false);
  sala.iniciarRodada(0);
  assert.equal(sala.configurarRodadas(8), false);
});

test('nova partida zera pontos e rodadas, mantendo os jogadores', () => {
  const { sala, id } = salaComJogador();
  sala.iniciarRodada(0);
  sala.tentarEnvio(id, 100);
  sala.registrarResultado(id, true, 5, 100);
  sala.encerrarRodada();
  sala.novaPartida();
  assert.equal(sala.rodada, null);
  assert.equal(sala.ranking()[0].pontos, 0);
  assert.equal(sala.jogadores.size, 1);
  assert.equal(sala.partidaEncerrada(), false);
});
