import { useMemo } from 'react';
import { analisar, construirThompson, GrandeDemais, NaoFormal, type AFN } from '../lib/thompson.ts';

const COL = 74;
const LIN = 62;
const MARGEM = 34;
const RAIO = 16;

interface Props {
  padrao: string;
  /** Altura máxima do desenho em px (o SVG escala para caber na largura). */
  alturaMax?: number;
}

type Resultado = { afn: AFN; notas: string[] } | { erro: string; tipo: 'nao-regular' | 'fora' | 'grande' | 'invalida' };

function montar(padrao: string): Resultado {
  try {
    const { ast, notas } = analisar(padrao);
    return { afn: construirThompson(ast), notas };
  } catch (e) {
    if (e instanceof NaoFormal) return { erro: e.message, tipo: e.regular ? 'fora' : 'nao-regular' };
    if (e instanceof GrandeDemais) return { erro: e.message, tipo: 'grande' };
    return { erro: 'Regex inválida: corrija a sintaxe para ver o autômato.', tipo: 'invalida' };
  }
}

const px = (x: number) => MARGEM + x * COL;
const py = (y: number) => MARGEM + y * LIN;

/** AFN da construção de Thompson para a regex, desenhado em SVG. */
export function AutomatoThompson({ padrao, alturaMax = 360 }: Props) {
  const r = useMemo(() => montar(padrao), [padrao]);

  if ('erro' in r) {
    return (
      <div className={`afn-aviso afn-${r.tipo}`} role="note">
        <b>{r.tipo === 'nao-regular' ? 'Sem AFN: pode não ser regular.' : r.tipo === 'fora' ? 'Fora da notação de ER formal.' : r.tipo === 'grande' ? 'Grande demais para desenhar.' : 'Sem autômato.'}</b>{' '}
        {r.erro}
      </div>
    );
  }

  const { afn, notas } = r;
  const largura = px(afn.largura) + MARGEM;
  const altura = py(afn.altura) + MARGEM / 2;
  const porId = new Map(afn.estados.map((e) => [e.id, e]));

  return (
    <figure className="afn">
      <svg viewBox={`0 0 ${largura} ${altura}`} style={{ maxHeight: alturaMax }} role="img" aria-label={`AFN de Thompson com ${afn.estados.length} estados`}>
        <defs>
          <marker id="afn-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="afn-ponta" />
          </marker>
        </defs>
        {/* seta de entrada no estado inicial */}
        <line x1={px(porId.get(afn.inicial)!.x) - RAIO - 26} y1={py(porId.get(afn.inicial)!.y)} x2={px(porId.get(afn.inicial)!.x) - RAIO - 2} y2={py(porId.get(afn.inicial)!.y)} className="afn-aresta" markerEnd="url(#afn-seta)" />
        {afn.transicoes.map((t, k) => {
          const a = porId.get(t.de)!;
          const b = porId.get(t.para)!;
          const x1 = px(a.x);
          const y1 = py(a.y);
          const x2 = px(b.x);
          const y2 = py(b.y);
          const eps = t.rotulo === 'ε';
          if (t.arcoY !== undefined) {
            const cy = py(t.arcoY);
            const voltando = x2 < x1;
            const meio = (x1 + x2) / 2;
            const d = `M${x1} ${y1 + (cy < y1 ? -RAIO : RAIO)} Q${meio} ${cy + (cy - y1) * 0.6} ${x2} ${y2 + (cy < y2 ? -RAIO : RAIO)}`;
            return (
              <g key={k}>
                <path d={d} className={`afn-aresta${eps ? ' afn-eps' : ''}`} markerEnd="url(#afn-seta)" fill="none" />
                <text x={meio} y={cy + (cy < y1 ? -4 : 14)} className="afn-rotulo afn-rotulo-eps" textAnchor="middle">
                  {voltando ? 'ε (repete)' : 'ε (pula)'}
                </text>
              </g>
            );
          }
          // linha reta encurtada para não entrar nos círculos
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.hypot(dx, dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;
          return (
            <g key={k}>
              <line x1={x1 + ux * RAIO} y1={y1 + uy * RAIO} x2={x2 - ux * (RAIO + 2)} y2={y2 - uy * (RAIO + 2)} className={`afn-aresta${eps ? ' afn-eps' : ''}`} markerEnd="url(#afn-seta)" />
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} className={`afn-rotulo${eps ? ' afn-rotulo-eps' : ''}`} textAnchor="middle">
                {t.rotulo}
              </text>
            </g>
          );
        })}
        {afn.estados.map((e) => (
          <g key={e.id} className={e.id === afn.final ? 'afn-estado afn-final' : e.id === afn.inicial ? 'afn-estado afn-inicial' : 'afn-estado'}>
            <circle cx={px(e.x)} cy={py(e.y)} r={RAIO} />
            {e.id === afn.final && <circle cx={px(e.x)} cy={py(e.y)} r={RAIO - 4} />}
            <text x={px(e.x)} y={py(e.y) + 4} textAnchor="middle" className="afn-nome">
              q{e.id}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        AFN de Thompson: {afn.estados.length} estados, {afn.transicoes.length} transições ({afn.transicoes.filter((t) => t.rotulo === 'ε').length} ε).
        {notas.length > 0 && <> {notas.join(' ')}</>}
      </figcaption>
    </figure>
  );
}
