# Regex em JavaScript — Equipe 2 · Especificação de design

- **Data:** 2026-11-09
- **Disciplina:** Linguagens Formais e Autômatos — Prof. Luciano Cardoso
- **Equipe 2:** JavaScript / Node.js — Thiago Corobinski Carmona (demais integrantes a completar)
- **Origem:** `Trabalho_Pratico_Regex_Multilinguagem_Prof_Luciano_Cardoso.pdf`
- **Repositório:** `github.com/ThiagoCCarmona/regex-js` (público)
- **Domínio de apresentação:** `https://regex-js.tccodes.com.br`

## 1. Objetivo

Reproduzir em JavaScript (Node.js 24) as seis etapas do laboratório de ER feito em Python, com resultados
idênticos aos "casos comuns" e às "ampliações obrigatórias" do enunciado, e entregar a pasta
`equipe_02_javascript/` no formato exigido. Além disso, um site de apresentação (slides + demos ao vivo +
dois jogos), em Docker, para a defesa oral de 10 minutos.

### Critérios de sucesso

1. `node --test` na pasta de entrega passa com todos os casos da matriz mínima (seção 5 do PDF) e casos de borda.
2. `npm run demo` imprime, para cada etapa, *obtido × esperado* com ✔/✘ — tudo ✔.
3. Pasta de entrega contém exatamente: `README.md`, `src/`, `testes/`, `dados/`, `relatorio.pdf` (3–5 páginas),
   `apresentacao.pptx`, `uso_ia.md`.
4. Código de entrega sem dependências externas (apenas `RegExp` nativa e módulos `node:`).
5. `docker compose up` sobe o site em `:3000`, com slides, demos, Invaders e Arena funcionando.
6. Arena suporta ~40 celulares simultâneos numa sala; regex maliciosa (ReDoS) não trava o servidor.

## 2. Estrutura do repositório

```
regex-js/
  equipe_02_javascript/        ENTREGA (zipada para o professor)
    package.json               "type":"module", scripts demo/test, zero dependências
    README.md
    src/
      etapa1-reconhecimento.js
      etapa2-validacao.js
      etapa3-extracao.js
      etapa4-transformacao.js
      etapa5-logs.js
      etapa6-lexico.js
      index.js                 reexporta tudo (usado pelo site)
      demo.js                  imprime obtido × esperado por etapa
    testes/
      etapa1.test.js … etapa6.test.js   (node:test + node:assert/strict)
    dados/
      texto_base.txt
      logs.txt                 6 linhas (5 válidas, 1 inválida)
      logs_ampliado.txt        9 linhas (7 válidas, 2 inválidas)
      logs_semantica.txt       linhas sintaticamente válidas mas semanticamente inválidas
    relatorio.pdf              gerado de docs/relatorio/relatorio.html
    apresentacao.pptx          gerado por scripts/gerar-pptx.mjs
    uso_ia.md
  apps/web/                    Vite + React + TypeScript (SPA)
  apps/server/                 Node 24 + Fastify + @fastify/websocket (TypeScript, type stripping nativo)
  scripts/                     gerar-pptx.mjs, gerar-relatorio.mjs, empacotar-entrega.mjs
  docs/relatorio/relatorio.html
  Dockerfile, docker-compose.yml, .dockerignore
  pnpm-workspace.yaml, package.json, README.md (documentação do projeto todo)
```

`equipe_02_javascript` é um pacote do workspace (`@regex-js/etapas`); o site e o servidor o importam,
garantindo que a demo ao vivo executa o mesmo código avaliado.

## 3. Módulos da entrega (JS puro, ESM)

Regras transversais: validação de campo sempre com `^…$`; classes ASCII explícitas (`[0-9]`, `[A-Za-z0-9_]`),
nunca `\d`/`\w`; regex declaradas como literais no topo do módulo (compiladas uma vez — equivalente ao
`re.compile`). Todas as funções são puras e retornam dados (o `demo.js` cuida de imprimir).

