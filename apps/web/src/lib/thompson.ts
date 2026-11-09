/**
 * Da regex ao AFN pela construção de Thompson — a ponte entre a regex da
 * biblioteca e a ER da teoria de Linguagens Formais.
 *
 * Aceita o subconjunto que corresponde às ER formais: símbolos, classes, `.`,
 * união `|`, concatenação, fecho `*`, `+`, `?`, grupos e `{m,n}` (expandido).
 * Recusa, explicando por quê, o que sai da notação formal:
 *   - retro-referência (\1, \k<n>): pode descrever linguagem NÃO regular ({ww});
 *   - lookaround, \b e âncora no meio: fora da notação, mas a linguagem
 *     continua regular (fechamento sob interseção/complemento).
 */

export type No =
  | { tipo: 'simbolo'; rotulo: string; casa: (c: string) => boolean }
  | { tipo: 'vazio' }
  | { tipo: 'concat'; partes: No[] }
  | { tipo: 'uniao'; opcoes: No[] }
  | { tipo: 'estrela' | 'mais' | 'opcional'; filho: No };

/** O padrão é uma regex válida, mas usa recurso fora das ER formais. */
export class NaoFormal extends Error {
  /** true = a linguagem continua regular (só a notação não é a formal). */
  readonly regular: boolean;
  constructor(mensagem: string, regular: boolean) {
    super(mensagem);
    this.name = 'NaoFormal';
    this.regular = regular;
  }
}

/** Formal, mas grande demais para desenhar. */
export class GrandeDemais extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'GrandeDemais';
  }
}

const MAX_COPIAS = 6;
const MAX_ESTADOS = 80;

const MSG_RETRO =
  'Retro-referência (\\1, \\k<nome>): a linguagem pode deixar de ser regular. Ex.: ^(a|b)+\\1$ descreve { ww }, que não é regular (lema do bombeamento), então não existe AFN para ela.';
const MSG_LOOK =
  'Lookahead/lookbehind não existe na notação das ER formais. A linguagem continua regular (linguagens regulares são fechadas sob interseção e complemento), mas a construção de Thompson não se aplica diretamente.';
const MSG_FRONTEIRA = 'A fronteira de palavra (\\b, \\B) olha os vizinhos sem consumir símbolo: fora da notação formal (a linguagem ainda é regular).';
const MSG_ANCORA = 'Âncora (^ ou $) no meio do padrão: fora da notação formal. Use âncoras só no começo e no fim.';

function escapado(s: string, pos: number) {
  let barras = 0;
  for (let k = pos - 1; k >= 0 && s[k] === '\\'; k--) barras++;
  return barras % 2 === 1;
}

const simbolo = (rotulo: string, casa: (c: string) => boolean): No => ({ tipo: 'simbolo', rotulo, casa });

/** Há retro-referência (\1..\9 ou \k<nome>) fora de classes de caracteres? */
function temRetroReferencia(s: string): boolean {
  let dentroDeClasse = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\\') {
      const e = s[k + 1];
      if (!dentroDeClasse && (/[1-9]/.test(e ?? '') || (e === 'k' && s[k + 2] === '<'))) return true;
      k++; // pula o caractere escapado
    } else if (c === '[') dentroDeClasse = true;
    else if (c === ']') dentroDeClasse = false;
  }
  return false;
}

