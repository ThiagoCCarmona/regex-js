/**
 * Demonstrações ao vivo das seis etapas. Todas chamam as funções REAIS do
 * pacote @regex-js/etapas — o mesmo código entregue e testado.
 */
import { useMemo, useState } from 'react';
import {
  FRASE_ETAPA1,
  RE_NUMERO,
  RE_PALAVRA_L,
  ehIdentificador,
  ehIdentificadorMaiusculo,
  validarMatricula,
  validarData,
  validarTelefone,
  validarCodigoLfa,
  RE_EMAIL,
  RE_DATA_TEXTO,
  RE_HASHTAG,
  RE_HORARIO_TEXTO,
  extrairDatas,
  validarHorario,
  normalizarEspacos,
  mascararCpf,
  separar,
  substituirLiteral,
  reformatarDataComGrupos,
  analisarLogs,
  tokenizar,
} from '@regex-js/etapas';
import { Fita, type Marca } from '../../components/Fita.tsx';
import { marcasDe } from './util.ts';
import textoBase from '../../../../../equipe_02_javascript/dados/texto_base.txt?raw';
import logBase from '../../../../../equipe_02_javascript/dados/logs.txt?raw';
import logAmpliado from '../../../../../equipe_02_javascript/dados/logs_ampliado.txt?raw';
import logSemantica from '../../../../../equipe_02_javascript/dados/logs_semantica.txt?raw';

function Selo({ ok, sim = 'aceita', nao = 'rejeita' }: { ok: boolean; sim?: string; nao?: string }) {
  return <span className={`selo ${ok ? 'ok' : 'nao'}`}>{ok ? `✓ ${sim}` : `✗ ${nao}`}</span>;
}

