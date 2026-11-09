import { useCallback, useEffect, useRef, useState } from 'react';
import { CampoRegex } from '../components/CampoRegex.tsx';
import { FASES } from '../jogos/invaders/fases.ts';
import { IconeEscudo, IconeInvasor, Mira } from '../jogos/invaders/icones.tsx';
import { ALVOS_POR_FASE, criarEstado, disparar, iniciarJogo, passo, proximaFase, BONUS_COMBO, PONTOS_ALVO, type Estado, type Palavra } from '../jogos/invaders/motor.ts';
import { definirSom, somLigado, sons } from '../jogos/invaders/som.ts';
import { testarEmWorker } from '../lib/regex-segura.ts';

/** A partir daqui (em % da descida) a palavra entra na zona de perigo. */
const ZONA_PERIGO = 66;

function lerRecorde(): number {
  try {
    return Number(localStorage.getItem('invaders:recorde')) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(pontos: number) {
  try {
    localStorage.setItem('invaders:recorde', String(pontos));
  } catch {
    /* sem armazenamento: o recorde vale só nesta visita */
  }
}

const reduzirMovimento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Oscilação lateral em onda (em % da largura), como os invasores clássicos. */
function oscilacao(p: Palavra, reduzir: boolean) {
  return reduzir ? 0 : Math.sin(p.y / 7 + p.id * 1.7) * 3;
}

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  cor: string;
  tam: number;
}

interface Laser {
  id: number;
  x: number;
  y: number;
  aliada: boolean;
}

interface Flutuante {
  id: number;
  x: number;
  y: number;
  texto: string;
  tipo: 'pontos' | 'combo' | 'dano';
}

let proximoEfeito = 1;

export function Invaders() {
  const [estado, setEstado] = useState<Estado>(criarEstado);
  const [padrao, setPadrao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mira, setMira] = useState<Set<number>>(new Set());
  const [recorde, setRecorde] = useState(lerRecorde);
  const [recordeInicial, setRecordeInicial] = useState(recorde);
  const [som, setSom] = useState(somLigado);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [flutuantes, setFlutuantes] = useState<Flutuante[]>([]);
  const [dano, setDano] = useState(false);
  const ref = useRef(estado);
  ref.current = estado;
  const campo = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const particulas = useRef<Particula[]>([]);
  const entrada = useRef<HTMLDivElement>(null);
  const vidasAntes = useRef(estado.vidas);
  const statusAntes = useRef(estado.status);
  const reduzir = reduzirMovimento();
  const fase = FASES[estado.fase];
  const jogando = estado.status === 'jogando';

  // Laço do jogo.
  useEffect(() => {
    if (!jogando) return;
    let anterior = performance.now();
    let quadro = requestAnimationFrame(function tique(agora) {
      const dt = agora - anterior;
      anterior = agora;
      setEstado((e) => passo(e, dt, Math.random));
      quadro = requestAnimationFrame(tique);
    });
    return () => cancelAnimationFrame(quadro);
  }, [jogando]);

  // Partículas num canvas por cima da arena (leve: só desenha quando há partículas).
  useEffect(() => {
    if (reduzir) return;
    let quadro = 0;
    const desenhar = () => {
      const c = tela.current;
      const g = c?.getContext('2d');
      if (c && g) {
        const r = c.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (c.width !== Math.round(r.width * dpr)) {
          c.width = Math.round(r.width * dpr);
          c.height = Math.round(r.height * dpr);
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, r.width, r.height);
        particulas.current = particulas.current.filter((p) => p.vida > 0);
        for (const p of particulas.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.18;
          p.vida -= 0.025;
          g.globalAlpha = Math.max(0, p.vida);
          g.fillStyle = p.cor;
          g.fillRect(p.x, p.y, p.tam, p.tam);
        }
        g.globalAlpha = 1;
      }
      quadro = requestAnimationFrame(desenhar);
    };
    quadro = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadro);
  }, [reduzir]);

  // Pré-visualização: quais palavras a regex atual acertaria (roda no worker).
  useEffect(() => {
    if (!jogando || !padrao) {
      setMira(new Set());
      if (!padrao) setErro(null);
      return;
    }
    let vivo = true;
    const verificar = async () => {
      const vivas = ref.current.palavras.filter((p) => p.atingida === 0);
      const r = await testarEmWorker(padrao, '', vivas.map((p) => p.texto));
      if (!vivo) return;
      if (Array.isArray(r)) {
        setErro(null);
        setMira(new Set(vivas.filter((_, i) => r[i]).map((p) => p.id)));
      } else {
        setErro(r.erro);
        setMira(new Set());
      }
    };
    void verificar();
    const id = window.setInterval(verificar, 250);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [padrao, jogando]);

  // Perdeu vida: tremor + flash vermelho; mudou de status: limpa o campo e toca o som.
  useEffect(() => {
    if (estado.vidas < vidasAntes.current) {
      setDano(true);
      sons.vida();
      window.setTimeout(() => setDano(false), 450);
    }
    vidasAntes.current = estado.vidas;
  }, [estado.vidas]);

  useEffect(() => {
    if (statusAntes.current !== estado.status) {
      if (estado.status !== 'jogando') setPadrao('');
      if (estado.status === 'entreFases') sons.fase();
      if (estado.status === 'fim') sons.fim();
      if (estado.status === 'vitoria') sons.fase();
    }
    statusAntes.current = estado.status;
  }, [estado.status]);

  // Recorde ao vivo.
  useEffect(() => {
    if (estado.pontos > recorde) {
      setRecorde(estado.pontos);
      salvarRecorde(estado.pontos);
    }
  }, [estado.pontos, recorde]);

  /** Centro de uma palavra em px, relativo à arena. */
  const centroDe = (id: number) => {
    const el = campo.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);
    const base = campo.current?.getBoundingClientRect();
    if (!el || !base) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  };

  const explodir = (x: number, y: number, aliada: boolean) => {
    if (reduzir) return;
    const cores = aliada ? ['#2f7bff', '#9fd4ff', '#ffffff'] : ['#ff7a1a', '#ffb347', '#ffe14d', '#ffffff'];
    for (let i = 0; i < 26; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 1.5 + Math.random() * 4;
      particulas.current.push({ x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 2, vida: 1, cor: cores[i % cores.length], tam: 3 + Math.random() * 3 });
    }
  };

  const atirar = useCallback(async () => {
    if (ref.current.status !== 'jogando' || !padrao) return;
    const vivas = ref.current.palavras.filter((p) => p.atingida === 0);
    const r = await testarEmWorker(padrao, '', vivas.map((p) => p.texto));
    if (!Array.isArray(r)) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    const atingidas = vivas.filter((_, i) => r[i]);
    const ids = atingidas.map((p) => p.id);
    sons.disparo();

    // Efeitos: um laser por palavra atingida, partículas e pontos flutuantes.
    const novosLasers: Laser[] = [];
    const novosFlut: Flutuante[] = [];
    const alvos = atingidas.filter((p) => p.inimiga).length;
    for (const p of atingidas) {
      const c = centroDe(p.id);
      if (!c) continue;
      novosLasers.push({ id: proximoEfeito++, x: c.x, y: c.y, aliada: !p.inimiga });
      explodir(c.x, c.y, !p.inimiga);
      novosFlut.push({ id: proximoEfeito++, x: c.x, y: c.y, texto: p.inimiga ? `+${PONTOS_ALVO}` : '−1 vida', tipo: p.inimiga ? 'pontos' : 'dano' });
    }
    if (alvos > 1) {
      const base = campo.current?.getBoundingClientRect();
      novosFlut.push({ id: proximoEfeito++, x: (base?.width ?? 600) / 2, y: (base?.height ?? 400) * 0.45, texto: `COMBO ×${alvos}  +${(alvos - 1) * BONUS_COMBO}`, tipo: 'combo' });
    }
    if (alvos) sons.acerto(alvos);
    if (atingidas.some((p) => !p.inimiga)) sons.aliada();
    setLasers(novosLasers);
    setFlutuantes((f) => [...f, ...novosFlut]);
    window.setTimeout(() => setLasers([]), 260);
    window.setTimeout(() => setFlutuantes((f) => f.filter((x) => !novosFlut.includes(x))), 1100);

    setEstado((e) => disparar(e, ids));
    // Disparo feito: limpa o campo para a próxima regex (regex inválida fica para correção).
    setPadrao('');
  }, [padrao]);

  const comecar = () => {
    setPadrao('');
    setRecordeInicial(recorde);
    setEstado((e) => (e.status === 'entreFases' ? proximaFase(e) : iniciarJogo(e)));
    // Mantém a arena (com o placar) à vista e foca o campo sem rolar a página.
    campo.current?.scrollIntoView({ block: 'nearest' });
    window.setTimeout(() => entrada.current?.querySelector('input')?.focus({ preventScroll: true }), 0);
  };

  const novoRecorde = estado.pontos > recordeInicial && recordeInicial > 0;
  const largura = campo.current?.clientWidth ?? 1;
  const altura = campo.current?.clientHeight ?? 1;

  return (
    <main className="pagina jogo-invaders">
      <header className="hud">
        <div>
          <h1>Regex Invaders</h1>
          <p className="objetivo">
            Fase {estado.fase + 1} de {FASES.length}: <b>{fase.nome}</b>. {fase.objetivo}
          </p>
        </div>
        <button
          type="button"
          className="secundario botao-som"
          aria-pressed={som}
          onClick={() => {
            definirSom(!som);
            setSom(!som);
          }}
        >
          {som ? '🔊 Som ligado' : '🔈 Som desligado'}
        </button>
      </header>

      <div className={`campo-jogo${dano ? ' dano' : ''}${reduzir ? ' sem-movimento' : ''}`} ref={campo} aria-label="Campo de jogo">
        <div className="estrelas estrelas-1" aria-hidden="true" />
        <div className="estrelas estrelas-2" aria-hidden="true" />
        <div className="zona-perigo" aria-hidden="true" />

        <dl className="placar">
          <div>
            <dt>Pontos</dt>
            <dd>{estado.pontos}</dd>
          </div>
          <div>
            <dt>Vidas</dt>
            <dd aria-label={`${estado.vidas} vidas`}>{'♥'.repeat(Math.max(0, estado.vidas)) || '—'}</dd>
          </div>
          <div>
            <dt>Alvos</dt>
            <dd>
              {estado.destruidasFase}/{ALVOS_POR_FASE}
            </dd>
          </div>
          <div>
            <dt>Recorde</dt>
            <dd>{recorde}</dd>
          </div>
        </dl>
        {novoRecorde && jogando && <p className="novo-recorde">Novo recorde!</p>}

        {estado.palavras.map((p) => {
          const naMira = mira.has(p.id);
          const perigo = p.inimiga && p.y >= ZONA_PERIGO && p.atingida === 0;
          return (
            <div
              key={p.id}
              data-id={p.id}
              className={[
                'invasor',
                p.inimiga ? 'alvo' : 'aliada',
                p.atingida > 0 ? 'atingida' : '',
                naMira ? 'na-mira' : '',
                perigo ? 'perigo' : '',
              ].join(' ')}
              style={{ left: `${p.x + oscilacao(p, reduzir)}%`, top: `${p.y}%` }}
            >
              {p.inimiga ? <IconeInvasor /> : <IconeEscudo />}
              <span className="texto">{p.texto}</span>
              {naMira && p.inimiga && <Mira />}
              {naMira && !p.inimiga && <span className="alerta-aliada">⚠ aliada</span>}
            </div>
          );
        })}

        <svg className="lasers" viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" aria-hidden="true">
          {lasers.map((l) => (
            <line key={l.id} x1={largura / 2} y1={altura - 18} x2={l.x} y2={l.y} className={l.aliada ? 'laser laser-aliada' : 'laser'} />
          ))}
        </svg>
        <canvas className="particulas" ref={tela} aria-hidden="true" />
        {flutuantes.map((f) => (
          <span key={f.id} className={`flutuante flutuante-${f.tipo}`} style={{ left: f.x, top: f.y }} aria-hidden="true">
            {f.texto}
          </span>
        ))}
        <div className="canhao" aria-hidden="true" />

        {!jogando && (
          <div className="sobreposicao">
            {estado.status === 'inicio' && (
              <>
                <h2>Defenda o chão com regex</h2>
                <p>
                  Palavras caem do céu. As <span className="exemplo-alvo">naves laranja</span> são alvos: escreva uma regex que case com elas e aperte
                  Enter. As <span className="exemplo-aliada">aliadas com escudo azul</span> não podem ser atingidas: cada uma custa uma vida.
                </p>
                <p>Toda palavra que casar com a regex é atingida, então uma boa regex derruba várias de uma vez e ganha combo.</p>
              </>
            )}
            {estado.status === 'entreFases' && (
              <>
                <h2>Fase {estado.fase + 1} concluída</h2>
                <p>
                  Próxima: <b>{FASES[estado.fase + 1].nome}</b>. {FASES[estado.fase + 1].objetivo}
                </p>
                <p className="dica">Dica: {FASES[estado.fase + 1].dica}</p>
              </>
            )}
            {estado.status === 'fim' && (
              <>
                <h2>Fim de jogo: {estado.pontos} pontos</h2>
                {estado.pontos > recordeInicial && recordeInicial > 0 && <p className="novo-recorde-final">Novo recorde!</p>}
                <p>
                  Uma regex que venceria a fase {fase.nome}: <code>/{fase.solucao}/</code>
                </p>
              </>
            )}
            {estado.status === 'vitoria' && (
              <>
                <h2>Vitória! {estado.pontos} pontos</h2>
                <p>Você passou pelas seis fases do laboratório.</p>
              </>
            )}
            <button type="button" onClick={comecar}>
              {estado.status === 'entreFases' ? 'Começar a próxima fase' : estado.status === 'inicio' ? 'Começar' : 'Jogar de novo'}
            </button>
          </div>
        )}
      </div>

      <div className="controle-jogo" ref={entrada}>
        <CampoRegex
          rotulo={jogando ? `Sua regex (Enter dispara). Dica: ${fase.dica}` : 'Sua regex (o campo libera quando a fase começa)'}
          padrao={padrao}
          aoMudarPadrao={jogando ? setPadrao : undefined}
          erro={erro}
          aoEnviar={atirar}
          placeholder={jogando ? 'ex.: ^[0-9]+$' : ''}
        />
        <button type="button" onClick={atirar} disabled={!jogando || !padrao || !!erro}>
          Disparar
        </button>
      </div>
      <p className="aviso-jogo" aria-live="polite">
        {estado.aviso}
      </p>
    </main>
  );
}

export default Invaders;
