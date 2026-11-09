/**
 * Motor do Regex Invaders: funções puras sobre o estado do jogo.
 * Coordenadas em "unidades de tela": x de 0 a 100 (largura), y de 0 a ALTURA.
 * A UI chama passo() a cada quadro e disparar() com os ids que a regex atingiu.
 */
import { FASES } from './fases.ts';

export const ALTURA = 100;
export const VIDAS_INICIAIS = 3;
export const ALVOS_POR_FASE = 10;
export const PONTOS_ALVO = 100;
export const BONUS_COMBO = 50;
export const TEMPO_EXPLOSAO_MS = 450;

export interface Palavra {
  id: number;
  texto: string;
  inimiga: boolean;
  x: number;
  y: number;
  /** > 0: foi atingida e está explodindo (ms restantes). */
  atingida: number;
}

export type Status = 'inicio' | 'jogando' | 'entreFases' | 'fim' | 'vitoria';

export interface Estado {
  status: Status;
  fase: number;
  palavras: Palavra[];
  pontos: number;
  vidas: number;
  destruidasFase: number;
  ateSurgir: number;
  proximoId: number;
  /** Última mensagem para o jogador (resultado do disparo). */
  aviso: string;
}

export function criarEstado(): Estado {
  return { status: 'inicio', fase: 0, palavras: [], pontos: 0, vidas: VIDAS_INICIAIS, destruidasFase: 0, ateSurgir: 800, proximoId: 1, aviso: '' };
}

/** Velocidade de queda (unidades/s) e intervalo entre palavras (ms) por fase. */
export const velocidade = (fase: number) => 6 + fase * 1.6;
export const intervalo = (fase: number) => Math.max(900, 1900 - fase * 170);

export function iniciarJogo(e: Estado): Estado {
  return { ...criarEstado(), status: 'jogando', ateSurgir: 600, proximoId: e.proximoId };
}

export function proximaFase(e: Estado): Estado {
  if (e.status !== 'entreFases') return e;
  return { ...e, status: 'jogando', fase: e.fase + 1, palavras: [], destruidasFase: 0, ateSurgir: 600, aviso: '' };
}

/** Avança o jogo em dtMs. `aleatorio` retorna [0, 1) (injetado para testes). */
export function passo(e: Estado, dtMs: number, aleatorio: () => number): Estado {
  if (e.status !== 'jogando') return e;
  const dt = Math.min(dtMs, 100); // aba em segundo plano não "teleporta" as palavras
  const fase = FASES[e.fase];
  let { vidas, ateSurgir, proximoId } = e;
  let aviso = e.aviso;

  const palavras: Palavra[] = [];
  for (const p of e.palavras) {
    if (p.atingida > 0) {
      const resta = p.atingida - dt;
      if (resta > 0) palavras.push({ ...p, atingida: resta });
      continue;
    }
    const y = p.y + (velocidade(e.fase) * dt) / 1000;
    if (y >= ALTURA) {
      if (p.inimiga) {
        vidas--;
        aviso = `"${p.texto}" passou! −1 vida`;
      }
      continue;
    }
    palavras.push({ ...p, y });
  }

  ateSurgir -= dt;
  if (ateSurgir <= 0) {
    const inimiga = aleatorio() < 0.6;
    const lista = inimiga ? fase.inimigas : fase.aliadas;
    const texto = lista[Math.floor(aleatorio() * lista.length) % lista.length];
    palavras.push({ id: proximoId++, texto, inimiga, x: 4 + aleatorio() * 72, y: 0, atingida: 0 });
    ateSurgir = intervalo(e.fase);
  }

  return { ...e, palavras, vidas, ateSurgir, proximoId, aviso, status: vidas <= 0 ? 'fim' : 'jogando' };
}

/** Aplica um disparo: `ids` são as palavras (na tela) que casaram com a regex. */
export function disparar(e: Estado, ids: number[]): Estado {
  if (e.status !== 'jogando') return e;
  const alvo = new Set(ids);
  let inimigas = 0;
  let aliadas = 0;
  const palavras = e.palavras.map((p) => {
    if (!alvo.has(p.id) || p.atingida > 0) return p;
    if (p.inimiga) inimigas++;
    else aliadas++;
    return { ...p, atingida: TEMPO_EXPLOSAO_MS };
  });

  const pontos = e.pontos + inimigas * PONTOS_ALVO + Math.max(0, inimigas - 1) * BONUS_COMBO;
  const vidas = e.vidas - aliadas;
  const destruidasFase = e.destruidasFase + inimigas;

  let aviso = 'Nenhuma palavra atingida.';
  if (inimigas || aliadas) {
    const partes = [];
    if (inimigas) partes.push(`${inimigas} alvo${inimigas > 1 ? 's' : ''} destruído${inimigas > 1 ? 's' : ''}`);
    if (aliadas) partes.push(`${aliadas} aliada${aliadas > 1 ? 's' : ''} atingida${aliadas > 1 ? 's' : ''} (−${aliadas} vida${aliadas > 1 ? 's' : ''})`);
    aviso = partes.join(', ');
  }

  let status: Status = 'jogando';
  if (vidas <= 0) status = 'fim';
  else if (destruidasFase >= ALVOS_POR_FASE) status = e.fase === FASES.length - 1 ? 'vitoria' : 'entreFases';

  return { ...e, palavras, pontos, vidas, destruidasFase, status, aviso };
}
