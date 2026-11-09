# Regex em JavaScript — Equipe 2 (LFA)

Trabalho prático **Regex Multilinguagem** da disciplina Linguagens Formais e Autômatos (Prof. Luciano Cardoso, 2º semestre de 2026). A equipe 2 refez em **JavaScript / Node.js** as seis etapas do laboratório de expressões regulares que tinha sido feito em Python. Este repositório também tem o **site usado na apresentação oral**, com slides, demonstrações ao vivo e dois jogos.

- **Site:** https://regex-js.tccodes.com.br
- **Entrega para o professor:** [`equipe_02_javascript/`](equipe_02_javascript/), com README próprio, código, testes, dados, relatório, slides e declaração de uso de IA.

## O que tem aqui

| Parte | Pasta | Tecnologia |
|---|---|---|
| As 6 etapas do laboratório (o que é avaliado) | `equipe_02_javascript/` | JavaScript puro (ESM), **zero dependências**, `node:test` |
| Site da apresentação | `apps/web/` | Vite 8, React 18, TypeScript, react-router |
| Servidor | `apps/server/` | Node.js 24 (TypeScript nativo), Fastify 5, WebSocket |
| Imagem de produção | `Dockerfile`, `docker-compose.yml` | `node:24-alpine`, usuário não-root, healthcheck |

### O site

- **Slides** (`/`): 14 slides para cerca de 10 minutos de apresentação. Cada etapa tem uma demonstração interativa que chama **as mesmas funções da entrega**. Atalhos: <kbd>←</kbd> <kbd>→</kbd> navegam, <kbd>F</kbd> põe em tela cheia, <kbd>N</kbd> mostra as notas de quem apresenta, <kbd>Esc</kbd> abre o menu.
- **Playground** (`/playground`): regex livre, com casamentos marcados e tabela de grupos posicionais e nomeados.
- **Regex Invaders** (`/invaders`): jogo solo. Palavras caem; uma regex derruba as inimigas (vermelhas) sem atingir as aliadas (verdes). São 6 fases, uma por tema do laboratório.
- **Regex Arena** (`/arena` no celular, `/arena/telao` no projetor): multiplayer ao vivo, no estilo quiz.
  - A turma entra pelo QR code com o PIN da sala.
  - A cada rodada aparecem palavras que devem e que não podem casar.
  - Os pontos somam acerto, rapidez e regex curta, com ranking no telão.

### Segurança contra ReDoS

O motor de regex do JavaScript usa backtracking, então uma regex como `(a+)+$` pode levar tempo exponencial. Toda regex digitada por usuário roda **isolada, com limite de tempo**:

- **No navegador:** num Web Worker, com timeout de 150 a 300 ms.
- **No servidor da Arena:** num `worker_thread`, com timeout de 200 ms.
- **Limites extras na Arena:** padrões de até 100 caracteres, só as flags `i` e `u` e no máximo 1 envio por segundo por jogador.

## Arquitetura

```
                    navegador (projetor / celulares)
                 ┌───────────────────────────────────┐
                 │  apps/web  (React + TypeScript)   │
                 │  slides · playground · jogos      │
                 │      │ importa                    │
                 │      ▼                            │
                 │  @regex-js/etapas  ◄──────────────┼── equipe_02_javascript/src
                 │  (mesmo código da entrega)        │    (JS puro, testado com node:test)
                 └──────┬──────────────────▲─────────┘
                  HTTP  │                  │ WebSocket /ws (Arena)
                 ┌──────▼──────────────────┴─────────┐
                 │  apps/server (Fastify, Node 24)   │
                 │  arquivos do site · /health       │
                 │  salas · pontuação · avaliador    │──► worker_thread (regex com timeout)
                 └───────────────────────────────────┘
```

## Rodar localmente

Requisitos: Node.js ≥ 22.18 (testado no 24) e pnpm 9 (`corepack enable`).

```bash
pnpm install
pnpm test          # testes da entrega, do servidor e do motor do jogo
pnpm demo          # etapas 1–6: obtido × esperado
```

Desenvolvimento (dois terminais):

```bash
pnpm --filter server dev     # servidor em http://localhost:3000
pnpm --filter web dev        # site em http://localhost:5173 (repassa /ws ao servidor)
```

Se a porta 3000 estiver ocupada: `PORT=3001 pnpm --filter server dev` e `API_URL=http://localhost:3001 pnpm --filter web dev`.

Para rodar só a entrega, que não tem dependências:

```bash
cd equipe_02_javascript && npm test && npm run demo
```

## Docker

```bash
docker compose up -d --build          # http://localhost:3000
HOST_PORT=8080 docker compose up -d   # outra porta no host
```

O build da imagem **roda todos os testes** e só gera a imagem se eles passarem. A URL usada nos QR codes pode ser trocada com o build arg `VITE_PUBLIC_URL`.

Para publicar em `regex-js.tccodes.com.br` atrás de um proxy reverso (nginx ou Caddy, com o upgrade de WebSocket da Arena), veja [`docs/deploy.md`](docs/deploy.md).

## Estrutura

```
equipe_02_javascript/   entrega: src/ (6 etapas), testes/, dados/, README, relatório, slides, uso_ia.md
apps/web/               site (src/pages, src/slides, src/jogos, src/lib)
apps/server/            servidor (src/app.ts, arena-ws.ts, salas.ts, avaliador.ts) e testes
docs/                   relatório (fonte HTML), deploy, especificação e plano
scripts/                geração do relatório PDF, do pptx e do zip da entrega
```

## Gerar os documentos da entrega

```bash
pnpm relatorio   # docs/relatorio/relatorio.html → equipe_02_javascript/relatorio.pdf (Chrome/Edge headless)
pnpm pptx        # slides do site → equipe_02_javascript/apresentacao.pptx
pnpm entrega     # ../entrega/equipe_02_javascript.zip
```

## Uso de IA generativa

O código, os testes e os textos foram produzidos com apoio do **Claude (Anthropic), via Claude Code**, e revisados e testados pelo autor. A declaração completa, com o que foi gerado e o que foi revisado, está em [`equipe_02_javascript/uso_ia.md`](equipe_02_javascript/uso_ia.md).

## Licença

[MIT](LICENSE) © 2026 Thiago Corobinski Carmona
