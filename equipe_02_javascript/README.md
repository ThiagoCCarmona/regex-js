# Equipe 2 — Expressões Regulares em JavaScript / Node.js

Trabalho prático **Regex Multilinguagem** · Linguagens Formais e Autômatos · Prof. Luciano Cardoso · 2º semestre de 2026

| | |
|---|---|
| **Linguagem** | JavaScript (ECMAScript 2024), módulos ES |
| **Ambiente** | Node.js **≥ 20** (desenvolvido e testado no **Node.js 24.21**) |
| **API de regex** | `RegExp` nativa; `test`, `exec`, `String.prototype.match`, `matchAll`, `replace`, `replaceAll`, `split` |
| **Dependências** | **Nenhuma.** Somente `RegExp` e módulos internos `node:` (`node:fs`, `node:test`, `node:assert`, `node:util`) |
| **Integrantes** | Thiago Corobinski Carmona · _(demais integrantes)_ |
| **Site da apresentação** | https://regex-js.tccodes.com.br |
| **Repositório** | https://github.com/ThiagoCCarmona/regex-js |

## Como executar

Não há nada para instalar: basta ter o Node.js.

```bash
cd equipe_02_javascript

# Demonstração de todas as etapas: obtido × esperado (✔/✘)
npm run demo            # ou: node src/demo.js

# Só uma etapa (1 a 6)
node src/demo.js 5

# Testes automatizados (node:test)
npm test                # ou: node --test "testes/*.test.js"
```

Saída esperada do demo: `47/47 verificações ok`. Saída esperada dos testes: `pass 49`, `fail 0`.

## Estrutura

```
equipe_02_javascript/
  README.md               este arquivo
  package.json            scripts demo/test (sem dependências)
  src/
    etapa1-reconhecimento.js
    etapa2-validacao.js
    etapa3-extracao.js
    etapa4-transformacao.js
    etapa5-logs.js
    etapa6-lexico.js
    index.js              reexporta as etapas (funciona também no navegador)
    node.js               leitura de arquivos de dados/ (somente Node)
    demo.js               demonstração obtido × esperado
  testes/
    etapa1.test.js … etapa6.test.js
  dados/
    texto_base.txt        texto da Etapa 3
    logs.txt              log-base da Etapa 5 (6 linhas)
    logs_ampliado.txt     desafio: +2 linhas válidas e +1 inválida
    logs_semantica.txt    desafio: IP fora de faixa, data e hora impossíveis
  relatorio.pdf           relatório técnico
  apresentacao.pptx       slides (backup offline do site)
  uso_ia.md               declaração de uso de IA generativa
```

## Mapa das etapas

| Etapa | Arquivo | Funções principais | Regex central |
|---|---|---|---|
| 1 — Reconhecimento | `etapa1-reconhecimento.js` | `ehIdentificador`, `primeiraOcorrencia`, `todasOcorrencias`, `extrairNumeros`, `palavrasComL`, `ehIdentificadorMaiusculo` | `/^[A-Za-z_][A-Za-z0-9_]*$/` |
| 2 — Validação | `etapa2-validacao.js` | `validarMatricula`, `validarData` (sintática × semântica), `validarTelefone`, `validarCodigoLfa`, `dataExiste` | `/^CC-[0-9]{4}-[0-9]{3}$/` |
| 3 — Extração | `etapa3-extracao.js` | `extrairEmails`, `extrairDatas`, `extrairHashtags`, `validarHorario`, `extrairHorarios`, `decomporDataPosicional`, `decomporDataNomeada` | `/(?<dia>[0-9]{2})\/(?<mes>…)\/(?<ano>…)/g` |
| 4 — Transformação | `etapa4-transformacao.js` | `normalizarEspacos`, `mascararCpf`, `separar`, `substituirLiteral`, `reformatarDataComGrupos` | `/\s*[;,\|]\s*/` |
| 5 — Logs | `etapa5-logs.js` | `analisarLinha`, `validarSemantica`, `analisarLogs` | `RE_LOG` com 6 grupos nomeados |
| 6 — Léxico | `etapa6-lexico.js` | `tokenizar`, `tokenizarOuFalhar`, `ErroLexico`, `ESPEC_TOKENS` | regex mestre com flag `y` (sticky) |

### Decisões que valem para todas as etapas

- **Cadeia inteira:** todo validador usa `^…$`. Sem as âncoras, `xCC-2026-001` seria aceito porque *contém* um trecho válido.
- **ASCII explícito:** usamos `[0-9]` e `[A-Za-z0-9_]` em vez de `\d` e `\w`, como pede o enunciado. Mesmo que em JS eles sejam ASCII, o comportamento varia entre motores (em Python 3, `\d` casa dígitos Unicode).
- **Regex compiladas uma vez:** as regex são literais no topo de cada módulo, compiladas quando o módulo carrega. É o equivalente ao `re.compile` do Python.
- **Funções puras:** cada função recebe texto e devolve dados. Quem imprime é o `demo.js`, então as mesmas funções servem para os testes e para o site da apresentação.

## Testes

São 49 testes em `testes/`, com casos positivos, negativos e de borda, incluindo:

- cadeia vazia (λ);
- espaços nas pontas;
- reuso de regex (`lastIndex`);
- anos bissextos;
- arquivos de log com quebras de linha do Windows (`\r\n`);
- prioridade de operadores (`==` × `=`);
- `!` isolado.

O `demo.js` mostra, lado a lado, a saída **obtida** e a **esperada** de cada caso do enunciado.

## Sobre os dados de entrada

O enunciado cita `dados/logs.txt` e o "texto-base" do laboratório Python, mas esses arquivos não estavam disponíveis para a equipe. Por isso eles foram **reconstruídos** para reproduzir exatamente os resultados esperados do enunciado:

- `logs.txt`: 6 linhas, 5 válidas e 1 inválida; INFO=3, WARN=1, ERROR=1; ana=2, bruno=2, carla=1; 5 ações distintas com contagem 1.
- `texto_base.txt`: contém os 2 e-mails, as 2 datas e as 3 hashtags citados.

Formato de linha de log adotado: `DD/MM/AAAA HH:MM:SS NIVEL usuario IP acao`.

## Uso de IA

Veja [`uso_ia.md`](uso_ia.md).
