import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CampoRegex } from '../components/CampoRegex.tsx';
import { useArena, useTique, type DesafioPublico, type MensagemServidor } from '../jogos/arena/useArena.ts';
import { testarEmWorker } from '../lib/regex-segura.ts';

const CHAVE = 'arena:jogador';

interface Sessao {
  pin: string;
  id: string;
  apelido: string;
}

function lerSessao(): Sessao | null {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null');
  } catch {
    return null;
  }
}

function salvarSessao(s: Sessao | null) {
  try {
    if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    /* sem sessionStorage: reconexão pede o apelido de novo */
  }
}

type Resultado = Extract<MensagemServidor, { t: 'resultado' }>;

/** Tela do celular: entrar na sala, resolver o desafio e ver o resultado. */
export function ArenaJogador() {
  const [params] = useSearchParams();
  const [pin, setPin] = useState(params.get('pin') ?? lerSessao()?.pin ?? '');
  const [apelido, setApelido] = useState(lerSessao()?.apelido ?? '');
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [rodada, setRodada] = useState<{ numero: number; desafio: DesafioPublico; fimEm: number } | null>(null);
  const [fim, setFim] = useState<{ solucao: string; posicao: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pontos, setPontos] = useState(0);
  const [padrao, setPadrao] = useState('');
  const [previa, setPrevia] = useState<{ deve: boolean[]; nao: boolean[] } | null>(null);
  const [erroRegex, setErroRegex] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const { conectado, enviar, restante } = useArena(
    (m) => {
      switch (m.t) {
        case 'jogador:entrou': {
          const s = { pin: m.pin, id: m.id, apelido: m.apelido };
          setSessao(s);
          salvarSessao(s);
          setPontos(m.pontos);
          setAviso('');
          break;
        }
        case 'rodada:inicio':
          setRodada({ numero: m.numero, desafio: m.desafio, fimEm: m.fimEm });
          setFim(null);
          setResultado(null);
          setPadrao('');
          setPrevia(null);
          break;
        case 'rodada:fim': {
          setRodada(null);
          const s = lerSessao();
          const posicao = m.ranking.findIndex((j) => j.apelido === s?.apelido) + 1;
          setFim({ solucao: m.solucao, posicao, total: m.ranking.length });
          break;
        }
        case 'resultado':
          setResultado(m);
          setPontos(m.total);
          if (!m.ok && m.erro) setAviso(m.erro);
          else setAviso('');
          break;
        case 'erro':
          setAviso(m.msg);
          // Só sai da sala se ela deixou de existir (não por um envio recusado).
          if (m.codigo === 'SALA_INEXISTENTE' || m.codigo === 'SALA_ENCERRADA') {
            setSessao(null);
            salvarSessao(null);
          }
          break;
      }
    },
    (env) => {
      const s = lerSessao();
      if (s) env({ t: 'jogador:entrar', pin: s.pin, apelido: s.apelido, id: s.id });
    },
  );

  useTique(!!rodada);

  // Pré-visualização local enquanto digita (roda num worker, à prova de ReDoS).
  useEffect(() => {
    if (!rodada || !padrao) {
      setPrevia(null);
      setErroRegex(null);
      return;
    }
    let vivo = true;
    const { deveCasar, naoDeveCasar } = rodada.desafio;
    testarEmWorker(padrao, '', [...deveCasar, ...naoDeveCasar]).then((r) => {
      if (!vivo) return;
      if (Array.isArray(r)) {
        setErroRegex(null);
        setPrevia({ deve: r.slice(0, deveCasar.length), nao: r.slice(deveCasar.length) });
      } else {
        setErroRegex(r.erro);
        setPrevia(null);
      }
    });
    return () => {
      vivo = false;
    };
  }, [padrao, rodada]);

  const acertou = !!resultado?.correto;
  const segundos = rodada ? Math.ceil(restante(rodada.fimEm) / 1000) : 0;

  if (!sessao) {
    return (
      <main className="pagina arena">
        <h1>Regex Arena</h1>
        <form
          className="cartao"
          onSubmit={(e) => {
            e.preventDefault();
            enviar({ t: 'jogador:entrar', pin: pin.trim(), apelido: apelido.trim() });
          }}
        >
          <label className="campo-demo">
            <span>PIN da sala (está no telão)</span>
            <input className="pin" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} required />
          </label>
          <label className="campo-demo">
            <span>Seu apelido</span>
            <input value={apelido} maxLength={16} onChange={(e) => setApelido(e.target.value)} required autoComplete="nickname" />
          </label>
          <button type="submit" disabled={!conectado || pin.length !== 4 || !apelido.trim()}>
            Entrar na sala
          </button>
          {!conectado && <p className="estado-conexao">Conectando ao servidor…</p>}
          {aviso && <p className="erro-regex">{aviso}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="pagina arena">
      <p className="estado-conexao">
        {sessao.apelido} · sala {sessao.pin} · <b>{pontos} pontos</b>
        {!conectado && ' · reconectando…'}
      </p>

      {!rodada && !fim && (
        <div className="cartao">
          <h2>Você está na sala</h2>
          <p>Olhe para o telão: a rodada começa quando quem apresenta mandar.</p>
        </div>
      )}

      {!rodada && fim && (
        <div className="cartao">
          <h2>{fim.posicao > 0 ? `Você está em ${fim.posicao}º de ${fim.total}` : 'Rodada encerrada'}</h2>
          <p>
            Uma solução: <code>/{fim.solucao}/</code>
          </p>
          <p>Aguarde a próxima rodada.</p>
        </div>
      )}

      {rodada && (
        <div className="cartao">
          <p>
            <span className={`cronometro${segundos <= 10 ? ' acabando' : ''}`}>{segundos}s</span> · rodada {rodada.numero}
          </p>
          <h2>{rodada.desafio.titulo}</h2>
          <p className="legenda">Deve casar</p>
          <ul className="lista-desafio deve">
            {rodada.desafio.deveCasar.map((s, i) => (
              <li key={s} className={previa ? (previa.deve[i] ? 'ok' : 'falhou') : ''}>
                {s}
              </li>
            ))}
          </ul>
          <p className="legenda">Não pode casar</p>
          <ul className="lista-desafio nao-deve">
            {rodada.desafio.naoDeveCasar.map((s, i) => (
              <li key={s} className={previa ? (previa.nao[i] ? 'falhou' : 'ok') : ''}>
                {s}
              </li>
            ))}
          </ul>

          {acertou ? (
            <p className="resultado-envio ok">Acertou! +{resultado!.pontos} pontos. Espere a rodada terminar.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (padrao) enviar({ t: 'jogador:enviar', padrao, flags: '' });
              }}
            >
              <CampoRegex
                padrao={padrao}
                aoMudarPadrao={(v) => {
                  setPadrao(v);
                  setResultado(null);
                }} erro={erroRegex} rotulo={`Sua regex. Dica: ${rodada.desafio.dica}`} />
              <button type="submit" style={{ marginTop: '0.6rem', width: '100%' }} disabled={!padrao || segundos === 0}>
                Enviar ({padrao.length} caracteres)
              </button>
              {resultado && !resultado.correto && resultado.ok && (
                <p className="resultado-envio nao">Ainda não: confira as palavras marcadas com ✗.</p>
              )}
            </form>
          )}
          {aviso && <p className="erro-regex">{aviso}</p>}
        </div>
      )}
    </main>
  );
}

export default ArenaJogador;
