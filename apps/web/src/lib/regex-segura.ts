/**
 * Execução segura de regex digitadas pelo usuário (playground e jogos).
 * A regex roda num Web Worker com timeout; se estourar, o worker é
 * encerrado e recriado, e o chamador recebe um erro explicativo.
 */

export interface Casamento {
  inicio: number;
  fim: number;
  texto: string;
  grupos: Array<string | undefined>;
  nomeados: Record<string, string | undefined> | null;
}

export type PedidoRegex = { id: number; padrao: string; flags: string; textos: string[]; op: 'casamentos' | 'testes' | 'tempo' };

export type RespostaRegex =
  | { id: number; ok: true; casamentos?: Casamento[]; testes?: boolean[]; ms?: number }
  | { id: number; ok: false; erro: string };

export const MSG_TEMPO_EXCEDIDO = 'Tempo excedido: a regex entrou em backtracking catastrófico (ReDoS).';

/** Compila no thread principal só para validar a sintaxe (não executa nada). */
export function compilarSeguro(padrao: string, flags: string): { re: RegExp } | { erro: string } {
  try {
    return { re: new RegExp(padrao, flags) };
  } catch (e) {
    return { erro: traduzirErro((e as Error).message) };
  }
}

/** Mensagens do V8 resumidas em português. */
export function traduzirErro(msg: string): string {
  const semPrefixo = msg.replace(/^Invalid regular expression: \/.*\/[a-z]*: /, '');
  const mapa: Array<[RegExp, string]> = [
    [/Unterminated group/, 'grupo aberto sem ")"'],
    [/Unmatched '\)'/, '")" sem "(" correspondente'],
    [/Unterminated character class/, 'classe aberta sem "]"'],
    [/Nothing to repeat/, 'quantificador sem nada antes para repetir'],
    [/\\ at end of pattern/, '"\\" no fim do padrão'],
    [/Invalid flags/, 'flag inválida'],
    [/Invalid group/, 'grupo inválido'],
    [/numbers out of order/, 'quantificador {m,n} com m > n'],
    [/Invalid capture group name/, 'nome de grupo inválido'],
    [/Duplicate capture group name/, 'nome de grupo repetido'],
  ];
  for (const [re, pt] of mapa) if (re.test(semPrefixo)) return `Regex inválida: ${pt}`;
  return `Regex inválida: ${semPrefixo}`;
}

/** Escreve /padrão/flags como no código-fonte, sem lançar exceção se a regex for inválida. */
export function literalRegex(padrao: string, flags: string): string {
  let fonte = padrao;
  try {
    fonte = new RegExp(padrao).source; // .source escapa a barra: a/b → a\/b
  } catch {
    /* regex incompleta enquanto o usuário digita: mostra como está */
  }
  return `/${fonte}/${flags}`;
}

let fabricaWorker: () => Worker = () => new Worker(new URL('./regex-worker.ts', import.meta.url), { type: 'module' });

/** Troca a fábrica de workers (usado nos testes, onde não há Web Worker). */
export function definirFabricaWorker(f: () => Worker): void {
  fabricaWorker = f;
  worker?.terminate();
  worker = null;
}

let worker: Worker | null = null;
let proximoId = 1;

interface Tarefa {
  pedido: PedidoRegex;
  timeoutMs: number;
  resolver: (r: RespostaRegex) => void;
}
const fila: Tarefa[] = [];
let ocupado = false;

/**
 * Executa um pedido por vez. O cronômetro só começa quando o pedido chega ao
 * worker, então uma regex rápida na fila nunca "herda" o timeout de uma lenta.
 */
function processar(): void {
  if (ocupado || fila.length === 0) return;
  ocupado = true;
  const { pedido, timeoutMs, resolver } = fila.shift()!;
  worker ??= fabricaWorker();
  const w = worker;
  const terminar = (r: RespostaRegex) => {
    clearTimeout(timer);
    w.removeEventListener('message', ouvir);
    ocupado = false;
    resolver(r);
    processar();
  };
  const timer = setTimeout(() => {
    w.terminate();
    if (worker === w) worker = null;
    terminar({ id: pedido.id, ok: false, erro: MSG_TEMPO_EXCEDIDO });
  }, timeoutMs);
  function ouvir(ev: MessageEvent<RespostaRegex>) {
    if (ev.data.id === pedido.id) terminar(ev.data);
  }
  w.addEventListener('message', ouvir);
  w.postMessage(pedido);
}

function executar(pedido: Omit<PedidoRegex, 'id'>, timeoutMs: number): Promise<RespostaRegex> {
  return new Promise((resolver) => {
    fila.push({ pedido: { ...pedido, id: proximoId++ }, timeoutMs, resolver });
    processar();
  });
}

/** Todos os casamentos de `padrao` em `texto` (flag g é acrescentada se faltar). */
export async function casamentosEmWorker(
  padrao: string,
  flags: string,
  texto: string,
  timeoutMs = 300,
): Promise<{ casamentos: Casamento[] } | { erro: string }> {
  const sintaxe = compilarSeguro(padrao, flags);
  if ('erro' in sintaxe) return sintaxe;
  const r = await executar({ padrao, flags, textos: [texto], op: 'casamentos' }, timeoutMs);
  return r.ok ? { casamentos: r.casamentos ?? [] } : { erro: r.erro };
}

/** Mede quanto tempo (ms) re.test(texto) leva; erro se passar do timeout. */
export async function cronometrarEmWorker(padrao: string, flags: string, texto: string, timeoutMs: number): Promise<{ ms: number } | { erro: string }> {
  const r = await executar({ padrao, flags, textos: [texto], op: 'tempo' }, timeoutMs);
  return r.ok ? { ms: r.ms ?? 0 } : { erro: r.erro };
}

/** Testa a regex contra cada texto; true = casou em algum ponto. */
export async function testarEmWorker(
  padrao: string,
  flags: string,
  textos: string[],
  timeoutMs = 150,
): Promise<boolean[] | { erro: string }> {
  const sintaxe = compilarSeguro(padrao, flags);
  if ('erro' in sintaxe) return sintaxe;
  const r = await executar({ padrao, flags, textos, op: 'testes' }, timeoutMs);
  return r.ok ? (r.testes ?? []) : { erro: r.erro };
}