### Etapa 1 — Reconhecimento
- `RE_ID = /^[A-Za-z_][A-Za-z0-9_]*$/` → `ehIdentificador(s)` (reconhecimento integral, `test`).
- `primeiraOcorrencia(texto)` → `exec` sem flag g (equivalente a `re.search`).
- `todasOcorrencias(texto)` → `matchAll` com `/g` (equivalente a `re.findall`/`finditer`).
- `extrairNumeros(frase)` → `['2026','32','6']` para a frase do enunciado.
- `palavrasComL(frase)` → usa `/(?<![\p{L}\p{N}_])[Ll][\p{L}\p{N}_]*/gu`; na frase → `['LFA','laboratórios']`.
  (Problema documentado: `\b[Ll]\w*` corta "laboratórios" em "laborat" porque `\w`/`\b` em JS são ASCII.)
- Desafio: `RE_ID_MAIUSCULA = /^[A-Z][A-Za-z0-9_]*$/` → Total ✔, TOTAL_2 ✔, total ✘, _Total ✘.
- Casos: total ✔, _contador ✔, 2valor ✘, nome_completo ✔, x-y ✘.

### Etapa 2 — Validação
- Matrícula `^CC-[0-9]{4}-[0-9]{3}$`: CC-2026-001 ✔, SI-2026-001 ✘, CC-26-001 ✘.
- Data `^(?<dia>[0-9]{2})\/(?<mes>[0-9]{2})\/(?<ano>[0-9]{4})$` + `dataExiste()` (mês 1–12, dias por mês,
  bissexto): 01/09/2026 sintática ✔ semântica ✔; 1/9/2026 sintática ✘; 99/99/9999 sintática ✔ semântica ✘.
- Telefone `^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$`: "(45) 99999-1234" ✔, "45 99999-1234" ✘.
- Desafio: código `^LFA-[0-9]{4}-[0-9]{2}$` (LFA-2026-01 ✔); `validarData` devolve
  `{ sintatica, semantica, motivo }` para explicar a diferença.

### Etapa 3 — Extração e grupos nomeados
- `texto_base.txt` reconstruído contendo: ana.silva@udc.edu.br, joao123@gmail.com, 01/09/2026, 03/09/2026,
  #LFA, #Python, #Regex (e pontuação ao redor, para testar fronteiras).
- E-mail `/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g`; hashtag `/#[A-Za-z0-9_]+/g`;
  data com grupos nomeados → `[{dia:'01',mes:'09',ano:'2026'}, …]`.
- Horário `^(?<hora>[01][0-9]|2[0-3]):(?<minuto>[0-5][0-9])$`: 08:30 ✔, 23:59 ✔, 25:61 ✘; e extração de
  horários em texto livre com validação.
- Desafio: mesma data decomposta por `m[1]` (posicional) e `m.groups.dia` (nomeado); sintaxe JS
  `(?<nome>…)`, referência `\k<nome>`, substituição `$<nome>`; comparação com Python `(?P<nome>…)`.

### Etapa 4 — Substituição e divisão
- `normalizarEspacos(s)` → `s.replace(/^\s+|\s+$/g,'').replace(/\s{2,}/g,' ')` →
  "LFA com Python é prática!".
- `mascararCpf('123.456.789-00')` → `'123.***.***-00'` via `/^([0-9]{3})\.[0-9]{3}\.[0-9]{3}-([0-9]{2})$/`
  e `'$1.***.***-$2'` (sem validação de dígitos, conforme enunciado).
- `separar('LFA;Python,Regex | Automatos')` → `split(/\s*[;,|]\s*/)` → `['LFA','Python','Regex','Automatos']`.
- Desafio: substituição literal (`replaceAll('.', '-')` com string) × com grupos (`$1`, `$<nome>`, função
  substituta). Problema documentado: mesmo com padrão string, `$&`/`$1` na string de substituição são
  interpretados — solução: função substituta.

### Etapa 5 — Parser de logs
Formato de linha: `DD/MM/AAAA HH:MM:SS NIVEL usuario IP acao`

```
RE_LOG = /^(?<data>[0-9]{2}\/[0-9]{2}\/[0-9]{4}) (?<hora>[0-9]{2}:[0-9]{2}:[0-9]{2}) (?<nivel>INFO|WARN|ERROR) (?<usuario>[a-z][a-z0-9_]*) (?<ip>[0-9]{1,3}(?:\.[0-9]{1,3}){3}) (?<acao>[a-z_]+)$/
```