export function analisar(padrao: string): { ast: No; notas: string[] } {
  new RegExp(padrao); // lança SyntaxError se a regex for inválida
  // A retro-referência decide a classificação (pode não ser regular), mesmo que
  // apareça depois de um \b ou lookaround: verifica antes de tudo.
  if (temRetroReferencia(padrao)) throw new NaoFormal(MSG_RETRO, false);
  const notas: string[] = [];
  let s = padrao;
  if (s.startsWith('^')) {
    s = s.slice(1);
    notas.push('Âncora ^ no começo: o AFN já reconhece a cadeia inteira.');
  }
  if (s.endsWith('$') && !escapado(s, s.length - 1)) {
    s = s.slice(0, -1);
    notas.push('Âncora $ no fim: o AFN já reconhece a cadeia inteira.');
  }
  let i = 0;
  const peek = () => s[i];

  function alternativa(): No {
    const opcoes = [concatenacao()];
    while (peek() === '|') {
      i++;
      opcoes.push(concatenacao());
    }
    return opcoes.length === 1 ? opcoes[0] : { tipo: 'uniao', opcoes };
  }

  function concatenacao(): No {
    const partes: No[] = [];
    while (i < s.length && peek() !== '|' && peek() !== ')') partes.push(repeticao());
    if (partes.length === 0) return { tipo: 'vazio' };
    return partes.length === 1 ? partes[0] : { tipo: 'concat', partes };
  }

  function repeticao(): No {
    let no = atomo();
    for (;;) {
      const c = peek();
      if (c === '*' || c === '+' || c === '?') {
        i++;
        no = { tipo: c === '*' ? 'estrela' : c === '+' ? 'mais' : 'opcional', filho: no };
      } else if (c === '{') {
        const m = /^\{(\d+)(,(\d*))?\}/.exec(s.slice(i));
        if (!m) break;
        i += m[0].length;
        no = expandir(no, Number(m[1]), m[2] === undefined ? Number(m[1]) : m[3] === '' ? null : Number(m[3]));
      } else break;
      if (peek() === '?') {
        i++; // quantificador preguiçoso: mesma linguagem, só muda qual casamento é escolhido
        if (!notas.some((n) => n.startsWith('Quantificador preguiçoso'))) notas.push('Quantificador preguiçoso (*?, +?): reconhece a mesma linguagem.');
      }
    }
    return no;
  }

  function expandir(no: No, min: number, max: number | null): No {
    if (min > MAX_COPIAS || (max ?? min) > MAX_COPIAS) {
      throw new GrandeDemais(`Repetição grande demais para desenhar: {${min},${max ?? ''}} vira mais de ${MAX_COPIAS} cópias.`);
    }
    const partes: No[] = Array.from({ length: min }, () => no);
    if (max === null) partes.push({ tipo: 'estrela', filho: no });
    else for (let k = min; k < max; k++) partes.push({ tipo: 'opcional', filho: no });
    if (partes.length === 0) return { tipo: 'vazio' };
    return partes.length === 1 ? partes[0] : { tipo: 'concat', partes };
  }

  function atomo(): No {
    const c = peek();
    if (c === '(') {
      const resto = s.slice(i);
      if (/^\(\?(=|!|<=|<!)/.test(resto)) throw new NaoFormal(MSG_LOOK, true);
      if (resto.startsWith('(?:')) i += 3;
      else if (/^\(\?<[A-Za-z_$][\w$]*>/.test(resto)) i += resto.indexOf('>') + 1;
      else i++;
      const dentro = alternativa();
      i++; // ')'
      return dentro;
    }
    if (c === '[') {
      let j = i + 1;
      if (s[j] === '^') j++;
      if (s[j] === ']') j++;
      while (j < s.length && s[j] !== ']') j += s[j] === '\\' ? 2 : 1;
      const interior = s.slice(i + 1, j);
      i = j + 1;
      const re = new RegExp(`^[${interior}]$`);
      const rotulo = `[${interior}]`;
      return simbolo(rotulo.length > 12 ? rotulo.slice(0, 11) + '…]' : rotulo, (x) => re.test(x));
    }
    if (c === '.') {
      i++;
      // '.' casa qualquer caractere exceto terminadores de linha (LF, CR, U+2028, U+2029).
      return simbolo('.', (x) => ![10, 13, 0x2028, 0x2029].includes(x.charCodeAt(0)));
    }
    if (c === '^' || c === '$') throw new NaoFormal(MSG_ANCORA, true);
    if (c === '\\') {
      const e = s[i + 1];
      if (/[1-9]/.test(e) || (e === 'k' && s[i + 2] === '<')) throw new NaoFormal(MSG_RETRO, false);
      if (e === 'b' || e === 'B') throw new NaoFormal(MSG_FRONTEIRA, true);
      let seq = '\\' + e;
      if (e === 'x') seq += s.slice(i + 2, i + 4);
      else if (e === 'u') seq += s[i + 2] === '{' ? s.slice(i + 2, s.indexOf('}', i) + 1) : s.slice(i + 2, i + 6);
      else if (e === 'c') seq += s[i + 2];
      i += seq.length;
      const re = new RegExp(`^${seq}$`);
      return simbolo(seq, (x) => re.test(x));
    }
    i++;
    return simbolo(c, (x) => x === c);
  }

  const ast = alternativa();
  return { ast, notas };
}

/* ---------------- Construção de Thompson + layout ---------------- */

export interface Estado {
  id: number;
  /** Coluna e linha (em unidades da grade; o desenho multiplica). */
  x: number;
  y: number;
}

export interface Transicao {
  de: number;
  para: number;
  /** Rótulo do símbolo, ou 'ε'. */
  rotulo: string;
  casa?: (c: string) => boolean;
  /** Se presente, a seta é um arco que passa pela linha y (laço do * ou atalho). */
  arcoY?: number;
}

export interface AFN {
  estados: Estado[];
  transicoes: Transicao[];
  inicial: number;
  final: number;
  largura: number;
  altura: number;
}

interface Medida {
  w: number;
  h: number;
}

function medir(no: No): Medida {
  switch (no.tipo) {
    case 'simbolo':
    case 'vazio':
      return { w: 2, h: 1 };
    case 'concat': {
      const ms = no.partes.map(medir);
      return { w: ms.reduce((t, m) => t + m.w, 0), h: Math.max(...ms.map((m) => m.h)) };
    }
    case 'uniao': {
      const ms = no.opcoes.map(medir);
      return { w: Math.max(...ms.map((m) => m.w)) + 2, h: ms.reduce((t, m) => t + m.h, 0) };
    }
    case 'estrela': {
      const m = medir(no.filho);
      return { w: m.w + 2, h: m.h + 1 };
    }
    case 'mais':
    case 'opcional': {
      const m = medir(no.filho);
      return { w: m.w + 2, h: m.h + 0.5 };
    }
  }
}

export function construirThompson(ast: No): AFN {
  const estados: Estado[] = [];
  const transicoes: Transicao[] = [];
  const novo = (x: number, y: number) => {
    if (estados.length >= MAX_ESTADOS) throw new GrandeDemais(`AFN grande demais para desenhar (mais de ${MAX_ESTADOS} estados).`);
    estados.push({ id: estados.length, x, y });
    return estados.length - 1;
  };
  const eps = (de: number, para: number, arcoY?: number) => transicoes.push({ de, para, rotulo: 'ε', arcoY });

  /** Constrói o fragmento com o canto esquerdo na coluna x0 e centro vertical yc. */
  function construir(no: No, x0: number, yc: number): { ini: number; fim: number } {
    switch (no.tipo) {
      case 'simbolo': {
        const a = novo(x0, yc);
        const b = novo(x0 + 1, yc);
        transicoes.push({ de: a, para: b, rotulo: no.rotulo, casa: no.casa });
        return { ini: a, fim: b };
      }
      case 'vazio': {
        const a = novo(x0, yc);
        const b = novo(x0 + 1, yc);
        eps(a, b);
        return { ini: a, fim: b };
      }
      case 'concat': {
        let x = x0;
        let primeiro = -1;
        let anterior = -1;
        for (const parte of no.partes) {
          const f = construir(parte, x, yc);
          if (anterior >= 0) eps(anterior, f.ini);
          else primeiro = f.ini;
          anterior = f.fim;
          x += medir(parte).w;
        }
        return { ini: primeiro, fim: anterior };
      }
      case 'uniao': {
        const total = medir(no);
        const s0 = novo(x0, yc);
        const fragmentos: Array<{ ini: number; fim: number }> = [];
        let topo = yc - total.h / 2;
        for (const op of no.opcoes) {
          const m = medir(op);
          fragmentos.push(construir(op, x0 + 1, topo + m.h / 2));
          topo += m.h;
        }
        const f0 = novo(x0 + total.w - 1, yc);
        for (const f of fragmentos) {
          eps(s0, f.ini);
          eps(f.fim, f0);
        }
        return { ini: s0, fim: f0 };
      }
      case 'estrela':
      case 'mais':
      case 'opcional': {
        const m = medir(no.filho);
        const s0 = novo(x0, yc);
        const f = construir(no.filho, x0 + 1, yc);
        const f0 = novo(x0 + m.w + 1, yc);
        eps(s0, f.ini);
        eps(f.fim, f0);
        if (no.tipo !== 'opcional') eps(f.fim, f.ini, yc - m.h / 2 - 0.25); // laço: repetir
        if (no.tipo !== 'mais') eps(s0, f0, yc + m.h / 2 + 0.25); // atalho: zero vezes
        return { ini: s0, fim: f0 };
      }
    }
  }

  const total = medir(ast);
  const { ini, fim } = construir(ast, 0, total.h / 2);
  return { estados, transicoes, inicial: ini, final: fim, largura: total.w - 1, altura: total.h };
}

/** Simulação do AFN (fecho-ε a cada símbolo): a cadeia inteira é aceita? */
export function aceita(afn: AFN, cadeia: string): boolean {
  const fecho = (conj: Set<number>) => {
    const pilha = [...conj];
    while (pilha.length) {
      const q = pilha.pop()!;
      for (const t of afn.transicoes) if (t.de === q && !t.casa && !conj.has(t.para)) {
        conj.add(t.para);
        pilha.push(t.para);
      }
    }
    return conj;
  };
  let atual = fecho(new Set([afn.inicial]));
  for (const c of cadeia) {
    const prox = new Set<number>();
    for (const t of afn.transicoes) if (t.casa && atual.has(t.de) && t.casa(c)) prox.add(t.para);
    atual = fecho(prox);
    if (atual.size === 0) return false;
  }
  return atual.has(afn.final);
}

export type Classificacao =
  | { tipo: 'formal'; texto: string; notas: string[] }
  | { tipo: 'grande'; texto: string }
  | { tipo: 'nao-regular'; texto: string }
  | { tipo: 'fora-da-notacao'; texto: string }
  | { tipo: 'invalida'; texto: string };

/** Resumo para o aviso do playground: é ER formal? é regular? */
export function classificar(padrao: string): Classificacao {
  try {
    const { ast, notas } = analisar(padrao);
    construirThompson(ast);
    return { tipo: 'formal', texto: 'ER formal: existe um AFN equivalente (construção de Thompson).', notas };
  } catch (e) {
    if (e instanceof NaoFormal) return { tipo: e.regular ? 'fora-da-notacao' : 'nao-regular', texto: e.message };
    if (e instanceof GrandeDemais) return { tipo: 'grande', texto: e.message };
    return { tipo: 'invalida', texto: 'Regex inválida.' };
  }
}
