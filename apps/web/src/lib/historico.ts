/**
 * Histórico de comandos no estilo do CMD/terminal: ↑ volta para os comandos
 * anteriores, ↓ avança e, passando do mais recente, devolve o que estava
 * sendo digitado (o "rascunho").
 */

export interface Navegacao {
  /** Posição no histórico (null = não está navegando, mostrando o rascunho). */
  indice: number | null;
  /** O que estava digitado antes de começar a navegar. */
  rascunho: string;
}

export const NAVEGACAO_INICIAL: Navegacao = { indice: null, rascunho: '' };

/** Acrescenta um comando ao fim, ignorando vazio e repetição consecutiva. */
export function adicionarAoHistorico(historico: string[], comando: string, max = 50): string[] {
  if (!comando.trim() || historico.at(-1) === comando) return historico;
  return [...historico, comando].slice(-max);
}

/** Move no histórico; devolve a nova navegação e o texto a mostrar no campo. */
export function navegarHistorico(
  historico: string[],
  nav: Navegacao,
  atual: string,
  direcao: 'cima' | 'baixo',
): { nav: Navegacao; valor: string } {
  if (historico.length === 0) return { nav, valor: atual };

  if (direcao === 'cima') {
    if (nav.indice === null) {
      const indice = historico.length - 1;
      return { nav: { indice, rascunho: atual }, valor: historico[indice] };
    }
    const indice = Math.max(0, nav.indice - 1);
    return { nav: { ...nav, indice }, valor: historico[indice] };
  }

  if (nav.indice === null) return { nav, valor: atual };
  const indice = nav.indice + 1;
  if (indice >= historico.length) return { nav: { indice: null, rascunho: '' }, valor: nav.rascunho };
  return { nav: { ...nav, indice }, valor: historico[indice] };
}
