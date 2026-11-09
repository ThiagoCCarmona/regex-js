import { Fragment } from 'react';

export type CorMarca = 'amarelo' | 'verde' | 'vermelho' | 'azul';

export interface Marca {
  inicio: number;
  fim: number;
  cor?: CorMarca;
  rotulo?: string;
}

interface Props {
  texto: string;
  marcas: Marca[];
  /** 'fita': uma célula por símbolo, como a fita de um autômato. 'texto': texto corrido. */
  variante?: 'fita' | 'texto';
  /** Posição a indicar com uma seta (ex.: erro léxico). */
  cursor?: number;
}

/** Divide o texto em trechos marcados e não marcados (marcas não se sobrepõem). */
function trechos(texto: string, marcas: Marca[]) {
  const ordenadas = [...marcas].filter((m) => m.fim >= m.inicio).sort((a, b) => a.inicio - b.inicio);
  const saida: Array<{ texto: string; marca?: Marca; inicio: number }> = [];
  let pos = 0;
  for (const m of ordenadas) {
    if (m.inicio < pos) continue;
    if (m.inicio > pos) saida.push({ texto: texto.slice(pos, m.inicio), inicio: pos });
    saida.push({ texto: texto.slice(m.inicio, m.fim), marca: m, inicio: m.inicio });
    pos = m.fim;
  }
  if (pos < texto.length) saida.push({ texto: texto.slice(pos), inicio: pos });
  return saida;
}

/**
 * Mostra uma cadeia com os casamentos "marcados com marca-texto".
 * Casamentos vazios (λ) aparecem como um traço fino na posição.
 */
export function Fita({ texto, marcas, variante = 'texto', cursor }: Props) {
  if (variante === 'fita') {
    const corDe = (i: number) => marcas.find((m) => i >= m.inicio && i < m.fim)?.cor ?? null;
    return (
      <div className="fita" role="group" aria-label={`Cadeia: ${texto || 'λ (vazia)'}`}>
        {texto.length === 0 && <span className="celula vazia">λ</span>}
        {[...texto].map((c, i) => {
          const cor = corDe(i);
          return (
            <span key={i} className={`celula${cor ? ` marca-${cor}` : ''}${cursor === i ? ' cursor' : ''}`}>
              {c === ' ' ? ' ' : c}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <p className="texto-marcado">
      {trechos(texto, marcas).map((t, i) =>
        t.marca ? (
          t.texto.length === 0 ? (
            <span key={i} className="marca-vazia" title="casamento vazio (λ)" />
          ) : (
            <mark key={i} className={`marca-${t.marca.cor ?? 'amarelo'}`} title={t.marca.rotulo}>
              {t.texto}
            </mark>
          )
        ) : (
          <Fragment key={i}>{t.texto}</Fragment>
        ),
      )}
    </p>
  );
}
