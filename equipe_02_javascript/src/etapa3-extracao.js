/**
 * Etapa 3 — Extração e grupos nomeados.
 *
 * Grupos de captura em JavaScript:
 *   posicional  (...)          → m[1], m[2]...   substituição: $1, $2
 *   nomeado     (?<nome>...)   → m.groups.nome   substituição: $<nome>   retro-referência: \k<nome>
 * Em Python o nomeado é (?P<nome>...), acessado por m.group('nome') e \g<nome>.
 */

/** E-mail: parte local, @, domínio e TLD com 2+ letras (ASCII). */
export const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Datas DD/MM/AAAA dentro de texto livre, com grupos nomeados. */
export const RE_DATA_TEXTO = /(?<![0-9])(?<dia>[0-9]{2})\/(?<mes>[0-9]{2})\/(?<ano>[0-9]{4})(?![0-9])/g;

/** Mesma data, só com grupos posicionais e ancorada (para comparar). */
export const RE_DATA_POSICIONAL = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/;

/** Mesma data com grupos nomeados e ancorada. */
export const RE_DATA_NOMEADA = /^(?<dia>[0-9]{2})\/(?<mes>[0-9]{2})\/(?<ano>[0-9]{4})$/;

/** Hashtag: # seguido de letras, dígitos ou _ (ASCII). */
export const RE_HASHTAG = /#[A-Za-z0-9_]+/g;

/** Horário válido de 00:00 a 23:59 (a faixa é codificada na própria regex). */
export const RE_HORARIO = /^(?<hora>[01][0-9]|2[0-3]):(?<minuto>[0-5][0-9])$/;

/** Candidatos a horário no texto (qualquer NN:NN), validados depois. */
export const RE_HORARIO_TEXTO = /(?<![0-9:])[0-9]{2}:[0-9]{2}(?![0-9:])/g;

export function extrairEmails(texto) {
  return texto.match(RE_EMAIL) ?? [];
}

export function extrairHashtags(texto) {
  return texto.match(RE_HASHTAG) ?? [];
}

/** Extrai datas com seus componentes via m.groups. */
export function extrairDatas(texto) {
  return [...texto.matchAll(RE_DATA_TEXTO)].map((m) => ({ texto: m[0], ...m.groups }));
}

/** Decomposição usando índices: m[1], m[2], m[3]. */
export function decomporDataPosicional(s) {
  const m = RE_DATA_POSICIONAL.exec(s);
  return m ? { dia: m[1], mes: m[2], ano: m[3] } : null;
}

/** Decomposição usando nomes: m.groups.dia etc. */
export function decomporDataNomeada(s) {
  const m = RE_DATA_NOMEADA.exec(s);
  return m ? { dia: m.groups.dia, mes: m.groups.mes, ano: m.groups.ano } : null;
}

export function validarHorario(s) {
  return RE_HORARIO.test(s);
}

/** Extrai todo NN:NN do texto e indica se é um horário válido. */
export function extrairHorarios(texto) {
  return (texto.match(RE_HORARIO_TEXTO) ?? []).map((h) => ({ texto: h, valido: validarHorario(h) }));
}
