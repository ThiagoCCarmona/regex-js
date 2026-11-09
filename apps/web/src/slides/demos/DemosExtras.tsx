/** Demonstrações dos slides de abertura, comparação, teoria, ReDoS e encerramento. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fita } from '../../components/Fita.tsx';
import { Qr } from '../../components/Qr.tsx';
import { URL_PUBLICA, URL_REPOSITORIO } from '../../lib/config.ts';
import { casamentosEmWorker, cronometrarEmWorker } from '../../lib/regex-segura.ts';
import type { Marca } from '../../components/Fita.tsx';
import { EQUIPE, SLIDES } from '../conteudo.ts';

/* ---------------- Capa ---------------- */
const REGEX_CAPA = 'regulares|Java\\w+';

function prefereMenosMovimento() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Capa() {
  const [padrao, setPadrao] = useState(() => (prefereMenosMovimento() ? REGEX_CAPA : ''));
  const digitando = useRef(!prefereMenosMovimento());
  const titulo = SLIDES[0].titulo;

  // Único movimento automático do site: a regex é "digitada" e o título vai sendo marcado.
  useEffect(() => {
    if (!digitando.current) return;
    let i = 0;
    let timer = 0;
    const passo = () => {
      i++;
      setPadrao(REGEX_CAPA.slice(0, i));
      if (i < REGEX_CAPA.length) timer = window.setTimeout(passo, 85);
      else digitando.current = false;
    };
    timer = window.setTimeout(passo, 600);
    return () => window.clearTimeout(timer);
  }, []);

  // A regex da capa é editável ao vivo: roda no worker, como toda regex digitada.
  const [marcas, setMarcas] = useState<Marca[]>([]);
  useEffect(() => {
    let vivo = true;
    if (!padrao) {
      setMarcas([]);
      return;
    }
    casamentosEmWorker(padrao, 'g', titulo).then((r) => {
      if (!vivo) return;
      setMarcas('erro' in r ? [] : r.casamentos.filter((c) => c.fim > c.inicio).map((c) => ({ inicio: c.inicio, fim: c.fim })));
    });
    return () => {
      vivo = false;
    };
  }, [padrao, titulo]);

  return (
    <div className="capa">
      <div className="capa-texto">
        <h1 className="titulo-capa">
          <Fita texto={titulo} marcas={marcas} />
        </h1>
        <label className="regex-capa">
          <span className="barra">/</span>
          <input
            value={padrao}
            onChange={(e) => {
              digitando.current = false;
              setPadrao(e.target.value);
            }}
            spellCheck={false}
            aria-label="Regex aplicada ao título"
          />
          <span className="barra">/g</span>
        </label>
        <p className="subtitulo">{SLIDES[0].subtitulo}</p>
        <p className="creditos">
          Equipe {EQUIPE.numero}: {EQUIPE.integrantes.join(', ')}
          <br />
          {EQUIPE.disciplina}, {EQUIPE.professor}, {EQUIPE.semestre}
        </p>
      </div>
      <Qr url={URL_PUBLICA} tamanho={230} legenda="Acompanhe no celular" />
    </div>
  );
}

/* ---------------- API ---------------- */
const FLAGS: Array<[string, string]> = [
  ['g', 'global: todas as ocorrências (e guarda lastIndex)'],
  ['i', 'ignora maiúsculas/minúsculas'],
  ['m', '^ e $ valem por linha'],
  ['s', 'o ponto casa \\n'],
  ['u', 'Unicode: \\p{L}, código acima de U+FFFF'],
  ['y', 'sticky: casa exatamente em lastIndex'],
  ['d', 'índices de cada grupo (m.indices)'],
  ['v', 'Unicode estendido: operações de conjunto'],
];

