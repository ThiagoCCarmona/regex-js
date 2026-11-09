/**
 * Roteiro da apresentação (10 minutos). Fonte única para os slides do site e
 * para o apresentacao.pptx (scripts/gerar-pptx.mjs importa este arquivo).
 * Só dados: sem React, sem imports — o Node executa direto com type stripping.
 */

export interface Slide {
  id: string;
  titulo: string;
  subtitulo?: string;
  topicos: string[];
  /** Trecho de código mostrado no slide (e no pptx). */
  codigo?: string;
  /** Fala sugerida para quem apresenta (tecla N mostra). */
  notas: string;
  /** Demonstração interativa associada (nome do componente). */
  demo?: string;
  /** Quem da equipe apresenta este slide. */
  apresentador?: string;
}

export const EQUIPE = {
  numero: 2,
  linguagem: 'JavaScript / Node.js',
  integrantes: ['Thiago Corobinski Carmona'],
  disciplina: 'Linguagens Formais e Autômatos',
  professor: 'Prof. Luciano Cardoso',
  semestre: '2º semestre de 2026',
};

export const SLIDES: Slide[] = [
  {
    id: 'capa',
    titulo: 'Expressões regulares em JavaScript',
    subtitulo: 'As seis etapas do laboratório de LFA, refeitas com a RegExp nativa do Node.js',
    topicos: [],
    notas:
      'Somos a equipe 2 e refizemos em JavaScript as seis etapas do laboratório de regex. Tudo que vocês vão ver roda ao vivo neste site, com o mesmo código que entregamos. Quem quiser acompanhar pelo celular, é só ler o QR code.',
    demo: 'Capa',
  },
  {
    id: 'api',
    titulo: 'A API de regex do JavaScript',
    topicos: [
      'Regex é um objeto RegExp: literal /padrão/flags ou new RegExp("padrão", "flags").',
      'O literal é compilado uma vez, quando o módulo carrega — o papel do re.compile.',
      'Flags: g (global), i, m, s, u (Unicode), y (sticky), d (índices) e v.',
    ],
    codigo:
      "/^[A-Za-z_][A-Za-z0-9_]*$/.test('total')   // re.fullmatch\n/[0-9]+/.exec(texto)                         // re.search\n[...texto.matchAll(/[0-9]+/g)]               // re.finditer\ntexto.replace(/\\s+/g, ' ')                   // re.sub\ntexto.split(/\\s*[;,|]\\s*/)                  // re.split",
    notas:
      'Em Python a gente tinha o módulo re com funções. Em JS a regex é um objeto e os métodos ficam espalhados entre RegExp e String. A diferença mais importante: não existe fullmatch, então todo validador nosso usa ^ e $.',
    demo: 'Api',
  },
  {
    id: 'etapa1',
    titulo: 'Etapa 1 — Reconhecimento',
    topicos: [
      'Identificador: [A-Za-z_][A-Za-z0-9_]* com âncoras para a cadeia inteira.',
      'Busca da 1ª ocorrência com exec; todas com match/matchAll e flag g.',
      'Números da frase: 2026, 32 e 6.',
      'Desafio: primeira letra em [A-Z].',
    ],
    codigo: "const RE_ID = /^[A-Za-z_][A-Za-z0-9_]*$/;\nRE_ID.test('_contador');   // true\nRE_ID.test('2valor');      // false\nfrase.match(/[0-9]+/g);    // ['2026', '32', '6']",
    notas:
      'Digitem um identificador aqui. Sem as âncoras, 2valor seria aceito porque contém "valor". Nas palavras com L tivemos o primeiro problema: o \\w do JS não conhece acentos e cortava "laboratórios"; resolvemos com \\p{L} e a flag u.',
    demo: 'Etapa1',
  },
  {
    id: 'etapa2',
    titulo: 'Etapa 2 — Validação de formatos',
    topicos: [
      'Matrícula CC-AAAA-NNN, data DD/MM/AAAA e telefone (DD) DDDDD-DDDD.',
      'Sintaxe: a regex só garante a forma da cadeia.',
      'Semântica: 99/99/9999 tem a forma certa, mas a data não existe — isso é aritmética, fora da regex.',
      'Desafio: código institucional LFA-2026-01.',
    ],
    codigo:
      "const RE_DATA = /^(?<dia>[0-9]{2})\\/(?<mes>[0-9]{2})\\/(?<ano>[0-9]{4})$/;\nvalidarData('99/99/9999');\n// { sintatica: true, semantica: false, motivo: 'mês 99 não existe' }",
    notas:
      'A regex responde "tem cara de data?". Se a data existe é outra pergunta: precisa de dias por mês e ano bissexto. Por isso validarData devolve as duas camadas separadas.',
    demo: 'Etapa2',
  },
  {
    id: 'etapa3',
    titulo: 'Etapa 3 — Extração e grupos nomeados',
    topicos: [
      'E-mails, datas e hashtags extraídos do texto-base.',
      'Grupo posicional (…) → m[1]; nomeado (?<dia>…) → m.groups.dia.',
      'Python usa (?P<dia>…); em JS é (?<dia>…), \\k<dia> e $<dia>.',
      'Horários 00:00–23:59: a faixa fica dentro da regex.',
    ],
    codigo:
      "for (const m of texto.matchAll(RE_DATA_TEXTO)) {\n  const { dia, mes, ano } = m.groups;\n}\n/^(?<hora>[01][0-9]|2[0-3]):(?<minuto>[0-5][0-9])$/",
    notas:
      'Aqui é o texto-base. Os e-mails, as datas e as hashtags aparecem marcados. Reparem que 25:61 tem formato de horário mas a regex de horário já recusa, porque a faixa está codificada nela.',
    demo: 'Etapa3',
  },
  {
    id: 'etapa4',
    titulo: 'Etapa 4 — Substituição e divisão',
    topicos: [
      'Espaços: remove das pontas e colapsa os internos.',
      'CPF fictício: 123.456.789-00 → 123.***.***-00 com $1 e $2.',
      'split com /\\s*[;,|]\\s*/ separa por ; , ou |.',
      'Literal × grupos: até com padrão string, $& é interpretado. Função substituta resolve.',
    ],
    codigo:
      "cpf.replace(/^([0-9]{3})\\.[0-9]{3}\\.[0-9]{3}-([0-9]{2})$/, '$1.***.***-$2');\n'01/09/2026'.replace(RE, '$<ano>-$<mes>-$<dia>');   // '2026-09-01'\n'x'.replaceAll('x', '$&$&');        // 'xx'  ← surpresa!\n'x'.replaceAll('x', () => '$&$&');  // '$&$&'",
    notas:
      'O segundo problema que encontramos: achávamos que replaceAll com string era literal, mas o JS interpreta $& e $1 mesmo assim. A correção foi usar uma função como substituta.',
    demo: 'Etapa4',
  },
  {
    id: 'etapa5',
    titulo: 'Etapa 5 — Parser de logs',
    topicos: [
      'Uma regex com 6 grupos nomeados: data, hora, nível, usuário, IP e ação.',
      'Arquivo-base: 5 linhas válidas e 1 rejeitada.',
      'INFO=3, WARN=1, ERROR=1 · ana=2, bruno=2, carla=1 · 5 ações.',
      'Desafio: IP 300.1.1.1 e 31/02/2026 passam na regex e são barrados na semântica.',
    ],
    codigo:
      "const RE_LOG = /^(?<data>…) (?<hora>…)\n  (?<nivel>INFO|WARN|ERROR) (?<usuario>[a-z][a-z0-9_]*)\n  (?<ip>[0-9]{1,3}(?:\\.[0-9]{1,3}){3}) (?<acao>[a-z_]+)$/;\nconst { nivel, usuario } = RE_LOG.exec(linha).groups;",
    notas:
      'Troquem entre o log base, o ampliado e o semântico. No ampliado entram duas linhas válidas e uma inválida, e as contagens mudam. No semântico, as três linhas casam com a regex, mas são rejeitadas pela validação de faixa.',
    demo: 'Etapa5',
  },
  {
    id: 'etapa6',
    titulo: 'Etapa 6 — Mini analisador léxico',
    topicos: [
      'Uma regex mestre: (?<NUMBER>…)|(?<ID>…)|(?<RELOP>…)|…|(?<MISMATCH>.)',
      'A alternância é ordenada: vence a primeira alternativa, não a mais longa.',
      'Por isso RELOP (==, !=, <=, >=) vem antes de ASSIGN (=).',
      'Flag y (sticky): cada token começa onde o anterior terminou; @ vira erro com posição.',
    ],
    codigo:
      "const re = new RegExp(ESPEC.map(([t, p]) => `(?<${t}>${p})`).join('|'), 'y');\nwhile ((m = re.exec(entrada))) {\n  const [tipo, lexema] = Object.entries(m.groups).find(([, v]) => v);\n}",
    notas:
      'Digitem uma expressão. Cada token ganha uma cor. Se eu colocar == ele vira um RELOP só, porque RELOP está antes de ASSIGN na regex mestre. E um @ gera erro apontando a coluna.',
    demo: 'Etapa6',
  },
  {
    id: 'comparacao',
    titulo: 'JavaScript × Python re: a API',
    topicos: [
      'Em Python, funções do módulo re; em JS, métodos de RegExp e de String.',
      'Reconhecimento completo: re.fullmatch em Python, ^…$ em JS.',
      'O literal /…/ é compilado quando o módulo carrega, como re.compile.',
    ],
    notas:
      'Esta tabela responde a primeira pergunta do relatório: quais funções equivalem a reconhecimento, busca, extração, substituição e split.',
    demo: 'ComparacaoApi',
  },
  {
    id: 'comparacao2',
    titulo: 'JavaScript × Python re: o comportamento',
    topicos: [
      'Grupos nomeados: (?<n>…) em JS, (?P<n>…) em Python.',
      '\\d e \\w: só ASCII em JS; Unicode por padrão no Python 3.',
      'Regex com flag g guarda estado (lastIndex): isso não existe em Python.',
    ],
    notas:
      'Aqui estão as diferenças que mais pegam quem vem do Python. A do lastIndex aparece no próximo slide; a do $ explica por que nossos validadores são estritos sem precisar de \\Z.',
    demo: 'ComparacaoComportamento',
  },
  {
    id: 'problemas',
    titulo: 'Problemas que encontramos',
    topicos: [
      '\\w e \\b não conhecem acentos → \\p{L} com a flag u.',
      '$& e $1 interpretados no replaceAll → função substituta.',
      'test() com flag g alterna true/false → regex sem g ou cópia nova.',
      '= antes de == na regex mestre quebrava ==  → ordem por prioridade.',
    ],
    codigo: "const re = /a/g;\nre.test('a');  // true  (lastIndex vira 1)\nre.test('a');  // false (começa do índice 1!)\nre.test('a');  // true  (lastIndex volta a 0)",
    notas:
      'Cliquem em testar várias vezes: a mesma regex, a mesma string, e o resultado alterna. É o estado lastIndex de uma regex com g. Nas nossas funções públicas nunca reutilizamos regex global com test.',
    demo: 'LastIndex',
  },
  {
    id: 'teoria',
    titulo: 'ER da teoria × regex de biblioteca',
    topicos: [
      'Mesma base: união (|), concatenação, fecho de Kleene (*) e λ (cadeia vazia).',
      'Bibliotecas vão além: retro-referência \\k<p> reconhece "ww" — linguagem que não é regular.',
      'Lookahead/lookbehind e âncoras não existem na notação formal, mas sem retro-referência a linguagem continua regular.',
      'O motor do JS faz backtracking em vez de simular um AFD.',
    ],
    codigo: "/^(?<p>[ab]+)\\k<p>$/.test('abab')   // true: L = { ww } não é regular\n/^(a|b)*abb$/                       // ER clássica: AFD equivalente",
    notas:
      'Uma ER da teoria sempre tem um AFD equivalente. A regex do JS não: com retro-referência ela reconhece ww, que pelo lema do bombeamento não é regular. O preço é o motor de backtracking, que pode explodir, como no próximo slide.',
    demo: 'Teoria',
  },
  {
    id: 'redos',
    titulo: 'Quando o backtracking explode: ReDoS',
    topicos: [
      '(a+)+$ contra "aaaa…a!": o motor tenta todas as formas de dividir os a.',
      'Tempo dobra a cada caractere: crescimento exponencial.',
      'O RE2 do Go evita isso, mas abre mão da retro-referência.',
      'Nos jogos, a regex de vocês roda num worker com timeout.',
    ],
    notas:
      'Vou rodar ao vivo: cada barra é o tempo para mais dois caracteres. Por isso os jogos executam a regex de vocês isolada num worker com limite de 200 milissegundos.',
    demo: 'ReDoS',
  },
  {
    id: 'arena',
    titulo: 'Sua vez: Regex Arena',
    topicos: [
      'Leia o QR code, digite o PIN e escolha um apelido.',
      'Escreva uma regex que case as palavras verdes e nenhuma vermelha.',
      'Pontos por acertar, por rapidez e por regex curta.',
      'Há casos ocultos, revelados no fim: decorar as palavras não basta, é preciso descrever a linguagem.',
    ],
    notas: 'Agora é com vocês. Abro o telão da Arena e jogamos uma ou duas rodadas.',
    demo: 'Arena',
  },
  {
    id: 'fim',
    titulo: 'Obrigado!',
    subtitulo: 'Perguntas?',
    topicos: [
      'Código, testes, relatório e este site: github.com/ThiagoCCarmona/regex-js',
      'Rodar a entrega: cd equipe_02_javascript && npm test && npm run demo',
      'Regex Invaders: o modo solo para treinar depois da aula.',
    ],
    notas: 'Ficamos à disposição para perguntas.',
    demo: 'Fim',
  },
];
