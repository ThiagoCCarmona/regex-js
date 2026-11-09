import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { construirApp } from '../src/app.ts';
import { encerrarAvaliador } from '../src/avaliador.ts';

let app: FastifyInstance;
let dir: string;
const abertos: WebSocket[] = [];

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'regexjs-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Regex JS</title>');
  app = await construirApp({ dirEstatico: dir, logger: false });
  await app.ready();
});

after(async () => {
  for (const ws of abertos) ws.terminate();
  await app.close();
  await encerrarAvaliador();
  rmSync(dir, { recursive: true, force: true });
});

/** Coleta mensagens JSON do socket e permite esperar por um tipo. */
function cliente(ws: WebSocket) {
  abertos.push(ws);
  const recebidas: any[] = [];
  const esperando: Array<{ t: string; resolver: (m: any) => void }> = [];
  ws.on('message', (dados) => {
    const msg = JSON.parse(String(dados));
    const i = esperando.findIndex((e) => e.t === msg.t);
    if (i >= 0) esperando.splice(i, 1)[0].resolver(msg);
    else recebidas.push(msg);
  });
  return {
    enviar: (m: object) => ws.send(JSON.stringify(m)),
    esperar: (t: string) =>
      new Promise<any>((resolver, rejeitar) => {
        const i = recebidas.findIndex((m) => m.t === t);
        if (i >= 0) return resolver(recebidas.splice(i, 1)[0]);
        esperando.push({ t, resolver });
        setTimeout(() => rejeitar(new Error(`timeout esperando ${t}`)), 2000).unref();
      }),
  };
}

test('GET /health responde ok', async () => {
  const r = await app.inject({ url: '/health' });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { ok: true });
});

test('rotas do SPA caem no index.html', async () => {
  const r = await app.inject({ url: '/arena/telao' });
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Regex JS/);
});

test('arquivo estático inexistente com extensão devolve 404', async () => {
  const r = await app.inject({ url: '/assets/inexistente.js' });
  assert.equal(r.statusCode, 404);
});

test('fluxo da Arena: host cria sala, jogador entra, rodada e acerto pontuado', async () => {
  const host = cliente(await app.injectWS('/ws'));
  host.enviar({ t: 'host:criar' });
  const { pin } = await host.esperar('sala:criada');
  assert.match(pin, /^[0-9]{4}$/);

  const jog = cliente(await app.injectWS('/ws'));
  jog.enviar({ t: 'jogador:entrar', pin, apelido: 'Ana' });
  const entrou = await jog.esperar('jogador:entrou');
  assert.equal(entrou.apelido, 'Ana');

  host.enviar({ t: 'host:iniciar-rodada', desafioId: 'nivel' });
  const inicio = await jog.esperar('rodada:inicio');
  assert.equal(inicio.desafio.titulo, 'Níveis de log');
  assert.equal(inicio.desafio.solucao, undefined, 'solução não pode vazar para o jogador');

  jog.enviar({ t: 'jogador:enviar', padrao: '^(INFO|WARN|ERROR)$', flags: '' });
  const res = await jog.esperar('resultado');
  assert.equal(res.correto, true);
  assert.ok(res.pontos > 0);

  const fim = await host.esperar('rodada:fim');
  assert.equal(fim.solucao, '^(INFO|WARN|ERROR)$');
  assert.equal(fim.ranking[0].apelido, 'Ana');
});

test('jogador recebe erro ao entrar com PIN inexistente', async () => {
  const jog = cliente(await app.injectWS('/ws'));
  jog.enviar({ t: 'jogador:entrar', pin: '0000', apelido: 'Bia' });
  const erro = await jog.esperar('erro');
  assert.match(erro.msg, /sala/i);
});

test('mensagem malformada não derruba a conexão', async () => {
  const ws = await app.injectWS('/ws');
  const c = cliente(ws);
  ws.send('isto não é json');
  const erro = await c.esperar('erro');
  assert.ok(erro.msg);
});

test('telão recebe um token secreto junto com o PIN', async () => {
  const host = cliente(await app.injectWS('/ws'));
  host.enviar({ t: 'host:criar' });
  const criada = await host.esperar('sala:criada');
  assert.match(criada.token, /^[0-9a-f-]{20,}$/);
});

test('segundo host:criar no mesmo socket libera a sala anterior', async () => {
  const host = cliente(await app.injectWS('/ws'));
  host.enviar({ t: 'host:criar' });
  const { pin: antigo } = await host.esperar('sala:criada');
  host.enviar({ t: 'host:criar' });
  await host.esperar('sala:criada');
  const jog = cliente(await app.injectWS('/ws'));
  jog.enviar({ t: 'jogador:entrar', pin: antigo, apelido: 'Zé' });
  const erro = await jog.esperar('erro');
  assert.equal(erro.codigo, 'SALA_INEXISTENTE');
});

test('host:retomar sem o token correto é recusado', async () => {
  const host = cliente(await app.injectWS('/ws'));
  host.enviar({ t: 'host:criar' });
  const { pin } = await host.esperar('sala:criada');
  const intruso = cliente(await app.injectWS('/ws'));
  intruso.enviar({ t: 'host:retomar', pin, token: 'chute' });
  const erro = await intruso.esperar('erro');
  assert.equal(erro.codigo, 'NAO_AUTORIZADO');
});

test('telão que perdeu o controle (retomado em outra aba) não comanda mais a sala', async () => {
  const a = cliente(await app.injectWS('/ws'));
  a.enviar({ t: 'host:criar' });
  const { pin, token } = await a.esperar('sala:criada');
  const b = cliente(await app.injectWS('/ws'));
  b.enviar({ t: 'host:retomar', pin, token });
  await b.esperar('sala:criada');
  a.enviar({ t: 'host:iniciar-rodada' });
  const erro = await a.esperar('erro');
  assert.equal(erro.codigo, 'NAO_AUTORIZADO');
});

test('envio fora de rodada devolve erro com código, sem derrubar o jogador', async () => {
  const host = cliente(await app.injectWS('/ws'));
  host.enviar({ t: 'host:criar' });
  const { pin } = await host.esperar('sala:criada');
  const jog = cliente(await app.injectWS('/ws'));
  jog.enviar({ t: 'jogador:entrar', pin, apelido: 'Lu' });
  await jog.esperar('jogador:entrou');
  jog.enviar({ t: 'jogador:enviar', padrao: 'a', flags: '' });
  const erro = await jog.esperar('erro');
  assert.equal(erro.codigo, 'ENVIO_RECUSADO');
});
