# Declaração de uso de IA generativa

**Trabalho:** Regex Multilinguagem, Equipe 2 (JavaScript / Node.js)
**Disciplina:** Linguagens Formais e Autômatos, Prof. Luciano Cardoso, 2º semestre de 2026
**Autor responsável:** Thiago Corobinski Carmona

O enunciado permite IA generativa como apoio, desde que o uso seja declarado e o autor demonstre compreensão do código. Esta declaração registra **o que a IA fez** e **o que o autor revisou e testou**.

## 1. Ferramenta utilizada

| Ferramenta | Modelo | Forma de uso |
|---|---|---|
| Claude Code (Anthropic), aplicativo desktop | Claude Opus 5.5 | Agente de programação com acesso à pasta do projeto: leu o enunciado em PDF, propôs o design, escreveu código, testes e textos e executou os testes localmente |

Nenhuma outra ferramenta de IA foi usada.

## 2. O que foi produzido com apoio da IA

O Claude **elaborou** as partes abaixo, seguindo um design discutido e aprovado pelo autor antes da implementação. A especificação e o plano estão em `docs/superpowers/` no repositório.

- **Código das seis etapas** (`src/etapa1` a `etapa6`, `index.js`, `node.js` e `demo.js`): as regex, as funções e os comentários explicativos.
- **Testes automatizados** (`testes/`): 50 casos positivos, negativos e de borda, escritos **antes** de cada implementação (TDD), de modo que cada teste foi visto falhando e depois passando.
- **Dados de entrada** (`dados/`): como o `logs.txt` e o texto-base originais do laboratório Python não estavam disponíveis, a IA os **reconstruiu** para reproduzir exatamente os resultados esperados do enunciado. Isso está declarado no README e no relatório.
- **Relatório técnico** (`relatorio.pdf`): redação das respostas às perguntas orientadoras e da seção de problemas encontrados. Cada afirmação técnica sobre o comportamento do JavaScript e do Python foi conferida executando o código correspondente.
- **Apresentação** (`apresentacao.pptx`) e o **site da apresentação** (slides, demonstrações ao vivo e os jogos Regex Invaders e Regex Arena, no repositório `github.com/ThiagoCCarmona/regex-js`).
- **README.md** e esta declaração (rascunho).

## 3. Revisão e testes pelo autor

> Marque cada item **depois de fazê-lo**. Esta seção é a declaração do autor de que o trabalho não foi apenas gerado, mas **lido, entendido, executado e conferido**.

Eu, **Thiago Corobinski Carmona**, declaro que:

- [ ] li o código de cada uma das seis etapas e sei explicar cada regex: o que cada parte casa, por que usa `^…$` e por que usa `[0-9]` em vez de `\d`;
- [ ] executei `npm test` (50 testes passando) e `npm run demo` (47/47 verificações) no meu computador;
- [ ] conferi a saída do demo com os resultados esperados do enunciado, etapa por etapa;
- [ ] sei explicar os quatro problemas descritos no relatório (Unicode em `\w`/`\b`, `$&` na substituição, `lastIndex` com a flag `g` e prioridade `==` × `=` no léxico) e demonstrá-los ao vivo;
- [ ] li o relatório inteiro e concordo com o conteúdo, e as respostas às perguntas orientadoras refletem o meu entendimento;
- [ ] revisei os dados reconstruídos em `dados/` e entendo por que produzem as contagens pedidas;
- [ ] testei o site da apresentação (slides, demos e os dois jogos) antes da aula;
- [ ] estou ciente de que respondo pelo conteúdo entregue na defesa oral.

**Data da revisão:** ____/____/2026

**Assinatura:** ______________________________

## 4. Resumo

A IA foi usada como **ferramenta de produção**: escreveu e testou o código e redigiu os textos. O **autor** definiu os objetivos, aprovou o design, revisou o resultado, executou os testes e responde por todo o conteúdo.
