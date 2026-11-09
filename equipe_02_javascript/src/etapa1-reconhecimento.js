/**
 * Etapa 1 — Fundamentos e reconhecimento.
 *
 * Equivalências com o módulo `re` do Python:
 *   re.fullmatch(p, s)  →  /^p$/.test(s)          (reconhecimento integral)
 *   re.search(p, s)     →  /p/.exec(s)            (primeira ocorrência)
 *   re.findall(p, s)    →  s.match(/p/g)  ou  [...s.matchAll(/p/g)]
 *
 * As regex literais abaixo são compiladas uma única vez, quando o módulo é
 * carregado — é o equivalente JavaScript de `re.compile`.
 */

/** Identificador completo: letra ASCII ou "_" seguida de letras, dígitos ou "_". */
export const RE_ID = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Desafio: a primeira letra deve ser maiúscula [A-Z]. */
export const RE_ID_MAIUSCULA = /^[A-Z][A-Za-z0-9_]*$/;

/** Mesmo padrão sem âncoras, para busca dentro de um texto. */
export const RE_ID_BUSCA = /[A-Za-z_][A-Za-z0-9_]*/;

/** Números inteiros (ASCII). Flag g: todas as ocorrências. */
export const RE_NUMERO = /[0-9]+/g;

/**
 * Palavras que começam por L/l. Em JS, `\w` e `\b` só conhecem ASCII, então
 * `\b[Ll]\w*` cortaria "laboratórios" em "laborat". Com a flag `u` usamos as
 * classes Unicode \p{L} (letras) e \p{N} (números) e um lookbehind negativo
 * no lugar de `\b`.
 */
export const RE_PALAVRA_L = /(?<![\p{L}\p{N}_])[Ll][\p{L}\p{N}_]*/gu;

export const FRASE_ETAPA1 = 'A turma LFA 2026 possui 32 acadêmicos e 6 laboratórios.';

/** Reconhecimento integral (a cadeia inteira precisa casar). */
export function ehIdentificador(s) {
  return RE_ID.test(s);
}

/** Desafio da etapa: identificador cuja primeira letra é [A-Z]. */
export function ehIdentificadorMaiusculo(s) {
  return RE_ID_MAIUSCULA.test(s);
}

/** Primeira ocorrência de um identificador no texto (como re.search). */
export function primeiraOcorrencia(texto) {
  const m = RE_ID_BUSCA.exec(texto);
  return m ? { valor: m[0], indice: m.index } : null;
}

/** Todas as ocorrências de identificadores (como re.findall). */
export function todasOcorrencias(texto) {
  return [...texto.matchAll(new RegExp(RE_ID_BUSCA.source, 'g'))].map((m) => m[0]);
}

/** Extrai todos os números inteiros do texto. */
export function extrairNumeros(texto) {
  return texto.match(RE_NUMERO) ?? [];
}

/** Extrai palavras iniciadas por L ou l (com suporte a acentos). */
export function palavrasComL(texto) {
  return texto.match(RE_PALAVRA_L) ?? [];
}
