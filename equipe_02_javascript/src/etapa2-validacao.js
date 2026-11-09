/**
 * Etapa 2 — Validação de formatos.
 *
 * Todas as regex são ancoradas com ^ e $: a cadeia INTEIRA precisa ter o
 * formato (equivalente a re.fullmatch). Sem âncoras, 'xCC-2026-001' seria
 * aceito porque contém um trecho válido.
 *
 * Validação SINTÁTICA = a cadeia tem a forma certa (é o que a regex sabe fazer).
 * Validação SEMÂNTICA = o valor faz sentido no mundo real (31/02 não existe);
 * isso exige aritmética/regras que ficam fora da regex.
 */

/** Matrícula CC-AAAA-NNN (curso CC fixo, ano com 4 dígitos, número com 3). */
export const RE_MATRICULA = /^CC-[0-9]{4}-[0-9]{3}$/;

/** Data DD/MM/AAAA com grupos nomeados (sintaxe JS: (?<nome>...)). */
export const RE_DATA = /^(?<dia>[0-9]{2})\/(?<mes>[0-9]{2})\/(?<ano>[0-9]{4})$/;

/** Telefone (DD) DDDDD-DDDD — parênteses escapados, espaço obrigatório. */
export const RE_TELEFONE = /^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$/;

/** Desafio: código institucional LFA-AAAA-NN. */
export const RE_CODIGO_LFA = /^LFA-[0-9]{4}-[0-9]{2}$/;

const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** Validação semântica de uma data (calendário gregoriano). */
export function dataExiste(dia, mes, ano) {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const limite = mes === 2 && ehBissexto(ano) ? 29 : DIAS_POR_MES[mes - 1];
  return dia <= limite;
}

export function validarMatricula(s) {
  return RE_MATRICULA.test(s);
}

export function validarTelefone(s) {
  return RE_TELEFONE.test(s);
}

export function validarCodigoLfa(s) {
  return RE_CODIGO_LFA.test(s);
}

/**
 * Valida uma data separando as duas camadas.
 * @returns {{sintatica: boolean, semantica: boolean, motivo: string}}
 */
export function validarData(s) {
  const m = RE_DATA.exec(s);
  if (!m) {
    return { sintatica: false, semantica: false, motivo: 'formato diferente de DD/MM/AAAA' };
  }
  const dia = Number(m.groups.dia);
  const mes = Number(m.groups.mes);
  const ano = Number(m.groups.ano);
  if (mes < 1 || mes > 12) {
    return { sintatica: true, semantica: false, motivo: `mês ${m.groups.mes} não existe` };
  }
  if (!dataExiste(dia, mes, ano)) {
    return { sintatica: true, semantica: false, motivo: `dia ${m.groups.dia} não existe em ${m.groups.mes}/${m.groups.ano}` };
  }
  return { sintatica: true, semantica: true, motivo: 'data válida' };
}
