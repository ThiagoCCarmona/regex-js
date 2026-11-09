/**
 * Filtro simples de apelidos impróprios para o telão da Regex Arena.
 * Não é infalível — é a primeira linha; a segunda é o botão "remover" do telão.
 */

/** Trocas comuns para disfarçar letras (leet). */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i' };

/** Palavras procuradas DENTRO do apelido (radicais longos o bastante para não gerar falso positivo). */
const RADICAIS = [
  'porra', 'caralh', 'merd', 'buceta', 'boceta', 'puta', 'puto', 'viado', 'foder', 'fodid', 'fudid', 'fuder',
  'cuzao', 'arrombad', 'babaca', 'otario', 'retardad', 'piroca', 'xoxota', 'xereca', 'punheta', 'bosta',
  'cacete', 'desgraca', 'vagabund', 'corno', 'lixo', 'estupr', 'pedofil', 'nazi', 'hitler', 'vtnc', 'vsfd',
  'fuck', 'shit', 'bitch', 'dick', 'pussy', 'whore', 'nigg',
];

/** Siglas/palavras curtas: só bloqueadas como palavra inteira ("cu" sim, "Cucamonga" não). */
const CURTAS = new Set(['cu', 'fdp', 'pqp', 'vsf', 'tnc', 'krl', 'crl', 'pau', 'gay']);

/** Palavras legítimas que contêm um radical (ex.: com-PUTA-ção). */
const EXCECOES = /(com|dis|re|im)puta/g;

function trocarLeet(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
}

/** Forma compacta: sem acentos, minúscula, leet desfeito e só letras. */
export function normalizarApelido(s: string): string {
  return trocarLeet(s).replace(/[^a-z]/g, '');
}

export function apelidoImproprio(apelido: string): boolean {
  const compacto = normalizarApelido(apelido).replace(EXCECOES, '');
  if (RADICAIS.some((r) => compacto.includes(r))) return true;
  const palavras = trocarLeet(apelido).split(/[^a-z]+/).filter(Boolean);
  return palavras.some((p) => CURTAS.has(p)) || CURTAS.has(compacto);
}
