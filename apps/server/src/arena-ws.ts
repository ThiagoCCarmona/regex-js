/**
 * Protocolo WebSocket da Regex Arena (mensagens JSON com campo `t`).
 *
 * Cliente → servidor
 *   host:criar                         cria sala; responde sala:criada {pin, token}
 *   host:retomar {pin, token}          telão recarregado volta a controlar a sala
 *   host:iniciar-rodada {desafioId?}   começa a próxima rodada
 *   host:encerrar-rodada               termina a rodada antes do tempo
 *   host:remover {apelido}             tira (e bane) um jogador da sala
 *   host:configurar {rodadas}          número de rodadas da partida (antes de começar)
 *   host:nova-partida                  zera pontos e rodadas (jogadores continuam)
 *   jogador:entrar {pin, apelido, id?} entra (ou reconecta com o id salvo)
 *   jogador:enviar {padrao, flags}     envia uma regex para avaliação
 *
 * Servidor → cliente
 *   sala:criada, sala:estado, jogador:entrou, rodada:inicio, rodada:fim,
 *   resultado, erro {codigo, msg}
 *
 * Regras de robustez: cada socket participa de no máximo uma sala; o controle
 * do telão exige o token secreto da sala (o PIN é público, aparece no projetor);
 * a pontuação usa o instante do envio, não o fim da avaliação.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { avaliarRegex } from './avaliador.ts';
import { DESAFIOS, type Desafio } from './desafios.ts';
import { DURACAO_RODADA_MS, GerenciadorSalas, type Limites, type Sala } from './salas.ts';

const REMOVER_SALA_SEM_HOST_MS = 5 * 60_000;

export type CodigoErro =
  | 'SALA_INEXISTENTE'
  | 'SALA_ENCERRADA'
  | 'SALAS_ESGOTADAS'
  | 'NAO_AUTORIZADO'
  | 'ENTRADA_RECUSADA'
  | 'ENVIO_RECUSADO'
  | 'RODADA_EM_ANDAMENTO'
  | 'MENSAGEM_INVALIDA'
  | 'REMOVIDO'
  | 'PARTIDA_ENCERRADA'
  | 'INTERNO';

interface SalaAoVivo {
  sala: Sala;
  token: string;
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

/** O que o celular pode ver do desafio: sem solução e sem os casos ocultos. */
const desafioPublico = ({ solucao: _s, deveOculto: _d, naoDeveOculto: _n, ...resto }: Desafio) => resto;

