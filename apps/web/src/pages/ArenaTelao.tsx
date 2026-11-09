import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Qr } from '../components/Qr.tsx';
import { useArena, useTique, type EstadoSala, type FimRodada, type LinhaRanking } from '../jogos/arena/useArena.ts';
import { SLIDES } from '../slides/conteudo.ts';

/** Slide da Arena (para o botão de voltar). */
const SLIDE_ARENA = SLIDES.findIndex((s) => s.id === 'arena') + 1;
const CHAVE = 'arena:telao';
const OPCOES_RODADAS = [3, 5, 8, 10];

/**
 * PIN e token secreto da sala deste telão. Fica em localStorage (compartilhado
 * entre abas): voltar aos slides e abrir o telão de novo retoma a MESMA sala.
 */
function lerSala(): { pin: string; token: string } | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
  } catch {
    return null;
  }
}

function salvarSala(s: { pin: string; token: string } | null) {
  try {
    if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
    else localStorage.removeItem(CHAVE);
  } catch {
    /* sem localStorage: recarregar a página cria outra sala */
  }
}

interface PropsRanking {
  linhas: LinhaRanking[];
  mostrarGanho?: boolean;
  aoRemover?: (apelido: string) => void;
}

function Ranking({ linhas, mostrarGanho, aoRemover }: PropsRanking) {
  if (linhas.length === 0) return <p className="estado-conexao">Ninguém entrou ainda. Leia o QR code para jogar.</p>;
  return (
    <ol className="ranking">
      {linhas.slice(0, 12).map((j) => (
        <li key={j.apelido}>
          <span className="apelido">{j.apelido}</span>
          <span className="pts">
            {j.pontos}
            {mostrarGanho && j.pontosRodada > 0 && <span className="ganho">+{j.pontosRodada}</span>}
          </span>
          {aoRemover && (
            <button type="button" className="remover" aria-label={`Remover ${j.apelido} da sala`} title="Remover da sala" onClick={() => aoRemover(j.apelido)}>
              ×
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Pódio animado do fim da partida: 3º, 2º e 1º sobem em sequência. */
function Podio({ ranking, aoNovaPartida }: { ranking: LinhaRanking[]; aoNovaPartida: () => void }) {
  const [primeiro, segundo, terceiro] = ranking;
  const degrau = (j: LinhaRanking | undefined, lugar: 1 | 2 | 3) => (
    <div className={`degrau degrau-${lugar}`}>
      <span className="podio-nome">{j?.apelido ?? '—'}</span>
      <span className="podio-pontos">{j ? `${j.pontos} pts` : ''}</span>
      <span className="podio-bloco">{lugar}º</span>
    </div>
  );
  return (
    <section className="podio" aria-label="Pódio final">
      <h2>Fim de jogo!</h2>
      <div className="podio-degraus">
        {degrau(segundo, 2)}
        {degrau(primeiro, 1)}
        {degrau(terceiro, 3)}
      </div>
      {ranking.length > 3 && (
        <ol className="podio-resto" start={4}>
          {ranking.slice(3, 10).map((j) => (
            <li key={j.apelido}>
              {j.apelido} <b>{j.pontos}</b>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={aoNovaPartida}>
        Nova partida
      </button>
    </section>
  );
}

/** Tela do apresentador: PIN, QR, desafio da rodada, cronômetro, ranking e pódio. */
export function ArenaTelao() {
  const [estado, setEstado] = useState<EstadoSala | null>(null);
  const [fim, setFim] = useState<FimRodada | null>(null);
  const [podio, setPodio] = useState(false);
  const [aviso, setAviso] = useState('');

  const { conectado, enviar, restante } = useArena(
    (m) => {
      if (m.t === 'sala:criada') {
        salvarSala({ pin: m.pin, token: m.token });
      } else if (m.t === 'sala:estado') {
        setEstado(m);
        if (!m.rodada) {
          setFim(null);
          setPodio(false);
        }
      } else if (m.t === 'rodada:inicio') {
        setFim(null);
        setAviso('');
      } else if (m.t === 'rodada:fim') {
        setFim(m);
      } else if (m.t === 'erro') {
        if (m.codigo === 'SALA_INEXISTENTE' || m.codigo === 'NAO_AUTORIZADO') {
          // A sala salva expirou ou pertence a outro telão: cria uma nova.
          salvarSala(null);
          enviar({ t: 'host:criar' });
        } else setAviso(m.msg);
      }
    },
    (env) => {
      const s = lerSala();
      env(s ? { t: 'host:retomar', pin: s.pin, token: s.token } : { t: 'host:criar' });
    },
  );

  const rodada = estado?.rodada ?? null;
  const ativa = !!rodada?.ativa;
  useTique(ativa);
  const segundos = rodada ? Math.ceil(restante(rodada.fimEm) / 1000) : 0;
  const linkJogo = estado ? `${location.origin}/arena?pin=${estado.pin}` : '';
  const partidaEncerrada = !!estado?.partidaEncerrada;
  const remover = (apelido: string) => {
    if (window.confirm(`Remover "${apelido}" da sala? O apelido não poderá ser usado de novo.`)) enviar({ t: 'host:remover', apelido });
  };
  const novaPartida = () => {
    setPodio(false);
    setFim(null);
    enviar({ t: 'host:nova-partida' });
  };

  if (estado && podio) {
    return (
      <main className="telao telao-podio">
        <Podio ranking={estado.ranking} aoNovaPartida={novaPartida} />
      </main>
    );
  }

  return (
    <main className="telao">
      <section>
        <h1>Regex Arena</h1>
        {!estado && <p className="estado-conexao">{conectado ? 'Criando sala…' : 'Conectando ao servidor…'}</p>}

        {estado && !rodada && (
          <>
            <p>Entre pelo celular e digite o PIN da sala:</p>
            <div className="entrada">
              <span className="pin-grande" aria-label={`PIN ${estado.pin.split('').join(' ')}`}>
                {estado.pin}
              </span>
              <Qr url={linkJogo} tamanho={210} legenda={`${location.host}/arena`} />
            </div>
            <p>
              {estado.totalJogadores} {estado.totalJogadores === 1 ? 'pessoa conectada' : 'pessoas conectadas'}.
            </p>
            <label className="seletor-rodadas">
              Rodadas da partida:{' '}
              <select value={estado.totalRodadas} onChange={(e) => enviar({ t: 'host:configurar', rodadas: Number(e.target.value) })}>
                {OPCOES_RODADAS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {estado && rodada && (
          <>
            <p className="estado-conexao">
              Rodada {rodada.numero} de {estado.totalRodadas}, etapa {rodada.desafio.etapa}. PIN {estado.pin}
            </p>
            <h2 className="desafio-titulo">{rodada.desafio.titulo}</h2>
            <p>Deve casar com todas:</p>
            <ul className="lista-desafio deve">
              {rodada.desafio.deveCasar.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p>E com nenhuma destas:</p>
            <ul className="lista-desafio nao-deve">
              {rodada.desafio.naoDeveCasar.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {ativa ? (
              <p>
                <span className={`cronometro${segundos <= 10 ? ' acabando' : ''}`}>{segundos}s</span>{' '}
                {rodada.acertos} de {estado.totalJogadores} já acertaram. Há casos ocultos: decorar as palavras não basta.
              </p>
            ) : (
              fim && (
                <div className="revelacao">
                  <p className="solucao">
                    Uma solução: <code>/{fim.solucao}/</code>
                  </p>
                  {fim.ocultos.deve.length + fim.ocultos.naoDeve.length > 0 && (
                    <>
                      <p>Casos ocultos revelados:</p>
                      <ul className="lista-desafio deve oculto">
                        {fim.ocultos.deve.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <ul className="lista-desafio nao-deve oculto">
                        {fim.ocultos.naoDeve.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )
            )}
          </>
        )}

        {estado && (
          <div className="controles">
            {ativa ? (
              <button type="button" className="secundario" onClick={() => enviar({ t: 'host:encerrar-rodada' })}>
                Encerrar rodada
              </button>
            ) : partidaEncerrada ? (
              <button type="button" onClick={() => setPodio(true)}>
                Mostrar pódio
              </button>
            ) : (
              <button type="button" onClick={() => enviar({ t: 'host:iniciar-rodada' })} disabled={estado.totalJogadores === 0}>
                {rodada ? `Próxima rodada (${rodada.numero + 1} de ${estado.totalRodadas})` : 'Iniciar primeira rodada'}
              </button>
            )}
            <Link to={`/slide/${SLIDE_ARENA}`} className="botao-link botao-contorno">
              Voltar aos slides
            </Link>
          </div>
        )}
        {aviso && <p className="erro-regex">{aviso}</p>}
        {!conectado && estado && <p className="erro-regex">Conexão perdida. Tentando reconectar…</p>}
      </section>

      <aside aria-label="Ranking">
        <h2>Ranking</h2>
        <Ranking linhas={estado?.ranking ?? []} mostrarGanho={!!rodada && !ativa} aoRemover={remover} />
      </aside>
    </main>
  );
}

export default ArenaTelao;