`logs.txt` (reconstruído para bater com o PDF):
```
01/09/2026 08:15:02 INFO ana 192.168.0.10 login
01/09/2026 08:17:45 INFO bruno 192.168.0.11 upload_arquivo
01/09/2026 09:02:10 WARN ana 192.168.0.10 senha_expirando
01/09/2026 09:30:00 ERROR carla 10.0.0.5 falha_conexao
01/09/2026 10:00:00 INFO bruno 192.168.0.11 logout
linha corrompida sem o formato esperado
```
→ 5 válidas, 1 rejeitada (nº da linha + motivo); INFO=3, WARN=1, ERROR=1; ana=2, bruno=2, carla=1;
5 ações com contagem 1.

`logs_ampliado.txt` = base + `02/09/2026 11:11:11 INFO carla 192.168.0.12 login`,
`02/09/2026 12:00:00 WARN ana 192.168.0.10 download`, `03/09/2026 13:00 DEBUG dave 192.168.0.1 teste` (inválida)
→ 7 válidas, 2 inválidas; INFO=4, WARN=2, ERROR=1; ana=3, bruno=2, carla=2; login=2, demais=1 (6 ações).

`logs_semantica.txt`: linhas com IP `300.1.1.1`, data `31/02/2026` e hora `25:00:00` — casam o regex (sintaxe)
mas são rejeitadas por `validarSemantica` (octetos 0–255, `dataExiste`, hora 00–23/min/seg 00–59), com motivo.
`analisarLogs(texto, { semantica: true })` retorna `{ validas, rejeitadas, porNivel, porUsuario, porAcao }`.

### Etapa 6 — Mini analisador léxico
Especificação ordenada (a ordem é a prioridade):

| Token | Padrão |
|---|---|
| NUMBER | `[0-9]+(?:\.[0-9]+)?` |
| ID | `[A-Za-z_][A-Za-z0-9_]*` |
| RELOP | `==\|!=\|<=\|>=\|<\|>` |
| ASSIGN | `=` |
| OP | `[+\-*/]` |
| LPAREN / RPAREN | `\(` / `\)` |
| COMMA / SEMICOLON | `,` / `;` |
| SKIP | `[ \t]+` (descartado) |
| MISMATCH | `.` (erro) |

Implementação: uma regex mestre `(?<NUMBER>…)|(?<ID>…)|…` com flag **`y` (sticky)** e laço por `lastIndex`
— recurso específico de JS (Python usa `re.finditer` sobre a regex mestre). `tokenizar(s)` retorna
`{ tokens:[{tipo,lexema,pos}], erros:[{simbolo,pos,coluna}] }`; `tokenizarOuFalhar` lança erro com posição.
- 'total = preco * 2 + desconto_1 - 3.5' → ID ASSIGN ID OP NUMBER OP ID OP NUMBER.
- 'resultado = (a + b) >= 10; x != 0, y == 2' → ID ASSIGN LPAREN ID OP ID RPAREN RELOP NUMBER SEMICOLON
  ID RELOP NUMBER COMMA ID RELOP NUMBER.
- 'a = b @ 2' → erro `@` na posição 6 (coluna 7).
- Prioridade: `==` antes de `=` porque a alternância é ordenada (leftmost-first), não "maior casamento".

## 4. Testes

`node:test` + `assert/strict`, um arquivo por etapa, cobrindo todos os casos do PDF, ampliações e bordas
(cadeia vazia — λ —, espaços nas pontas, `lastIndex` com `/g` em `test()` repetido, Unicode). Saída
*obtido × esperado* no `demo.js`. Servidor: testes `node:test` da pontuação e do avaliador seguro de regex.

## 5. Site (`apps/web`)

Vite + React 18 + TypeScript + react-router. Rotas:

- `/` — **Slides** (setas/espaço/F para tela cheia, nº do slide na URL `#/slide/n`). ~14 slides:
  capa + QR · equipe e agenda · API RegExp de JS (test/exec/match/matchAll/replace/replaceAll/split, flags
  `g i m s u y d v`) · Etapas 1–6 (um slide cada, com **demo interativa** que chama `@regex-js/etapas`) ·
  JS × Python `re` · problemas encontrados · ER da teoria × ER de biblioteca (λ, backreference, lookaround
  não são regulares; backtracking) · ReDoS · convite para a Arena (QR) · encerramento + QR.
