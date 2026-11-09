import { useEffect, useState } from 'react';
import { CampoRegex } from '../components/CampoRegex.tsx';
import { Fita } from '../components/Fita.tsx';
import { casamentosEmWorker, literalRegex, type Casamento } from '../lib/regex-segura.ts';
import { classificar } from '../lib/thompson.ts';
import { AutomatoThompson } from '../components/AutomatoThompson.tsx';

const EXEMPLOS: Array<{ nome: string; padrao: string; flags: string; texto: string }> = [
  {
    nome: 'Datas com grupos nomeados',
    padrao: '(?<dia>[0-9]{2})/(?<mes>[0-9]{2})/(?<ano>[0-9]{4})',
    flags: 'g',
    texto: 'A prova 1 será em 01/09/2026 e a revisão em 03/09/2026.',
  },
  {
    nome: 'E-mails',
    padrao: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    flags: 'g',
    texto: 'Dúvidas: ana.silva@udc.edu.br ou joao123@gmail.com.',
  },
  {
    nome: 'Palavras com L (Unicode)',
    padrao: '(?<![\\p{L}\\p{N}_])[Ll][\\p{L}\\p{N}_]*',
    flags: 'gu',
    texto: 'A turma LFA 2026 possui 32 acadêmicos e 6 laboratórios.',
  },
  {
    nome: '\\w não conhece acentos',
    padrao: '\\b[Ll]\\w*',
    flags: 'g',
    texto: 'A turma LFA 2026 possui 32 acadêmicos e 6 laboratórios.',
  },
  {
    nome: 'Retro-referência (não regular!)',
    padrao: '\\b(?<p>[a-z]+) \\k<p>\\b',
    flags: 'gi',
    texto: 'Isso é é um erro de de digitação muito muito comum.',
  },
  {
    nome: 'ReDoS: (a+)+$',
    padrao: '(a+)+$',
    flags: '',
    texto: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
  },
];

export function Playground() {
  const [padrao, setPadrao] = useState(EXEMPLOS[0].padrao);
  const [flags, setFlags] = useState(EXEMPLOS[0].flags);
  const [texto, setTexto] = useState(EXEMPLOS[0].texto);
  const [casamentos, setCasamentos] = useState<Casamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    casamentosEmWorker(padrao, flags, texto).then((r) => {
      if (!vivo) return;
      if ('erro' in r) {
        setErro(r.erro);
        setCasamentos([]);
      } else {
        setErro(null);
        setCasamentos(r.casamentos);
      }
    });
    return () => {
      vivo = false;
    };
  }, [padrao, flags, texto]);

  const nomes = casamentos[0]?.nomeados ? Object.keys(casamentos[0].nomeados) : [];
  const qtdGrupos = casamentos[0]?.grupos.length ?? 0;
  // RegExp.prototype.source escapa as barras: /a\/b/ e não /a/b/.
  const literal = literalRegex(padrao, flags);
  const teoria = classificar(padrao);
  const SELO = { formal: 'ER formal: regular', 'nao-regular': 'Pode não ser regular', 'fora-da-notacao': 'Regular, fora da notação formal', grande: 'ER formal (grande)', invalida: '' } as const;

  return (
    <main className="pagina">
      <h1>Playground</h1>
      <p>
        Digite uma regex e um texto. Os casamentos aparecem marcados e os grupos ficam na tabela. A regex roda num Web
        Worker com limite de tempo, então até um padrão catastrófico não trava a página.
      </p>

      <div className="exemplos" aria-label="Exemplos prontos">
        {EXEMPLOS.map((ex) => (
          <button
            key={ex.nome}
            type="button"
            className="secundario"
            onClick={() => {
              setPadrao(ex.padrao);
              setFlags(ex.flags);
              setTexto(ex.texto);
            }}
          >
            {ex.nome}
          </button>
        ))}
      </div>

      <div className="playground">
        <section>
          <CampoRegex padrao={padrao} flags={flags} aoMudarPadrao={setPadrao} aoMudarFlags={setFlags} erro={erro} autoFocus />
          {teoria.tipo !== 'invalida' && (
            <span className={`selo-teoria ${teoria.tipo}`} title={teoria.texto}>
              {SELO[teoria.tipo]}
            </span>
          )}
          <label style={{ display: 'block', marginTop: '1rem' }}>
            <span className="rotulo" style={{ fontWeight: 700, color: 'var(--texto-suave)' }}>
              Texto
            </span>
            <textarea rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} />
          </label>
          <p className="resumo-casamentos" aria-live="polite">
            {erro ? 'Sem resultado.' : `${casamentos.length} casamento${casamentos.length === 1 ? '' : 's'}`}
          </p>
          <Fita texto={texto} marcas={casamentos.map((c) => ({ inicio: c.inicio, fim: c.fim }))} />
          <p style={{ marginTop: '1rem' }}>
            Em JavaScript: <code>{`[...texto.matchAll(${literal.includes('g') ? literal : literal + 'g'})]`}</code>
          </p>
        </section>

        <section aria-label="Grupos capturados">
          <h3>Grupos</h3>
          {casamentos.length === 0 ? (
            <p>Nenhum casamento para mostrar. Ajuste a regex ou o texto.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>m[0]</th>
                    {Array.from({ length: qtdGrupos }, (_, i) => (
                      <th key={i}>m[{i + 1}]</th>
                    ))}
                    {nomes.map((n) => (
                      <th key={n}>groups.{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {casamentos.slice(0, 50).map((c, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="mono">{c.texto === '' ? 'λ' : c.texto}</td>
                      {c.grupos.map((g, j) => (
                        <td key={j} className="mono">
                          {g ?? '—'}
                        </td>
                      ))}
                      {nomes.map((n) => (
                        <td key={n} className="mono">
                          {c.nomeados?.[n] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="teoria-playground" aria-label="Ponte com a teoria">
        <h2>Da regex ao autômato</h2>
        <p>
          Se a regex usa só união, concatenação, fecho e símbolos, ela é uma ER da teoria e tem um AFN equivalente. Este é o AFN da construção
          de Thompson (as transições ε aparecem tracejadas).
        </p>
        <AutomatoThompson padrao={padrao} />
      </section>
    </main>
  );
}
