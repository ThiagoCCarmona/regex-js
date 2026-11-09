import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Qr } from '../components/Qr.tsx';
import { useArena, useTique, type EstadoSala, type LinhaRanking } from '../jogos/arena/useArena.ts';

const CHAVE = 'arena:telao';

/** PIN e token secreto da sala deste telão (para retomar após recarregar a página). */
function lerSala(): { pin: string; token: string } | null {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null');
  } catch {
    return null;
  }
}

function salvarSala(s: { pin: string; token: string } | null) {
  try {
    if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    /* sem sessionStorage: recarregar a página cria outra sala */
  }
}

function Ranking({ linhas, mostrarGanho }: { linhas: LinhaRanking[]; mostrarGanho?: boolean }) {
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
        </li>
      ))}
    </ol>
  );
}

/** Tela do apresentador: PIN, QR, desafio da rodada, cronômetro e ranking. */
export function ArenaTelao() {
  const [estado, setEstado] = useState<EstadoSala | null>(null);
  const [solucao, setSolucao] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const { conectado, enviar, restante } = useArena(
    (m) => {
      if (m.t === 'sala:criada') {
        salvarSala({ pin: m.pin, token: m.token });
      } else if (m.t === 'sala:estado') {
        setEstado(m);
      } else if (m.t === 'rodada:inicio') {
        setSolucao(null);
      } else if (m.t === 'rodada:fim') {
        setSolucao(m.solucao);
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
          </>
        )}

        {estado && rodada && (
          <>
            <p className="estado-conexao">
              Rodada {rodada.numero} · etapa {rodada.desafio.etapa} · PIN {estado.pin}
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
                <span className={`cronometro${segundos <= 10 ? ' acabando' : ''}`}>{segundos}s</span> ·{' '}
                {rodada.acertos} de {estado.totalJogadores} já acertaram
              </p>
            ) : (
              solucao && (
                <p className="solucao">
                  Uma solução: <code>/{solucao}/</code>
                </p>
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
            ) : (
              <button type="button" onClick={() => enviar({ t: 'host:iniciar-rodada' })} disabled={estado.totalJogadores === 0}>
                {rodada ? 'Próxima rodada' : 'Iniciar primeira rodada'}
              </button>
            )}
            <Link to="/slide/13" className="botao-link" style={{ background: 'transparent', color: 'var(--tinta)', border: '2px solid var(--tinta)' }}>
              Voltar aos slides
            </Link>
          </div>
        )}
        {aviso && <p className="erro-regex">{aviso}</p>}
        {!conectado && estado && <p className="erro-regex">Conexão perdida. Tentando reconectar…</p>}
      </section>

      <aside aria-label="Ranking">
        <h2>Ranking</h2>
        <Ranking linhas={estado?.ranking ?? []} mostrarGanho={!!rodada && !ativa} />
      </aside>
    </main>
  );
}

export default ArenaTelao;
