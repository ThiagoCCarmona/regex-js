/** Ícones dos Invaders: nave (alvo) e escudo (aliada). A forma carrega o significado, não só a cor. */

/** Invasor pixelado 11×8 (desenhado em retângulos). */
const PIXELS = [
  '..X.....X..',
  '...X...X...',
  '..XXXXXXX..',
  '.XX.XXX.XX.',
  'XXXXXXXXXXX',
  'X.XXXXXXX.X',
  'X.X.....X.X',
  '...XX.XX...',
];

export function IconeInvasor() {
  return (
    <svg className="icone" viewBox="0 0 11 8" aria-hidden="true" shapeRendering="crispEdges">
      {PIXELS.flatMap((linha, y) =>
        [...linha].map((c, x) => (c === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

export function IconeEscudo() {
  return (
    <svg className="icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mira desenhada sobre um alvo que a regex atual vai acertar. */
export function Mira() {
  return (
    <svg className="mira" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M20 0v10M20 30v10M0 20h10M30 20h10" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
