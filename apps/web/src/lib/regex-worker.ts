/// <reference lib="webworker" />
/**
 * Web Worker que executa regex digitadas pelo usuário. Se o padrão entrar em
 * backtracking catastrófico, só este worker trava — a página continua viva e
 * o worker é encerrado por timeout (ver regex-segura.ts).
 */
import type { Casamento, PedidoRegex, RespostaRegex } from './regex-segura.ts';

const LIMITE_CASAMENTOS = 500;

// Avisa que carregou: o cronômetro do chamador só começa depois disto.
(self as unknown as Worker).postMessage({ pronto: true });

self.onmessage = (ev: MessageEvent<PedidoRegex>) => {
  const p = ev.data;
  let resposta: RespostaRegex;
  try {
    if (p.op === 'tempo') {
      const re = new RegExp(p.padrao, p.flags);
      const inicio = performance.now();
      re.test(p.textos[0]);
      resposta = { id: p.id, ok: true, ms: performance.now() - inicio };
    } else if (p.op === 'testes') {
      const re = new RegExp(p.padrao, p.flags.replace(/[gy]/g, ''));
      resposta = { id: p.id, ok: true, testes: p.textos.map((t) => re.test(t)) };
    } else {
      const flags = p.flags.includes('g') ? p.flags : p.flags + 'g';
      const re = new RegExp(p.padrao, flags);
      const casamentos: Casamento[] = [];
      for (const m of p.textos[0].matchAll(re)) {
        casamentos.push({
          inicio: m.index,
          fim: m.index + m[0].length,
          texto: m[0],
          grupos: m.slice(1),
          nomeados: m.groups ? { ...m.groups } : null,
        });
        if (casamentos.length >= LIMITE_CASAMENTOS) break;
      }
      resposta = { id: p.id, ok: true, casamentos };
    }
  } catch (e) {
    resposta = { id: p.id, ok: false, erro: (e as Error).message };
  }
  (self as unknown as Worker).postMessage(resposta);
};
