/**
 * Protocolo WebSocket da Regex Arena (mensagens JSON com campo `t`).
 *
 * Cliente → servidor
 *   host:criar                         cria sala; responde sala:criada {pin}
 *   host:retomar {pin}                 telão recarregado volta a controlar a sala
 *   host:iniciar-rodada {desafioId?}   começa a próxima rodada
 *   host:encerrar-rodada               termina a rodada antes do tempo
 *   jogador:entrar {pin, apelido, id?} entra (ou reconecta com o id salvo)
 *   jogador:enviar {padrao, flags}     envia uma regex para avaliação
 *
 * Servidor → cliente
 *   sala:criada, sala:estado, jogador:entrou, rodada:inicio, rodada:fim,
 *   resultado, erro {msg}
 */
import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { avaliarRegex } from './avaliador.ts';
import { DESAFIOS, type Desafio } from './desafios.ts';
import { DURACAO_RODADA_MS, GerenciadorSalas, type Sala } from './salas.ts';

const REMOVER_SALA_SEM_HOST_MS = 5 * 60_000;

interface SalaAoVivo {
  sala: Sala;
  host: WebSocket | null;
  jogadores: Map<string, WebSocket>;
  timerFim: NodeJS.Timeout | null;
  timerRemocao: NodeJS.Timeout | null;
}

interface Contexto {
  papel: 'host' | 'jogador' | null;
  pin: string | null;
  jogadorId: string | null;
}

const desafioPublico = ({ solucao: _s, ...resto }: Desafio) => resto;

