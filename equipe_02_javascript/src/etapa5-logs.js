/**
 * Etapa 5 — Parser de logs.
 *
 * Formato de cada linha:  DD/MM/AAAA HH:MM:SS NIVEL usuario IP acao
 * A regex garante a FORMA da linha (sintaxe). Coisas como "IP 300.1.1.1" ou
 * "31/02/2026" têm a forma certa, mas são impossíveis — isso é verificado
 * depois, em validarSemantica(), porque exige comparar números.
 */
import { dataExiste } from './etapa2-validacao.js';

export const RE_LOG =
  /^(?<data>[0-9]{2}\/[0-9]{2}\/[0-9]{4}) (?<hora>[0-9]{2}:[0-9]{2}:[0-9]{2}) (?<nivel>INFO|WARN|ERROR) (?<usuario>[a-z][a-z0-9_]*) (?<ip>[0-9]{1,3}(?:\.[0-9]{1,3}){3}) (?<acao>[a-z_]+)$/;

/** Quebra o texto em linhas aceitando \n e \r\n. */
const RE_QUEBRA_LINHA = /\r?\n/;

/** Reconhece uma linha e devolve seus campos (grupos nomeados) ou null. */
export function analisarLinha(linha) {
  const m = RE_LOG.exec(linha);
  return m ? { ...m.groups } : null;
}

/**
 * Validação semântica dos campos já reconhecidos.
 * @returns {string|null} motivo da rejeição, ou null se estiver tudo certo.
 */
export function validarSemantica({ data, hora, ip }) {
  const octetos = ip.split('.').map(Number);
  if (octetos.some((o) => o > 255)) return `IP fora de faixa (${ip}): cada octeto vai de 0 a 255`;

  const [dia, mes, ano] = data.split('/').map(Number);
  if (!dataExiste(dia, mes, ano)) return `data impossível (${data})`;

  const [h, min, seg] = hora.split(':').map(Number);
  if (h > 23 || min > 59 || seg > 59) return `hora impossível (${hora})`;

  return null;
}

function contar(mapa, chave) {
  mapa[chave] = (mapa[chave] ?? 0) + 1;
}

/**
 * Analisa o conteúdo completo de um arquivo de log.
 * Linhas em branco são ignoradas (não contam como rejeitadas).
 */
export function analisarLogs(texto, { semantica = true } = {}) {
  const resultado = { validas: [], rejeitadas: [], porNivel: {}, porUsuario: {}, porAcao: {} };

  // O Bloco de Notas do Windows pode gravar um BOM (U+FEFF) no início do arquivo.
  texto.replace(/^﻿/, '').split(RE_QUEBRA_LINHA).forEach((conteudo, i) => {
    const linha = i + 1;
    if (conteudo.trim() === '') return;

    const campos = analisarLinha(conteudo);
    if (!campos) {
      resultado.rejeitadas.push({ linha, conteudo, motivo: 'formato não reconhecido' });
      return;
    }
    const motivo = semantica ? validarSemantica(campos) : null;
    if (motivo) {
      resultado.rejeitadas.push({ linha, conteudo, motivo });
      return;
    }
    resultado.validas.push({ linha, ...campos });
    contar(resultado.porNivel, campos.nivel);
    contar(resultado.porUsuario, campos.usuario);
    contar(resultado.porAcao, campos.acao);
  });

  return resultado;
}
