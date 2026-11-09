import type { CorMarca, Marca } from '../../components/Fita.tsx';

/** Marcas de todos os casamentos de `re` em `texto` (usa uma cópia global da regex). */
export function marcasDe(texto: string, re: RegExp, cor: CorMarca = 'amarelo'): Marca[] {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const global = new RegExp(re.source, flags.replace('y', ''));
  return [...texto.matchAll(global)].map((m) => ({ inicio: m.index, fim: m.index + m[0].length, cor }));
}

/** Escreve o literal de uma regex como aparece no código. */
export const literal = (re: RegExp) => `/${re.source}/${re.flags}`;