/* ---------------- Etapa 1 ---------------- */
export function Etapa1() {
  const [id, setId] = useState('_contador');
  const casos = ['total', '_contador', '2valor', 'nome_completo', 'x-y'];
  const desafio = ['Total', 'TOTAL_2', 'total', '_Total'];
  return (
    <div className="demo demo-duas-colunas">
      <div>
        <label className="campo-demo">
          <span>Teste um identificador</span>
          <input value={id} onChange={(e) => setId(e.target.value)} spellCheck={false} className="mono" />
        </label>
        <div className="linha-resultado">
          <Fita variante="fita" texto={id} marcas={ehIdentificador(id) ? [{ inicio: 0, fim: id.length }] : []} />
          <Selo ok={ehIdentificador(id)} />
        </div>
        <ul className="lista-casos">
          {casos.map((c) => (
            <li key={c}>
              <button type="button" className="secundario mono" onClick={() => setId(c)}>
                {c}
              </button>
              <Selo ok={ehIdentificador(c)} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="legenda">Números e palavras com L na frase</p>
        <Fita texto={FRASE_ETAPA1} marcas={[...marcasDe(FRASE_ETAPA1, RE_NUMERO, 'azul'), ...marcasDe(FRASE_ETAPA1, RE_PALAVRA_L)]} />
        <p className="legenda" style={{ marginTop: '1rem' }}>
          Desafio <code>/^[A-Z][A-Za-z0-9_]*$/</code>
        </p>
        <ul className="lista-casos">
          {desafio.map((c) => (
            <li key={c}>
              <code>{c}</code> <Selo ok={ehIdentificadorMaiusculo(c)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Etapa 2 ---------------- */
export function Etapa2() {
  const [mat, setMat] = useState('CC-2026-001');
  const [data, setData] = useState('99/99/9999');
  const [tel, setTel] = useState('(45) 99999-1234');
  const [cod, setCod] = useState('LFA-2026-01');
  const d = validarData(data);
  return (
    <div className="demo grade-campos">
      <label className="campo-demo">
        <span>Matrícula CC-AAAA-NNN</span>
        <input value={mat} onChange={(e) => setMat(e.target.value)} className="mono" spellCheck={false} />
        <Selo ok={validarMatricula(mat)} />
      </label>
      <label className="campo-demo">
        <span>Data DD/MM/AAAA</span>
        <input value={data} onChange={(e) => setData(e.target.value)} className="mono" spellCheck={false} />
        <span className="selos">
          <Selo ok={d.sintatica} sim="sintaxe ok" nao="sintaxe" />
          <Selo ok={d.semantica} sim="data existe" nao="não existe" />
        </span>
        <small className="motivo">{d.motivo}</small>
      </label>
      <label className="campo-demo">
        <span>Telefone (DD) DDDDD-DDDD</span>
        <input value={tel} onChange={(e) => setTel(e.target.value)} className="mono" spellCheck={false} />
        <Selo ok={validarTelefone(tel)} />
      </label>
      <label className="campo-demo">
        <span>Desafio: código LFA-AAAA-NN</span>
        <input value={cod} onChange={(e) => setCod(e.target.value)} className="mono" spellCheck={false} />
        <Selo ok={validarCodigoLfa(cod)} />
      </label>
    </div>
  );
}

/* ---------------- Etapa 3 ---------------- */
export function Etapa3() {
  const [texto, setTexto] = useState(textoBase.trim());
  const marcas: Marca[] = useMemo(() => {
    const horarios = [...texto.matchAll(RE_HORARIO_TEXTO)].map((m) => ({
      inicio: m.index,
      fim: m.index + m[0].length,
      cor: validarHorario(m[0]) ? ('verde' as const) : ('vermelho' as const),
    }));
    return [...marcasDe(texto, RE_EMAIL), ...marcasDe(texto, RE_DATA_TEXTO, 'azul'), ...marcasDe(texto, RE_HASHTAG), ...horarios];
  }, [texto]);
  const datas = extrairDatas(texto);
  return (
    <div className="demo demo-duas-colunas larga-esquerda">
      <div>
        <Fita texto={texto} marcas={marcas} />
        <details className="editar">
          <summary>Editar o texto</summary>
          <textarea rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </details>
        <p className="legenda-cores">
          <mark>e-mail e hashtag</mark> <mark className="marca-azul">data</mark> <mark className="marca-verde">horário válido</mark>{' '}
          <mark className="marca-vermelho">horário inválido</mark>
        </p>
      </div>
      <div>
        <table className="tabela">
          <thead>
            <tr>
              <th>data</th>
              <th>m.groups.dia</th>
              <th>.mes</th>
              <th>.ano</th>
            </tr>
          </thead>
          <tbody>
            {datas.map((x) => (
              <tr key={x.texto + x.dia}>
                <td className="mono">{x.texto}</td>
                <td className="mono">{x.dia}</td>
                <td className="mono">{x.mes}</td>
                <td className="mono">{x.ano}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Etapa 4 ---------------- */
export function Etapa4() {
  const [espacos, setEspacos] = useState('   LFA    com   Python   é    prática!   ');
  const [cpf, setCpf] = useState('123.456.789-00');
  const [linha, setLinha] = useState('LFA;Python,Regex | Automatos');
  const visivel = (s: string) => s.replace(/ /g, '·');
  const mascarado = mascararCpf(cpf);
  return (
    <div className="demo grade-campos">
      <label className="campo-demo">
        <span>Normalizar espaços</span>
        <input value={espacos} onChange={(e) => setEspacos(e.target.value)} className="mono" spellCheck={false} />
        <code className="saida">"{visivel(normalizarEspacos(espacos))}"</code>
      </label>
      <label className="campo-demo">
        <span>Mascarar CPF fictício</span>
        <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="mono" spellCheck={false} />
        {mascarado ? <code className="saida">{mascarado}</code> : <span className="selo nao">✗ fora do formato 000.000.000-00</span>}
      </label>
      <label className="campo-demo">
        <span>Separar por ; , ou |</span>
        <input value={linha} onChange={(e) => setLinha(e.target.value)} className="mono" spellCheck={false} />
        <span className="pilulas">
          {separar(linha).map((p, i) => (
            <code key={i}>{p}</code>
          ))}
        </span>
      </label>
      <div className="campo-demo">
        <span>Literal × grupos</span>
        <code className="saida">replaceAll('$5', '$&$&') → "{'preço: $5'.replaceAll('$5', '$&$&')}"</code>
        <code className="saida">com função → "{substituirLiteral('preço: $5', '$5', '$&$&')}"</code>
        <code className="saida">$&lt;ano&gt;-$&lt;mes&gt;-$&lt;dia&gt; → {reformatarDataComGrupos('01/09/2026')}</code>
      </div>
    </div>
  );
}

/* ---------------- Etapa 5 ---------------- */
const LOGS = { base: logBase, ampliado: logAmpliado, semantica: logSemantica } as const;

function Barras({ titulo, dados }: { titulo: string; dados: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(dados));
  return (
    <figure className="barras">
      <figcaption>{titulo}</figcaption>
      {Object.entries(dados).map(([k, v]) => (
        <div key={k} className="barra-linha">
          <span className="mono">{k}</span>
          <span className="barra" style={{ width: `${(v / max) * 100}%` }} />
          <b>{v}</b>
        </div>
      ))}
      {Object.keys(dados).length === 0 && <p className="vazio">nenhuma linha válida</p>}
    </figure>
  );
}

export function Etapa5() {
  const [qual, setQual] = useState<keyof typeof LOGS>('base');
  const [texto, setTexto] = useState(LOGS.base);
  const r = analisarLogs(texto);
  const nomes = { base: 'logs.txt', ampliado: 'logs_ampliado.txt', semantica: 'logs_semantica.txt' };
  return (
    <div className="demo demo-duas-colunas larga-esquerda">
      <div>
        <div className="abas" role="tablist" aria-label="Arquivo de log">
          {(Object.keys(LOGS) as Array<keyof typeof LOGS>).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={qual === k}
              className={qual === k ? '' : 'secundario'}
              onClick={() => {
                setQual(k);
                setTexto(LOGS[k]);
              }}
            >
              {nomes[k]}
            </button>
          ))}
        </div>
        <textarea rows={9} wrap="off" className="log" value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} aria-label="Conteúdo do log" />
        <p>
          <span className="selo ok">✓ {r.validas.length} {r.validas.length === 1 ? 'válida' : 'válidas'}</span> <span className="selo nao">✗ {r.rejeitadas.length} {r.rejeitadas.length === 1 ? 'rejeitada' : 'rejeitadas'}</span>
        </p>
        <ul className="rejeitadas">
          {r.rejeitadas.map((x) => (
            <li key={x.linha}>
              linha {x.linha}: {x.motivo}
            </li>
          ))}
        </ul>
      </div>
      <div className="grade-barras">
        <Barras titulo="por nível" dados={r.porNivel} />
        <Barras titulo="por usuário" dados={r.porUsuario} />
        <Barras titulo="por ação" dados={r.porAcao} />
      </div>
    </div>
  );
}

/* ---------------- Etapa 6 ---------------- */
export function Etapa6() {
  const exemplos = ['total = preco * 2 + desconto_1 - 3.5', 'resultado = (a + b) >= 10; x != 0, y == 2', 'a = b @ 2'];
  const [entrada, setEntrada] = useState(exemplos[1]);
  const { tokens, erros } = tokenizar(entrada);
  return (
    <div className="demo">
      <label className="campo-demo largo">
        <span>Expressão</span>
        <input value={entrada} onChange={(e) => setEntrada(e.target.value)} className="mono grande" spellCheck={false} />
      </label>
      <div className="exemplos-linha">
        {exemplos.map((ex) => (
          <button key={ex} type="button" className="secundario mono" onClick={() => setEntrada(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <ol className="tokens" aria-label="Tokens">
        {tokens.map((t, i) => (
          <li key={i} className={`token token-${t.tipo.toLowerCase()}`}>
            <span className="lexema">{t.lexema}</span>
            <span className="tipo">{t.tipo}</span>
          </li>
        ))}
      </ol>
      {erros.length > 0 && (
        <div className="erro-lexico" role="alert">
          <Fita
            variante="fita"
            texto={entrada}
            marcas={erros.map((e) => ({ inicio: e.pos, fim: e.pos + 1, cor: 'vermelho' as const }))}
            cursor={erros[0].pos}
          />
          <p>
            {erros.map((e) => (
              <span key={e.pos}>
                Símbolo inesperado <code>{e.simbolo}</code> na posição {e.pos} (coluna {e.coluna}).{' '}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
