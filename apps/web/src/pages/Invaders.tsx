import { useCallback, useEffect, useRef, useState } from 'react';
import { CampoRegex } from '../components/CampoRegex.tsx';
import { FASES } from '../jogos/invaders/fases.ts';
import { ALVOS_POR_FASE, criarEstado, disparar, iniciarJogo, passo, proximaFase, type Estado } from '../jogos/invaders/motor.ts';
import { testarEmWorker } from '../lib/regex-segura.ts';

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

export function Invaders() {
  const [estado, setEstado] = useState<Estado>(criarEstado);
  const [padrao, setPadrao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mira, setMira] = useState<Set<number>>(new Set());
  const [recorde, setRecorde] = useState(lerRecorde);
  const ref = useRef(estado);
  ref.current = estado;
  const fase = FASES[estado.fase];

  // Laço do jogo.
  useEffect(() => {
    if (estado.status !== 'jogando') return;
    let anterior = performance.now();
    let quadro = requestAnimationFrame(function tique(agora) {
      const dt = agora - anterior;
      anterior = agora;
      setEstado((e) => passo(e, dt, Math.random));
      quadro = requestAnimationFrame(tique);
    });
    return () => cancelAnimationFrame(quadro);
  }, [estado.status]);

  // Pré-visualização: quais palavras a regex atual acertaria (roda no worker).
  useEffect(() => {
    if (estado.status !== 'jogando' || !padrao) {
      setMira(new Set());
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
  }, [padrao, estado.status]);

  // Recorde.
  useEffect(() => {
    if ((estado.status === 'fim' || estado.status === 'vitoria') && estado.pontos > recorde) {
      setRecorde(estado.pontos);
      salvarRecorde(estado.pontos);
    }
  }, [estado.status, estado.pontos, recorde]);

  const atirar = useCallback(async () => {
    if (ref.current.status !== 'jogando' || !padrao) return;
    const vivas = ref.current.palavras.filter((p) => p.atingida === 0);
    const r = await testarEmWorker(padrao, '', vivas.map((p) => p.texto));
    if (!Array.isArray(r)) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    const ids = vivas.filter((_, i) => r[i]).map((p) => p.id);
    setEstado((e) => disparar(e, ids));
  }, [padrao]);

  const comecar = () => {
    setPadrao('');
    setEstado((e) => (e.status === 'entreFases' ? proximaFase(e) : iniciarJogo(e)));
  };

  return (
    <main className="pagina jogo-invaders">
      <header className="hud">
        <div>
          <h1>Regex Invaders</h1>
          <p className="objetivo">
            Fase {estado.fase + 1} de {FASES.length}: <b>{fase.nome}</b>. {fase.objetivo}
          </p>
        </div>
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
      </header>

      <div className="campo-jogo" aria-label="Campo de jogo">
        {estado.palavras.map((p) => (
          <span
            key={p.id}
            className={`invasor ${p.inimiga ? 'inimiga' : 'aliada'}${p.atingida > 0 ? ' atingida' : ''}${mira.has(p.id) ? ' na-mira' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.texto}
          </span>
        ))}

        {estado.status !== 'jogando' && (
          <div className="sobreposicao">
            {estado.status === 'inicio' && (
              <>
                <h2>Defenda o chão com regex</h2>
                <p>
                  Palavras caem do céu. As <span className="exemplo-inimiga">vermelhas</span> são alvos: escreva uma regex que case com elas e
                  aperte Enter. As <span className="exemplo-aliada">verdes</span> são aliadas: se a sua regex casar com uma, você perde uma vida.
                </p>
                <p>Toda palavra que casar com a regex é atingida, então uma boa regex derruba várias de uma vez (e dá bônus).</p>
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

      <div className="controle-jogo">
        <CampoRegex
          rotulo={`Sua regex (Enter dispara). Dica: ${fase.dica}`}
          padrao={padrao}
          aoMudarPadrao={setPadrao}
          erro={erro}
          aoEnviar={atirar}
          autoFocus
          placeholder="ex.: ^[0-9]+$"
        />
        <button type="button" onClick={atirar} disabled={estado.status !== 'jogando' || !padrao}>
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
