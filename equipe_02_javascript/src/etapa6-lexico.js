/**
 * Etapa 6 — Mini analisador léxico (tokenizador).
 *
 * Técnica: uma "regex mestre" formada pela alternância de todos os padrões,
 * cada um num grupo nomeado:  (?<NUMBER>...)|(?<ID>...)|...|(?<MISMATCH>...)
 *
 * PRIORIDADE: o motor de regex do JS (backtracking) testa as alternativas da
 * esquerda para a direita e fica com a PRIMEIRA que casar — não com a mais
 * longa. Por isso RELOP (==, !=, <=, >=, <, >) vem antes de ASSIGN (=), e
 * dentro de RELOP os operadores de 2 caracteres vêm antes dos de 1.
 *
 * Flag y (sticky): o casamento precisa começar exatamente em lastIndex. Assim
 * o tokenizador avança token a token sem "pular" caracteres desconhecidos —
 * eles caem em MISMATCH e viram erro com posição.
 */

/** Especificação ordenada: [tipo, padrão]. A ordem é a prioridade. */
export const ESPEC_TOKENS = [
  ['NUMBER', String.raw`[0-9]+(?:\.[0-9]+)?`],
  ['ID', String.raw`[A-Za-z_][A-Za-z0-9_]*`],
  ['RELOP', String.raw`==|!=|<=|>=|<|>`],
  ['ASSIGN', String.raw`=`],
  ['OP', String.raw`[+\-*/]`],
  ['LPAREN', String.raw`\(`],
  ['RPAREN', String.raw`\)`],
  ['COMMA', String.raw`,`],
  ['SEMICOLON', String.raw`;`],
  ['SKIP', String.raw`[ \t]+`],
  ['MISMATCH', String.raw`[\s\S]`],
];

export const RE_MESTRE = new RegExp(
  ESPEC_TOKENS.map(([tipo, padrao]) => `(?<${tipo}>${padrao})`).join('|'),
  'y',
);

export class ErroLexico extends Error {
  constructor(simbolo, pos) {
    super(`Símbolo inesperado '${simbolo}' na posição ${pos} (coluna ${pos + 1})`);
    this.name = 'ErroLexico';
    this.simbolo = simbolo;
    this.pos = pos;
  }
}

/**
 * Converte a entrada em tokens. SKIP é descartado; MISMATCH vira erro e a
 * análise continua (para reportar todos os erros de uma vez).
 * @returns {{tokens: {tipo:string, lexema:string, pos:number}[], erros: {simbolo:string, pos:number, coluna:number}[]}}
 */
export function tokenizar(entrada) {
  const re = new RegExp(RE_MESTRE); // cópia: lastIndex é estado do objeto
  const tokens = [];
  const erros = [];
  let m;
  while (re.lastIndex < entrada.length && (m = re.exec(entrada)) !== null) {
    const [tipo, lexema] = Object.entries(m.groups).find(([, v]) => v !== undefined);
    if (tipo === 'SKIP') continue;
    if (tipo === 'MISMATCH') {
      erros.push({ simbolo: lexema, pos: m.index, coluna: m.index + 1 });
      continue;
    }
    tokens.push({ tipo, lexema, pos: m.index });
  }
  return { tokens, erros };
}

/** Versão estrita: lança ErroLexico no primeiro símbolo não reconhecido. */
export function tokenizarOuFalhar(entrada) {
  const { tokens, erros } = tokenizar(entrada);
  if (erros.length > 0) throw new ErroLexico(erros[0].simbolo, erros[0].pos);
  return tokens;
}
