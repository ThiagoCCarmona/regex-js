import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Slides } from './pages/Slides.tsx';
import { Playground } from './pages/Playground.tsx';

const Invaders = lazy(() => import('./pages/Invaders.tsx'));
const ArenaJogador = lazy(() => import('./pages/ArenaJogador.tsx'));
const ArenaTelao = lazy(() => import('./pages/ArenaTelao.tsx'));

type Tema = 'auto' | 'claro' | 'escuro';

function lerTema(): Tema {
  try {
    const t = localStorage.getItem('tema');
    return t === 'claro' || t === 'escuro' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

function Nav() {
  const [tema, setTema] = useState<Tema>(lerTema);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'auto') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', tema);
    try {
      localStorage.setItem('tema', tema);
    } catch {
      /* armazenamento indisponível: só não lembra a escolha */
    }
  }, [tema]);

  const proximo: Record<Tema, Tema> = { auto: 'claro', claro: 'escuro', escuro: 'auto' };
  const nomeTema: Record<Tema, string> = { auto: 'Tema: automático', claro: 'Tema: caderno', escuro: 'Tema: lousa' };

  return (
    <nav className="nav" aria-label="Principal">
      <NavLink to="/" className="marca-site">
        /regex<span>-js</span>/
      </NavLink>
      <ul>
        <li><NavLink to="/" end>Slides</NavLink></li>
        <li><NavLink to="/playground">Playground</NavLink></li>
        <li><NavLink to="/invaders">Regex Invaders</NavLink></li>
        <li><NavLink to="/arena">Regex Arena</NavLink></li>
      </ul>
      <button type="button" className="secundario alternar-tema" onClick={() => setTema(proximo[tema])}>
        {nomeTema[tema]}
      </button>
    </nav>
  );
}

export function App() {
  const { pathname } = useLocation();
  // Nos slides e na Arena a navegação fica escondida (modo apresentação / celular).
  const telaCheia = pathname === '/' || pathname.startsWith('/slide/') || pathname.startsWith('/arena');

  return (
    <>
      {!telaCheia && <Nav />}
      <Suspense fallback={<p className="pagina">Carregando…</p>}>
        <Routes>
          <Route path="/" element={<Slides />} />
          <Route path="/slide/:n" element={<Slides />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/invaders" element={<Invaders />} />
          <Route path="/arena" element={<ArenaJogador />} />
          <Route path="/arena/telao" element={<ArenaTelao />} />
          <Route
            path="*"
            element={
              <main className="pagina">
                <h1>Página não encontrada</h1>
                <p>
                  Esse endereço não existe. <NavLink to="/">Voltar aos slides</NavLink>.
                </p>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
