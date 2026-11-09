/** Demonstrações dos slides de abertura, comparação, teoria, ReDoS e encerramento. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fita } from '../../components/Fita.tsx';
import { Qr } from '../../components/Qr.tsx';
import { URL_PUBLICA, URL_REPOSITORIO } from '../../lib/config.ts';
import { casamentosEmWorker, cronometrarEmWorker } from '../../lib/regex-segura.ts';
import type { Marca } from '../../components/Fita.tsx';
import { AutomatoThompson } from '../../components/AutomatoThompson.tsx';
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
type Linha = [string, string, string];

const COMPARACAO_API: Linha[] = [
  ['Reconhecimento completo', 're.fullmatch(p, s)', '/^p$/.test(s)'],
  ['Primeira ocorrência', 're.search(p, s)', '/p/.exec(s) ou s.match(/p/)'],
  ['Todas as ocorrências', 're.findall / re.finditer', 's.match(/p/g) / s.matchAll(/p/g)'],
  ['Substituição', 're.sub(p, r, s)', 's.replace(/p/g, r) / s.replaceAll'],
  ['Divisão', 're.split(p, s)', 's.split(/p/)'],
  ['Compilar', 're.compile(p)', 'literal /p/ ou new RegExp(p)'],
];

const COMPARACAO_COMPORTAMENTO: Linha[] = [
  ['Grupo nomeado', '(?P<nome>…)', '(?<nome>…)'],
  ['Acessar grupo', "m.group('nome')", 'm.groups.nome'],
  ['Retro-referência', '(?P=nome)', '\\k<nome>'],
  ['Na substituição', '\\g<nome> ou \\1', '$<nome> ou $1'],
  ['\\d e \\w', 'Unicode por padrão', 'apenas ASCII'],
  ['$ antes de \\n final', "casa: '123\\n' passa", "não casa: '123\\n' falha"],
  ['Estado entre chamadas', 'não tem', 'lastIndex com flags g e y'],
];

export const ComparacaoApi = () => <TabelaComparacao linhas={COMPARACAO_API} />;
export const ComparacaoComportamento = () => <TabelaComparacao linhas={COMPARACAO_COMPORTAMENTO} />;

function TabelaComparacao({ linhas }: { linhas: Linha[] }) {
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
          {linhas.map(([op, py, js]) => (
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
  const [regex, setRegex] = useState('(a|b)*abb');
  const [cadeia, setCadeia] = useState('abab');
  const ww = /^(?<p>[ab]+)\k<p>$/;
  const abb = /^(a|b)*abb$/;
  const soAB = /^[ab]*$/.test(cadeia);
  return (
    <div className="demo demo-teoria">
      <label className="campo-demo largo">
        <span>Regex: veja o AFN de Thompson (tente (a)\1 ou a(?=b))</span>
        <input value={regex} onChange={(e) => setRegex(e.target.value)} className="mono" spellCheck={false} />
      </label>
      <AutomatoThompson padrao={regex} alturaMax={210} />
      <div className="teoria-cadeia">
        <label className="campo-demo">
          <span>Cadeia sobre Σ = {'{a, b}'}</span>
          <input value={cadeia} onChange={(e) => setCadeia(e.target.value)} className="mono" spellCheck={false} />
        </label>
        <table className="tabela">
          <tbody>
            <tr>
              <td className="mono">^(a|b)*abb$</td>
              <td>regular</td>
              <td>{abb.test(cadeia) ? <span className="selo ok">✓ aceita</span> : <span className="selo nao">✗ rejeita</span>}</td>
            </tr>
            <tr>
              <td className="mono">^(?&lt;p&gt;[ab]+)\k&lt;p&gt;$</td>
              <td>{'{ ww }'}: não regular</td>
              <td>{ww.test(cadeia) ? <span className="selo ok">✓ aceita</span> : <span className="selo nao">✗ rejeita</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {!soAB && <p className="erro-regex">Use só os símbolos a e b na cadeia.</p>}
    </div>
  );
}

/* ---------------- ReDoS ---------------- */
const LIMITE_MS = 2000;

/** Curva do tempo de /(a+)+$/.test('a…a!') em função de n: o crescimento exponencial à vista. */
function GraficoReDoS({ medidas }: { medidas: Array<{ n: number; ms: number | null }> }) {
  const L = 620;
  const A = 250;
  const m = { esq: 62, dir: 16, topo: 18, base: 40 };
  const nMin = 16;
  const nMax = 34;
  const yMax = Math.max(500, ...medidas.map((d) => d.ms ?? LIMITE_MS));
  const x = (n: number) => m.esq + ((n - nMin) / (nMax - nMin)) * (L - m.esq - m.dir);
  const y = (ms: number) => A - m.base - (Math.min(ms, yMax) / yMax) * (A - m.topo - m.base);
  const pontos = medidas.map((d) => ({ ...d, px: x(d.n), py: y(d.ms ?? LIMITE_MS) }));
  const marcasY = [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax];
  return (
    <svg className="grafico-curva" viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Tempo de execução em função de n">
      {marcasY.map((v) => (
        <g key={v}>
          <line x1={m.esq} x2={L - m.dir} y1={y(v)} y2={y(v)} className="curva-grade" />
          <text x={m.esq - 8} y={y(v) + 4} textAnchor="end" className="curva-eixo">
            {Math.round(v)} ms
          </text>
        </g>
      ))}
      {Array.from({ length: (nMax - nMin) / 2 + 1 }, (_, k) => nMin + k * 2).map((n) => (
        <text key={n} x={x(n)} y={A - m.base + 18} textAnchor="middle" className="curva-eixo">
          {n}
        </text>
      ))}
      <text x={(L + m.esq) / 2} y={A - 4} textAnchor="middle" className="curva-titulo-eixo">
        n = quantidade de "a" antes do "!"
      </text>
      {pontos.length > 1 && <polyline points={pontos.map((p) => `${p.px},${p.py}`).join(' ')} className="curva-linha" />}
      {pontos.map((p) => (
        <g key={p.n}>
          <circle cx={p.px} cy={p.py} r={p.ms === null ? 7 : 5} className={p.ms === null ? 'curva-ponto curva-estouro' : 'curva-ponto'} />
          <text x={p.px} y={p.py - 11} textAnchor="middle" className="curva-valor">
            {p.ms === null ? 'interrompido' : p.ms < 10 ? p.ms.toFixed(1) : Math.round(p.ms)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ReDoS() {
  const [medidas, setMedidas] = useState<Array<{ n: number; ms: number | null }>>([]);
  const [rodando, setRodando] = useState(false);
  const iniciou = useRef(false);

  async function rodar() {
    setRodando(true);
    setMedidas([]);
    for (let n = 16; n <= 34; n += 2) {
      const r = await cronometrarEmWorker('(a+)+$', '', 'a'.repeat(n) + '!', LIMITE_MS);
      const ms = 'ms' in r ? r.ms : null;
      setMedidas((m) => [...m, { n, ms }]);
      if (ms === null) break;
    }
    setRodando(false);
  }

  // Roda sozinho ao abrir o slide: a curva vai aparecendo ponto a ponto.
  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    void rodar();
  }, []);

  return (
    <div className="demo">
      <GraficoReDoS medidas={medidas} />
      <div className="exemplos-linha">
        <button type="button" className="secundario" onClick={rodar} disabled={rodando}>
          {rodando ? 'Medindo…' : 'Medir de novo'}
        </button>
        <span className="legenda">Cada ponto acrescenta dois "a": o tempo cresce cerca de 4× a cada passo.</span>
      </div>
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
        <Link to="/arena/telao" className="botao-link">
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