export function registrarArena(app: FastifyInstance): void {
  const gerenciador = new GerenciadorSalas();
  const aoVivo = new Map<string, SalaAoVivo>();

  const enviar = (ws: WebSocket | null | undefined, msg: object) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  };

  const todos = (v: SalaAoVivo) => [v.host, ...v.jogadores.values()];

  function estado(v: SalaAoVivo) {
    const r = v.sala.rodada;
    return {
      t: 'sala:estado',
      pin: v.sala.pin,
      agora: Date.now(),
      totalJogadores: v.sala.jogadores.size,
      totalDesafios: DESAFIOS.length,
      ranking: v.sala.ranking(),
      rodada: r
        ? {
            numero: r.numero,
            fimEm: r.fimEm,
            ativa: v.sala.rodadaAtiva(Date.now()),
            acertos: v.sala.ranking().filter((j) => j.acertou).length,
            desafio: desafioPublico(r.desafio),
          }
        : null,
    };
  }

  const avisarHost = (v: SalaAoVivo) => enviar(v.host, estado(v));

  function encerrarRodada(v: SalaAoVivo) {
    if (v.timerFim) clearTimeout(v.timerFim);
    v.timerFim = null;
    const r = v.sala.rodada;
    if (!r || r.encerrada) return;
    v.sala.encerrarRodada();
    const msg = { t: 'rodada:fim', numero: r.numero, solucao: r.desafio.solucao, desafio: desafioPublico(r.desafio), ranking: v.sala.ranking() };
    for (const ws of todos(v)) enviar(ws, msg);
  }

  function msgInicio(v: SalaAoVivo) {
    const r = v.sala.rodada!;
    return { t: 'rodada:inicio', numero: r.numero, desafio: desafioPublico(r.desafio), fimEm: r.fimEm, duracaoMs: DURACAO_RODADA_MS, agora: Date.now() };
  }

  async function tratar(ws: WebSocket, ctx: Contexto, msg: any) {
    const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;

    switch (msg?.t) {
      case 'host:criar': {
        const sala = gerenciador.criarSala();
        const nova: SalaAoVivo = { sala, host: ws, jogadores: new Map(), timerFim: null, timerRemocao: null };
        aoVivo.set(sala.pin, nova);
        Object.assign(ctx, { papel: 'host', pin: sala.pin, jogadorId: null });
        enviar(ws, { t: 'sala:criada', pin: sala.pin });
        avisarHost(nova);
        return;
      }
      case 'host:retomar': {
        const alvo = aoVivo.get(String(msg.pin));
        if (!alvo) return enviar(ws, { t: 'erro', msg: 'Sala não encontrada' });
        if (alvo.timerRemocao) clearTimeout(alvo.timerRemocao);
        alvo.timerRemocao = null;
        alvo.host = ws;
        Object.assign(ctx, { papel: 'host', pin: alvo.sala.pin, jogadorId: null });
        enviar(ws, { t: 'sala:criada', pin: alvo.sala.pin });
        avisarHost(alvo);
        return;
      }
      case 'host:iniciar-rodada': {
        if (ctx.papel !== 'host' || !v) return enviar(ws, { t: 'erro', msg: 'Apenas o telão controla as rodadas' });
        if (v.sala.rodadaAtiva(Date.now())) return enviar(ws, { t: 'erro', msg: 'Já existe uma rodada em andamento' });
        v.sala.iniciarRodada(Date.now(), typeof msg.desafioId === 'string' ? msg.desafioId : undefined);
        const inicio = msgInicio(v);
        for (const alvo of todos(v)) enviar(alvo, inicio);
        v.timerFim = setTimeout(() => {
          encerrarRodada(v);
          avisarHost(v);
        }, DURACAO_RODADA_MS);
        v.timerFim.unref();
        avisarHost(v);
        return;
      }
      case 'host:encerrar-rodada': {
        if (ctx.papel !== 'host' || !v) return;
        encerrarRodada(v);
        avisarHost(v);
        return;
      }
      case 'jogador:entrar': {
        const alvo = aoVivo.get(String(msg.pin ?? '').trim());
        if (!alvo) return enviar(ws, { t: 'erro', msg: 'Sala não encontrada. Confira o PIN no telão.' });
        let jogador = typeof msg.id === 'string' ? alvo.sala.jogadores.get(msg.id) : undefined;
        if (!jogador) {
          const r = alvo.sala.entrar(String(msg.apelido ?? ''));
          if (!r.ok) return enviar(ws, { t: 'erro', msg: r.erro });
          jogador = r.jogador;
        }
        alvo.jogadores.set(jogador.id, ws);
        Object.assign(ctx, { papel: 'jogador', pin: alvo.sala.pin, jogadorId: jogador.id });
        enviar(ws, { t: 'jogador:entrou', id: jogador.id, apelido: jogador.apelido, pin: alvo.sala.pin, pontos: jogador.pontos });
        if (alvo.sala.rodadaAtiva(Date.now())) enviar(ws, msgInicio(alvo));
        avisarHost(alvo);
        return;
      }
      case 'jogador:enviar': {
        if (ctx.papel !== 'jogador' || !v || !ctx.jogadorId) return enviar(ws, { t: 'erro', msg: 'Entre numa sala primeiro' });
        const padrao = String(msg.padrao ?? '');
        const flags = String(msg.flags ?? '');
        const bloqueio = v.sala.tentarEnvio(ctx.jogadorId, Date.now());
        if (bloqueio) return enviar(ws, { t: 'erro', msg: bloqueio });
        const { deveCasar, naoDeveCasar } = v.sala.rodada!.desafio;
        const avaliacao = await avaliarRegex(padrao, flags, deveCasar, naoDeveCasar);
        const correto = avaliacao.ok && avaliacao.correto;
        const pontos = v.sala.registrarResultado(ctx.jogadorId, correto, padrao.length, Date.now());
        const total = v.sala.jogadores.get(ctx.jogadorId)?.pontos ?? 0;
        enviar(ws, { t: 'resultado', padrao, ...avaliacao, correto, pontos, total });
        avisarHost(v);
        if (v.sala.todosAcertaram()) {
          encerrarRodada(v);
          avisarHost(v);
        }
        return;
      }
      default:
        enviar(ws, { t: 'erro', msg: 'Mensagem desconhecida' });
    }
  }

  app.get('/ws', { websocket: true }, (socket) => {
    const ctx: Contexto = { papel: null, pin: null, jogadorId: null };

    socket.on('message', (dados) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(dados));
      } catch {
        enviar(socket, { t: 'erro', msg: 'Mensagem inválida (JSON esperado)' });
        return;
      }
      tratar(socket, ctx, msg).catch((e) => {
        app.log.error(e);
        enviar(socket, { t: 'erro', msg: 'Erro interno' });
      });
    });

    socket.on('close', () => {
      const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;
      if (!v) return;
      if (ctx.papel === 'jogador' && ctx.jogadorId && v.jogadores.get(ctx.jogadorId) === socket) {
        v.jogadores.delete(ctx.jogadorId);
      }
      if (ctx.papel === 'host' && v.host === socket) {
        v.host = null;
        v.timerRemocao = setTimeout(() => {
          if (v.timerFim) clearTimeout(v.timerFim);
          for (const ws of v.jogadores.values()) enviar(ws, { t: 'erro', msg: 'A sala foi encerrada' });
          aoVivo.delete(v.sala.pin);
          gerenciador.remover(v.sala.pin);
        }, REMOVER_SALA_SEM_HOST_MS);
        v.timerRemocao.unref();
      }
    });
  });
}