- `/playground` — regex + flags + texto, com destaque das correspondências e tabela de grupos.
- `/invaders` — jogo solo.
- `/arena` — jogador (celular); `/arena/telao` — tela do apresentador.

QR code gerado no cliente (pacote `qrcode`) para `https://regex-js.tccodes.com.br` (e `/arena?pin=XXXX`
na Arena). URL base configurável por `VITE_PUBLIC_URL`.

### Regex Invaders (solo)
Canvas/DOM animado; palavras caem; o jogador digita uma regex e Enter "dispara": todas as palavras na tela
que casam são destruídas. Inimigas (vermelhas, devem ser atingidas) = +pontos; aliadas (verdes) atingidas =
−1 vida; inimiga que toca o chão = −1 vida. 6 fases temáticas (identificadores, matrículas, e-mails, horários,
CPF, operadores), velocidade crescente. Regex avaliada num Web Worker com timeout para não travar a aba.

### Regex Arena (multiplayer)
- Estado em memória no servidor; sala com PIN de 4 dígitos criada pelo telão.
- Protocolo WebSocket JSON (`/ws`): `host:criar`, `host:iniciar-rodada`, `host:proxima`, `jogador:entrar`,
  `jogador:enviar {padrao, flags}`; servidor emite `sala:estado`, `rodada:inicio`, `rodada:fim`,
  `ranking`, `resultado`.
- Rodada: 60 s; desafio com `deveCasar[]` e `naoDeveCasar[]` (banco de ~10 desafios ligados às etapas).
  Celular mostra pré-visualização local (verde/vermelho) enquanto digita; pode reenviar até acertar.
- Pontuação no primeiro acerto: `500 + round(500 × tempoRestante/duração) + max(0, 300 − 10 × tamanho)`.
- Segurança: padrão ≤ 100 caracteres, flags permitidas `i`/`u`; avaliação em `worker_threads` com
  timeout de 200 ms (worker encerrado e recriado se estourar); limite de 1 envio/segundo por jogador;
  apelido ≤ 16 caracteres, escapado na renderização (React).

## 6. Servidor e Docker

- `apps/server`: Fastify serve `apps/web/dist` (fallback SPA para `index.html`), `GET /health`, e `/ws`.
  TypeScript executado pelo type stripping nativo do Node 24 (somente sintaxe apagável); `tsc --noEmit`
  para checagem.
- `Dockerfile` multi-stage `node:24-alpine` (instala com pnpm, builda o web, imagem final só com produção),
  usuário não-root, `EXPOSE 3000`, `HEALTHCHECK` em `/health`.
- `docker-compose.yml` com `PORT=3000`, `restart: unless-stopped`.
- README do repositório: como rodar local, testes, Docker, e exemplo de proxy reverso (nginx e Caddy) para
  `regex-js.tccodes.com.br` incluindo `Upgrade`/`Connection` para WebSocket. Deploy no servidor fica com o
  autor.

## 7. Documentos da entrega

- **relatorio.pdf (3–5 pág.)**: introdução; respostas às 7 perguntas orientadoras; tabela de equivalência
  Python `re` × JS; limitações do motor (sem `\A`/`\Z`, `\w`/`\b` ASCII, estado de `lastIndex`, sem
  possessivos/atômicos, backtracking/ReDoS); ≥ 2 problemas reais e soluções (Unicode em palavras com L,
  `$` na string de substituição, `lastIndex` com `/g`, prioridade no lexer); reconstrução dos dados.
  Gerado de HTML pelo Chrome headless.
- **apresentacao.pptx**: mesmo roteiro dos slides do site (backup offline), gerado com `pptxgenjs`.
- **uso_ia.md**: ferramenta (Claude, via Claude Code — Anthropic), o que foi gerado, e seção
  "Revisão e testes pelo autor" em nome de Thiago Corobinski Carmona, com data e assinatura a confirmar.
- **README.md** da entrega: linguagem/versão (Node.js ≥ 20, testado em 24), como executar cada etapa, estrutura,
  testes, dependências (nenhuma).
- `scripts/empacotar-entrega.mjs` gera `../entrega/equipe_02_javascript.zip` (fora do repositório).

## 8. Fora do escopo

Deploy no servidor de produção; persistência da Arena (salas somem ao reiniciar); autenticação; i18n.
