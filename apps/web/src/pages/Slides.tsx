import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SLIDES } from '../slides/conteudo.ts';
import * as Etapas from '../slides/demos/DemosEtapas.tsx';
import * as Extras from '../slides/demos/DemosExtras.tsx';

const DEMOS: Record<string, ComponentType> = { ...Etapas, ...Extras };

function digitandoEmCampo(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/** Apresentação: ← → espaço navegam, F tela cheia, N notas, Esc menu. */
export function Slides() {
  const { n } = useParams();
  const navegar = useNavigate();
  const indice = Math.min(SLIDES.length - 1, Math.max(0, (Number(n) || 1) - 1));
  const slide = SLIDES[indice];
  const Demo = slide.demo ? DEMOS[slide.demo] : undefined;
  const [notas, setNotas] = useState(false);
  const [menu, setMenu] = useState(false);

  const ir = useCallback(
    (i: number) => {
      const alvo = Math.min(SLIDES.length - 1, Math.max(0, i));
      navegar(alvo === 0 ? '/' : `/slide/${alvo + 1}`);
    },
    [navegar],
  );

  useEffect(() => {
    document.title = `${indice + 1}/${SLIDES.length} · ${slide.titulo}`;
  }, [indice, slide.titulo]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement | null)?.blur();
        setMenu((m) => !m);
        return;
      }
      if (digitandoEmCampo(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        ir(indice + 1);
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        ir(indice - 1);
      } else if (e.key === 'Home') ir(0);
      else if (e.key === 'End') ir(SLIDES.length - 1);
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      } else if (e.key === 'n' || e.key === 'N') setNotas((v) => !v);
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [indice, ir]);

  const ehCapa = slide.id === 'capa';

  return (
    <div className={`slides${ehCapa ? ' slide-capa' : ''}`}>
      <main className="slide" aria-roledescription="slide" aria-label={`Slide ${indice + 1} de ${SLIDES.length}: ${slide.titulo}`}>
        {!ehCapa && (
          <header className="slide-cabecalho">
            <h2>{slide.titulo}</h2>
            {slide.subtitulo && <p className="subtitulo">{slide.subtitulo}</p>}
          </header>
        )}
        <div className={`slide-corpo${slide.topicos.length && Demo && !ehCapa ? ' com-demo' : ''}`}>
          {!ehCapa && slide.topicos.length > 0 && (
            <div className="slide-texto">
              <ul className="topicos">
                {slide.topicos.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {slide.codigo && (
                <pre className="codigo">
                  <code>{slide.codigo}</code>
                </pre>
              )}
            </div>
          )}
          {Demo && (
            <section className="slide-demo" aria-label="Demonstração ao vivo">
              <Demo />
            </section>
          )}
        </div>
      </main>

      {notas && (
        <aside className="notas" aria-label="Notas para quem apresenta">
          {slide.notas}
        </aside>
      )}

      <footer className="slide-rodape">
        <div className="progresso" style={{ width: `${((indice + 1) / SLIDES.length) * 100}%` }} />
        <button type="button" className="secundario" onClick={() => ir(indice - 1)} disabled={indice === 0} aria-label="Slide anterior">
          ←
        </button>
        <span className="contador">
          {indice + 1} / {SLIDES.length}
        </span>
        <button type="button" className="secundario" onClick={() => ir(indice + 1)} disabled={indice === SLIDES.length - 1} aria-label="Próximo slide">
          →
        </button>
        <button type="button" className="secundario dica-teclas" onClick={() => setMenu((m) => !m)}>
          Menu <kbd>Esc</kbd>
        </button>
      </footer>

      {menu && (
        <div className="menu-slides" role="dialog" aria-label="Menu da apresentação">
          <nav>
            <ol>
              {SLIDES.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={i === indice ? '' : 'secundario'}
                    onClick={() => {
                      ir(i);
                      setMenu(false);
                    }}
                  >
                    {s.titulo}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-lateral">
            <p>
              <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>F</kbd> tela cheia · <kbd>N</kbd> notas · <kbd>Esc</kbd> fechar
            </p>
            <ul>
              <li><Link to="/playground">Playground</Link></li>
              <li><Link to="/invaders">Regex Invaders</Link></li>
              <li><Link to="/arena/telao">Telão da Arena</Link></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Slides;
