/**
 * Worker que executa as regex enviadas pelos jogadores. Fica numa thread
 * separada: se uma regex entrar em backtracking catastrófico, quem trava é
 * este worker (que o processo principal encerra), e não o servidor.
 */
import { parentPort } from 'node:worker_threads';
import { traduzirErroRegex } from './erros-regex.ts';

interface Pedido {
  id: number;
  padrao: string;
  flags: string;
  deve: string[];
  naoDeve: string[];
}

parentPort!.on('message', (p: Pedido) => {
  let re: RegExp;
  try {
    re = new RegExp(p.padrao, p.flags);
  } catch (e) {
    parentPort!.postMessage({ id: p.id, ok: false, erro: traduzirErroRegex((e as Error).message) });
    return;
  }
  const acertosDeve = p.deve.map((s) => re.test(s));
  const acertosNaoDeve = p.naoDeve.map((s) => re.test(s));
  const correto = acertosDeve.every(Boolean) && !acertosNaoDeve.some(Boolean);
  parentPort!.postMessage({ id: p.id, ok: true, acertosDeve, acertosNaoDeve, correto });
});