export function Api() {
  return (
    <div className="demo">
      <ul className="flags">
        {FLAGS.map(([f, d]) => (
          <li key={f}>
            <code>{f}</code> {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Comparação ---------------- */
const COMPARACAO: Array<[string, string, string]> = [
  ['Reconhecimento completo', 're.fullmatch(p, s)', '/^p$/.test(s)'],
  ['Primeira ocorrência', 're.search(p, s)', '/p/.exec(s) ou s.match(/p/)'],
  ['Todas as ocorrências', 're.findall / re.finditer', 's.match(/p/g) / s.matchAll(/p/g)'],
  ['Substituição', 're.sub(p, r, s)', 's.replace(/p/g, r) / s.replaceAll'],
  ['Divisão', 're.split(p, s)', 's.split(/p/)'],
  ['Grupo nomeado', '(?P<nome>…)', '(?<nome>…)'],
  ['Acessar grupo', "m.group('nome')", 'm.groups.nome'],
  ['Retro-referência', '(?P=nome)', '\\k<nome>'],
  ['Na substituição', '\\g<nome> ou \\1', '$<nome> ou $1'],
  ['\\d e \\w', 'Unicode por padrão', 'apenas ASCII'],
  ['Compilar', 're.compile(p)', 'literal /p/ ou new RegExp(p)'],
  ['Estado entre chamadas', 'não tem', 'lastIndex com flags g e y'],
];

export function Comparacao() {
  return (
    <div className="demo rolagem-x">
      <table className="tabela tabela-comparacao">
        <thead>
          <tr>
            <th>Operação</th>
            <th>Python re</th>
            <th>JavaScript</th>
          </tr>
        </thead>
        <tbody>
          {COMPARACAO.map(([op, py, js]) => (
            <tr key={op}>
              <td>{op}</td>
              <td className="mono">{py}</td>
              <td className="mono">{js}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- lastIndex ---------------- */
export function LastIndex() {
  const re = useRef(/a/g);
  const [historico, setHistorico] = useState<Array<{ resultado: boolean; depois: number }>>([]);
  return (
    <div className="demo">
      <div className="exemplos-linha">
        <button type="button" onClick={() => setHistorico((h) => [...h, { resultado: re.current.test('a'), depois: re.current.lastIndex }])}>
          Executar re.test('a')
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => {
            re.current = /a/g;
            setHistorico([]);
          }}
        >
          Recomeçar
        </button>
      </div>
      <ol className="historico-lastindex" aria-live="polite">
        {historico.map((h, i) => (
          <li key={i}>
            <span className={`selo ${h.resultado ? 'ok' : 'nao'}`}>{String(h.resultado)}</span> lastIndex agora é <b>{h.depois}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Teoria ---------------- */
export function Teoria() {
  const [cadeia, setCadeia] = useState('abab');
  const ww = /^(?<p>[ab]+)\k<p>$/;
  const abb = /^(a|b)*abb$/;
  const soAB = /^[ab]*$/.test(cadeia);
  return (
    <div className="demo">
      <label className="campo-demo">
        <span>Cadeia sobre Σ = {'{a, b}'}</span>
        <input value={cadeia} onChange={(e) => setCadeia(e.target.value)} className="mono grande" spellCheck={false} />
      </label>
      {!soAB && <p className="erro-regex">Use só os símbolos a e b.</p>}
      <table className="tabela">
        <tbody>
          <tr>
            <td className="mono">/^(?&lt;p&gt;[ab]+)\k&lt;p&gt;$/</td>
            <td>L = {'{ ww }'}, não regular</td>
            <td>{ww.test(cadeia) ? <span className="selo ok">✓ aceita</span> : <span className="selo nao">✗ rejeita</span>}</td>
          </tr>
          <tr>
            <td className="mono">/^(a|b)*abb$/</td>
            <td>regular: termina em abb</td>
            <td>{abb.test(cadeia) ? <span className="selo ok">✓ aceita</span> : <span className="selo nao">✗ rejeita</span>}</td>
          </tr>
        </tbody>
      </table>
      <p className="legenda">Cadeia vazia (λ): {cadeia === '' ? 'é a que está no campo agora' : 'apague o campo para testar'}</p>
    </div>
  );
}

/* ---------------- ReDoS ---------------- */
export function ReDoS() {
  const [medidas, setMedidas] = useState<Array<{ n: number; ms: number | null }>>([]);
  const [rodando, setRodando] = useState(false);

  async function rodar() {
    setRodando(true);
    setMedidas([]);
    for (let n = 16; n <= 34; n += 2) {
      const r = await cronometrarEmWorker('(a+)+$', '', 'a'.repeat(n) + '!', 2000);
      const ms = 'ms' in r ? r.ms : null;
      setMedidas((m) => [...m, { n, ms }]);
      if (ms === null) break;
    }
    setRodando(false);
  }

  const max = Math.max(1, ...medidas.map((m) => m.ms ?? 2000));
  return (
    <div className="demo">
      <div className="exemplos-linha">
        <button type="button" onClick={rodar} disabled={rodando}>
          {rodando ? 'Medindo…' : "Medir /(a+)+$/.test('aaa…a!')"}
        </button>
      </div>
      <div className="grafico-redos" aria-live="polite">
        {medidas.map((m) => (
          <div key={m.n} className="barra-linha">
            <span className="mono">n={m.n}</span>
            <span className={`barra${m.ms === null ? ' estourou' : ''}`} style={{ width: `${((m.ms ?? 2000) / max) * 100}%` }} />
            <b>{m.ms === null ? 'interrompido após 2 s' : `${m.ms < 1 ? m.ms.toFixed(2) : Math.round(m.ms)} ms`}</b>
          </div>
        ))}
      </div>
      {medidas.length === 0 && <p className="legenda">Cada linha acrescenta dois "a" à cadeia.</p>}
    </div>
  );
}

/* ---------------- Arena ---------------- */
export function Arena() {
  return (
    <div className="demo arena-convite">
      <Qr url={`${URL_PUBLICA}/arena`} tamanho={260} legenda={`${URL_PUBLICA.replace(/^https?:\/\//, '')}/arena`} />
      <div>
        <p>Quem apresenta abre o telão, que mostra o PIN da sala.</p>
        <Link to="/arena/telao" target="_blank" className="botao-link">
          Abrir telão da Arena
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Fim ---------------- */
export function Fim() {
  return (
    <div className="demo arena-convite">
      <Qr url={URL_PUBLICA} tamanho={220} />
      <Qr url={URL_REPOSITORIO} tamanho={220} legenda="Código no GitHub" />
    </div>
  );
}
