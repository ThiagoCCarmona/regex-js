/**
 * Avaliação segura de regex enviadas por usuários (proteção contra ReDoS).
 *
 * O motor de regex do JavaScript usa backtracking: padrões como (a+)+$ podem
 * levar tempo exponencial. Como `RegExp.test` não pode ser interrompido, a
 * avaliação roda num worker_thread com timeout; se estourar, o worker é
 * encerrado e recriado. As avaliações passam por uma fila (uma por vez), para
 * que o timeout meça só o tempo de execução da própria regex.
 */
import { Worker } from 'node:worker_threads';

export const TAMANHO_MAXIMO = 100;
export const FLAGS_PERMITIDAS = /^[iu]*$/;
export const TIMEOUT_MS = 200;
/** Máximo de avaliações esperando na fila; acima disso, recusa na hora. */
export const FILA_MAXIMA = 20;

export type Avaliacao =
  | { ok: true; acertosDeve: boolean[]; acertosNaoDeve: boolean[]; correto: boolean }
  | { ok: false; erro: string };

interface Tarefa {
  id: number;
  padrao: string;
  flags: string;
  deve: string[];
  naoDeve: string[];
  resolver: (a: Avaliacao) => void;
}

const URL_WORKER = new URL('./avaliador-worker.ts', import.meta.url);
let worker: Worker | null = null;
let atual: Tarefa | null = null;
let timer: NodeJS.Timeout | null = null;
const fila: Tarefa[] = [];
let proximoId = 1;

function obterWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(URL_WORKER);
  w.unref();
  w.on('message', (msg: Avaliacao & { id: number }) => {
    if (!atual || msg.id !== atual.id) return;
    const { id: _id, ...resultado } = msg;
    concluir(resultado as Avaliacao);
  });
  w.on('error', () => {
    if (worker === w) worker = null;
    if (atual) concluir({ ok: false, erro: 'Falha interna ao avaliar a regex' });
  });
  worker = w;
  return w;
}

function concluir(resultado: Avaliacao): void {
  if (timer) clearTimeout(timer);
  timer = null;
  const tarefa = atual;
  atual = null;
  tarefa?.resolver(resultado);
  processar();
}

function processar(): void {
  if (atual || fila.length === 0) return;
  atual = fila.shift()!;
  const { resolver: _r, ...pedido } = atual;
  obterWorker().postMessage(pedido);
  timer = setTimeout(() => {
    const travado = worker;
    worker = null;
    void travado?.terminate();
    concluir({ ok: false, erro: 'Tempo excedido (possível backtracking catastrófico)' });
  }, TIMEOUT_MS);
}

/** Valida tamanho/flags e avalia a regex contra as listas, com timeout. */
export function avaliarRegex(padrao: string, flags: string, deve: string[], naoDeve: string[]): Promise<Avaliacao> {
  if (typeof padrao !== 'string' || padrao.length > TAMANHO_MAXIMO) {
    return Promise.resolve({ ok: false, erro: `A regex deve ter no máximo ${TAMANHO_MAXIMO} caracteres` });
  }
  if (typeof flags !== 'string' || !FLAGS_PERMITIDAS.test(flags)) {
    return Promise.resolve({ ok: false, erro: 'Flags permitidas: i e u' });
  }
  if (fila.length >= FILA_MAXIMA) {
    return Promise.resolve({ ok: false, erro: 'Servidor ocupado avaliando outras regex. Tente de novo em instantes.' });
  }
  return new Promise((resolver) => {
    fila.push({ id: proximoId++, padrao, flags, deve, naoDeve, resolver });
    processar();
  });
}

/** Encerra o worker (usado nos testes e no desligamento do servidor). */
export async function encerrarAvaliador(): Promise<void> {
  const w = worker;
  worker = null;
  await w?.terminate();
}
