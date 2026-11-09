/**
 * Etapa 4 — Substituição e separação.
 *
 *   re.sub(p, r, s)   →  s.replace(/p/g, r)   (sem g, troca só a 1ª ocorrência!)
 *   re.split(p, s)    →  s.split(/p/)
 * Na string de substituição do JS: $1/$2 (posicionais), $<nome> (nomeados),
 * $& (casamento inteiro), $$ (cifrão literal). Em Python: \1, \g<nome>.
 */

/** Espaços em branco no início OU no fim da cadeia. */
export const RE_ESPACOS_PONTAS = /^\s+|\s+$/g;

/** Qualquer sequência de espaços em branco internos (espaço, tab, quebra). */
export const RE_ESPACOS_INTERNOS = /\s+/g;

/** CPF no formato 000.000.000-00, capturando o 1º bloco e os dígitos finais. */
export const RE_CPF = /^([0-9]{3})\.[0-9]{3}\.[0-9]{3}-([0-9]{2})$/;

/** Separadores ; , | com espaços opcionais ao redor. */
export const RE_SEPARADORES = /\s*[;,|]\s*/;

/** Data DD/MM/AAAA com grupos nomeados, usada na substituição $<nome>. */
export const RE_DATA_REORDENAR = /^(?<dia>[0-9]{2})\/(?<mes>[0-9]{2})\/(?<ano>[0-9]{4})$/;

/** Remove espaços das pontas e reduz sequências internas a um único espaço. */
export function normalizarEspacos(s) {
  return s.replace(RE_ESPACOS_PONTAS, '').replace(RE_ESPACOS_INTERNOS, ' ');
}

/** Mascara um CPF fictício: 123.456.789-00 → 123.***.***-00 (sem validar dígitos). */
export function mascararCpf(s) {
  if (!RE_CPF.test(s)) return null;
  return s.replace(RE_CPF, '$1.***.***-$2');
}

/** Divide a linha nos separadores ; , | ignorando espaços ao redor. */
export function separar(s) {
  return s.split(RE_SEPARADORES).filter((parte) => parte !== '');
}

/**
 * Substituição LITERAL: troca todas as ocorrências de `alvo` por `novo` sem
 * interpretar caracteres especiais. Atenção: mesmo com padrão string,
 * 'x'.replaceAll('x', '$&$&') vira 'xx' — o JS interpreta $& na string de
 * substituição. Usar uma FUNÇÃO substituta desliga essa interpretação.
 */
export function substituirLiteral(texto, alvo, novo) {
  return texto.replaceAll(alvo, () => novo);
}

/** Substituição COM GRUPOS: DD/MM/AAAA → AAAA-MM-DD usando $<nome>. */
export function reformatarDataComGrupos(s) {
  return s.replace(RE_DATA_REORDENAR, '$<ano>-$<mes>-$<dia>');
}