export function registrarArena(app: FastifyInstance, limites: Limites = {}): void {
  const gerenciador = new GerenciadorSalas(limites);
  const aoVivo = new Map<string, SalaAoVivo>();

  const enviar = (ws: WebSocket | null | undefined, msg: object) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  };
  const erro = (ws: WebSocket, codigo: CodigoErro, msg: string) => enviar(ws, { t: 'erro', codigo, msg });

  const todos = (v: SalaAoVivo) => [v.host, ...v.jogadores.values()];

  function estado(v: SalaAoVivo) {
    const r = v.sala.rodada;
    const ranking = v.sala.ranking();
    return {
      t: 'sala:estado',
      pin: v.sala.pin,
      agora: Date.now(),
      totalJogadores: v.sala.jogadores.size,
      totalDesafios: DESAFIOS.length,
      totalRodadas: v.sala.totalRodadas,
      partidaEncerrada: v.sala.partidaEncerrada(),
      ranking,
      rodada: r
        ? {
            numero: r.numero,
            fimEm: r.fimEm,
            ativa: v.sala.rodadaAtiva(Date.now()),
            acertos: ranking.filter((j) => j.acertou).length,
            desafio: desafioPublico(r.desafio),
          }
        : null,
    };
  }

  const avisarHost = (v: SalaAoVivo) => enviar(v.host, estado(v));

  function removerSala(v: SalaAoVivo) {
    if (v.timerFim) clearTimeout(v.timerFim);
    if (v.timerRemocao) clearTimeout(v.timerRemocao);
    for (const ws of v.jogadores.values()) enviar(ws, { t: 'erro', codigo: 'SALA_ENCERRADA', msg: 'A sala foi encerrada' });
    aoVivo.delete(v.sala.pin);
    gerenciador.remover(v.sala.pin);
  }

  /** Desfaz o vínculo do socket com a sala atual antes de ele mudar de papel/sala. */
  function liberarContexto(ws: WebSocket, ctx: Contexto) {
    const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;
    if (v) {
      if (ctx.papel === 'host' && v.host === ws) removerSala(v);
      if (ctx.papel === 'jogador' && ctx.jogadorId && v.jogadores.get(ctx.jogadorId) === ws) v.jogadores.delete(ctx.jogadorId);
    }
    Object.assign(ctx, { papel: null, pin: null, jogadorId: null });
  }

  function encerrarRodada(v: SalaAoVivo) {
    if (v.timerFim) clearTimeout(v.timerFim);
    v.timerFim = null;
    const r = v.sala.rodada;
    if (!r || r.encerrada) return;
    v.sala.encerrarRodada();
    const msg = {
      t: 'rodada:fim',
      numero: r.numero,
      totalRodadas: v.sala.totalRodadas,
      ultima: v.sala.ehUltimaRodada(),
      solucao: r.desafio.solucao,
      desafio: desafioPublico(r.desafio),
      ocultos: { deve: r.desafio.deveOculto, naoDeve: r.desafio.naoDeveOculto },
      ranking: v.sala.ranking(),
    };
    for (const ws of todos(v)) enviar(ws, msg);
  }

  function msgInicio(v: SalaAoVivo) {
    const r = v.sala.rodada!;
    return {
      t: 'rodada:inicio',
      numero: r.numero,
      totalRodadas: v.sala.totalRodadas,
      desafio: desafioPublico(r.desafio),
      ocultosQtd: r.desafio.deveOculto.length + r.desafio.naoDeveOculto.length,
      fimEm: r.fimEm,
      duracaoMs: DURACAO_RODADA_MS,
      agora: Date.now(),
    };
  }

  /** A sala que este socket controla como telão, ou undefined. */
  function salaDoHost(ws: WebSocket, ctx: Contexto) {
    const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;
    return ctx.papel === 'host' && v && v.host === ws ? v : undefined;
  }

  async function tratar(ws: WebSocket, ctx: Contexto, msg: any) {
    switch (msg?.t) {
      case 'host:criar': {
        liberarContexto(ws, ctx); // um socket controla no máximo uma sala
        const sala = gerenciador.criarSala();
        if (!sala) return erro(ws, 'SALAS_ESGOTADAS', 'O servidor atingiu o limite de salas. Tente mais tarde.');
        const nova: SalaAoVivo = { sala, token: randomUUID(), host: ws, jogadores: new Map(), timerFim: null, timerRemocao: null };
        aoVivo.set(sala.pin, nova);
        Object.assign(ctx, { papel: 'host', pin: sala.pin, jogadorId: null });
        enviar(ws, { t: 'sala:criada', pin: sala.pin, token: nova.token });
        avisarHost(nova);
        return;
      }
      case 'host:retomar': {
        const alvo = aoVivo.get(String(msg.pin ?? ''));
        if (!alvo) return erro(ws, 'SALA_INEXISTENTE', 'Sala não encontrada');
        if (typeof msg.token !== 'string' || msg.token !== alvo.token) {
          return erro(ws, 'NAO_AUTORIZADO', 'Só o telão que criou a sala pode controlá-la');
        }
        if (ctx.pin !== alvo.sala.pin) liberarContexto(ws, ctx);
        if (alvo.timerRemocao) clearTimeout(alvo.timerRemocao);
        alvo.timerRemocao = null;
        alvo.host = ws;
        Object.assign(ctx, { papel: 'host', pin: alvo.sala.pin, jogadorId: null });
        enviar(ws, { t: 'sala:criada', pin: alvo.sala.pin, token: alvo.token });
        avisarHost(alvo);
        if (alvo.sala.rodadaAtiva(Date.now())) enviar(ws, msgInicio(alvo));
        return;
      }
      case 'host:iniciar-rodada': {
        const v = salaDoHost(ws, ctx);
        if (!v) return erro(ws, 'NAO_AUTORIZADO', 'Apenas o telão controla as rodadas');
        if (v.sala.rodadaAtiva(Date.now())) return erro(ws, 'RODADA_EM_ANDAMENTO', 'Já existe uma rodada em andamento');
        if (v.sala.rodada && v.sala.rodada.numero >= v.sala.totalRodadas) {
          return erro(ws, 'PARTIDA_ENCERRADA', 'A partida terminou. Comece uma nova partida.');
        }
        if (v.timerFim) clearTimeout(v.timerFim); // timer antigo não pode encerrar a rodada nova
        v.sala.iniciarRodada(Date.now(), typeof msg.desafioId === 'string' ? msg.desafioId : undefined);
        const inicio = msgInicio(v);
        for (const alvo of todos(v)) enviar(alvo, inicio);
        v.timerFim = setTimeout(() => {
          v.timerFim = null;
          encerrarRodada(v);
          avisarHost(v);
        }, DURACAO_RODADA_MS);
        v.timerFim.unref();
        avisarHost(v);
        return;
      }
      case 'host:encerrar-rodada': {
        const v = salaDoHost(ws, ctx);
        if (!v) return erro(ws, 'NAO_AUTORIZADO', 'Apenas o telão controla as rodadas');
        encerrarRodada(v);
        avisarHost(v);
        return;
      }
      case 'host:configurar': {
        const v = salaDoHost(ws, ctx);
        if (!v) return erro(ws, 'NAO_AUTORIZADO', 'Apenas o telão configura a partida');
        if (!v.sala.configurarRodadas(Number(msg.rodadas))) {
          return erro(ws, 'RODADA_EM_ANDAMENTO', 'Só dá para mudar o número de rodadas antes de a partida começar (1 a 20)');
        }
        avisarHost(v);
        return;
      }
      case 'host:nova-partida': {
        const v = salaDoHost(ws, ctx);
        if (!v) return erro(ws, 'NAO_AUTORIZADO', 'Apenas o telão controla a partida');
        if (v.timerFim) clearTimeout(v.timerFim);
        v.timerFim = null;
        v.sala.novaPartida();
        for (const alvo of v.jogadores.values()) enviar(alvo, { t: 'partida:nova' });
        avisarHost(v);
        return;
      }
      case 'host:remover': {
        const v = salaDoHost(ws, ctx);
        if (!v) return erro(ws, 'NAO_AUTORIZADO', 'Apenas o telão remove jogadores');
        const id = v.sala.removerPorApelido(String(msg.apelido ?? ''));
        if (id) {
          const alvo = v.jogadores.get(id);
          v.jogadores.delete(id);
          enviar(alvo, { t: 'erro', codigo: 'REMOVIDO', msg: 'Você foi removido da sala pelo telão.' });
        }
        avisarHost(v);
        return;
      }
      case 'jogador:entrar': {
        const alvo = aoVivo.get(String(msg.pin ?? '').trim());
        if (!alvo) return erro(ws, 'SALA_INEXISTENTE', 'Sala não encontrada. Confira o PIN no telão.');
        let jogador = typeof msg.id === 'string' ? alvo.sala.jogadores.get(msg.id) : undefined;
        if (!jogador) {
          const r = alvo.sala.entrar(String(msg.apelido ?? ''));
          if (!r.ok) return erro(ws, 'ENTRADA_RECUSADA', r.erro);
          jogador = r.jogador;
        }
        if (ctx.pin !== alvo.sala.pin || ctx.jogadorId !== jogador.id) liberarContexto(ws, ctx);
        alvo.jogadores.set(jogador.id, ws);
        Object.assign(ctx, { papel: 'jogador', pin: alvo.sala.pin, jogadorId: jogador.id });
        enviar(ws, { t: 'jogador:entrou', id: jogador.id, apelido: jogador.apelido, pin: alvo.sala.pin, pontos: jogador.pontos });
        if (alvo.sala.rodadaAtiva(Date.now())) enviar(ws, msgInicio(alvo));
        avisarHost(alvo);
        return;
      }
      case 'jogador:enviar': {
        const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;
        if (ctx.papel !== 'jogador' || !v || !ctx.jogadorId) return erro(ws, 'NAO_AUTORIZADO', 'Entre numa sala primeiro');
        const jogadorId = ctx.jogadorId;
        const padrao = String(msg.padrao ?? '');
        const flags = String(msg.flags ?? '');
        const enviadoEm = Date.now();
        const bloqueio = v.sala.tentarEnvio(jogadorId, enviadoEm);
        if (bloqueio) return erro(ws, 'ENVIO_RECUSADO', bloqueio);
        const { deveCasar, naoDeveCasar, deveOculto, naoDeveOculto } = v.sala.rodada!.desafio;
        // Avalia visíveis + ocultos de uma vez; ao celular só voltam os visíveis
        // e a QUANTIDADE de ocultos que falharam.
        const bruta = await avaliarRegex(padrao, flags, [...deveCasar, ...deveOculto], [...naoDeveCasar, ...naoDeveOculto]);
        const correto = bruta.ok && bruta.correto;
        const avaliacao = bruta.ok
          ? {
              ok: true as const,
              acertosDeve: bruta.acertosDeve.slice(0, deveCasar.length),
              acertosNaoDeve: bruta.acertosNaoDeve.slice(0, naoDeveCasar.length),
              ocultosFalhos:
                bruta.acertosDeve.slice(deveCasar.length).filter((x) => !x).length +
                bruta.acertosNaoDeve.slice(naoDeveCasar.length).filter(Boolean).length,
            }
          : bruta;
        // Sempre registra (libera o jogador para o próximo envio), mesmo em erro.
        const pontos = v.sala.registrarResultado(jogadorId, correto, padrao.length, enviadoEm);
        const total = v.sala.jogadores.get(jogadorId)?.pontos ?? 0;
        enviar(ws, { t: 'resultado', padrao, ...avaliacao, correto, pontos, total });
        avisarHost(v);
        if (v.sala.rodadaAtiva(Date.now()) && v.sala.todosAcertaram()) {
          encerrarRodada(v);
          avisarHost(v);
        }
        return;
      }
      default:
        erro(ws, 'MENSAGEM_INVALIDA', 'Mensagem desconhecida');
    }
  }

  app.get('/ws', { websocket: true }, (socket) => {
    const ctx: Contexto = { papel: null, pin: null, jogadorId: null };

    socket.on('message', (dados) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(dados));
      } catch {
        erro(socket, 'MENSAGEM_INVALIDA', 'Mensagem inválida (JSON esperado)');
        return;
      }
      tratar(socket, ctx, msg).catch((e) => {
        app.log.error(e);
        erro(socket, 'INTERNO', 'Erro interno');
      });
    });

    socket.on('close', () => {
      const v = ctx.pin ? aoVivo.get(ctx.pin) : undefined;
      if (!v) return;
      if (ctx.papel === 'jogador' && ctx.jogadorId && v.jogadores.get(ctx.jogadorId) === socket) {
        v.jogadores.delete(ctx.jogadorId);
      }
      if (ctx.papel === 'host' && v.host === socket) {
        // Dá um tempo para o telão recarregar a página e retomar com o token.
        v.host = null;
        v.timerRemocao = setTimeout(() => removerSala(v), REMOVER_SALA_SEM_HOST_MS);
        v.timerRemocao.unref();
      }
    });
  });
}
