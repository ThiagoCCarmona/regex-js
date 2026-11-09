/** Regras de pontuação da Regex Arena. */
export const PONTOS_BASE = 500;
export const BONUS_TEMPO_MAX = 500;
export const BONUS_CURTA_MAX = 300;
export const PENALIDADE_POR_CARACTERE = 10;

/**
 * Pontos de um acerto: base + bônus de rapidez + bônus por regex curta.
 *   500 + round(500 × restante/duração) + max(0, 300 − 10 × tamanho)
 */
export function calcularPontos(tamanhoPadrao: number, restanteMs: number, duracaoMs: number): number {
  const fracao = Math.min(1, Math.max(0, restanteMs / duracaoMs));
  const rapidez = Math.round(BONUS_TEMPO_MAX * fracao);
  const curta = Math.max(0, BONUS_CURTA_MAX - PENALIDADE_POR_CARACTERE * tamanhoPadrao);
  return PONTOS_BASE + rapidez + curta;
}
