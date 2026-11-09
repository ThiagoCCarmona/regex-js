#!/usr/bin/env node
/**
 * Demonstração das seis etapas: imprime "obtido × esperado" para cada caso
 * do enunciado. Uso:
 *   node src/demo.js        → todas as etapas
 *   node src/demo.js 5      → só a etapa 5
 * Sai com código 1 se alguma verificação falhar.
 */
import { isDeepStrictEqual } from 'node:util';
import * as E from './index.js';
import { carregarTextoBase, carregarLog } from './node.js';

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const NEGRITO = '\x1b[1m';
const RESET = '\x1b[0m';
const mostrar = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v));
let ok = 0;
let total = 0;

function verificar(descricao, obtido, esperado) {
  total++;
  const passou = isDeepStrictEqual(obtido, esperado);
  if (passou) ok++;
  const marca = passou ? `${VERDE}✔${RESET}` : `${VERMELHO}✘${RESET}`;
  console.log(`  ${marca} ${descricao}\n      obtido:   ${mostrar(obtido)}\n      esperado: ${mostrar(esperado)}`);
}

const titulo = (t) => console.log(`\n${NEGRITO}${t}${RESET}`);

const ETAPAS = {
  1() {
    titulo('Etapa 1 — Fundamentos e reconhecimento   /^[A-Za-z_][A-Za-z0-9_]*$/');
    for (const [s, esp] of [['total', true], ['_contador', true], ['2valor', false], ['nome_completo', true], ['x-y', false]]) {
      verificar(`ehIdentificador(${mostrar(s)})`, E.ehIdentificador(s), esp);
    }
    verificar('extrairNumeros(frase)', E.extrairNumeros(E.FRASE_ETAPA1), ['2026', '32', '6']);
    verificar('palavrasComL(frase)', E.palavrasComL(E.FRASE_ETAPA1), ['LFA', 'laboratórios']);
    verificar("primeiraOcorrencia('  2x soma')", E.primeiraOcorrencia('  2x soma'), { valor: 'x', indice: 3 });
    console.log('  Desafio — primeira letra [A-Z]:');
    for (const [s, esp] of [['Total', true], ['TOTAL_2', true], ['total', false], ['_Total', false]]) {
      verificar(`ehIdentificadorMaiusculo(${mostrar(s)})`, E.ehIdentificadorMaiusculo(s), esp);
    }
  },

  2() {
    titulo('Etapa 2 — Validação de formatos');
    for (const [s, esp] of [['CC-2026-001', true], ['SI-2026-001', false], ['CC-26-001', false]]) {
      verificar(`validarMatricula(${mostrar(s)})`, E.validarMatricula(s), esp);
    }
    for (const [s, sin, sem] of [['01/09/2026', true, true], ['1/9/2026', false, false], ['99/99/9999', true, false]]) {
      const r = E.validarData(s);
      verificar(`validarData(${mostrar(s)}) — [sintática, semântica] (${r.motivo})`, [r.sintatica, r.semantica], [sin, sem]);
    }
    for (const [s, esp] of [['(45) 99999-1234', true], ['45 99999-1234', false]]) {
      verificar(`validarTelefone(${mostrar(s)})`, E.validarTelefone(s), esp);
    }
    verificar("Desafio: validarCodigoLfa('LFA-2026-01')", E.validarCodigoLfa('LFA-2026-01'), true);
  },

  3() {
    titulo('Etapa 3 — Extração e grupos nomeados (dados/texto_base.txt)');
    const t = carregarTextoBase();
    verificar('extrairEmails', E.extrairEmails(t), ['ana.silva@udc.edu.br', 'joao123@gmail.com']);
    verificar('extrairDatas → texto', E.extrairDatas(t).map((d) => d.texto), ['01/09/2026', '03/09/2026']);
    const { dia, mes, ano } = E.extrairDatas(t)[0];
    verificar('extrairDatas[0] → m.groups', { dia, mes, ano }, { dia: '01', mes: '09', ano: '2026' });
    verificar('extrairHashtags', E.extrairHashtags(t), ['#LFA', '#Python', '#Regex']);
    for (const [s, esp] of [['08:30', true], ['23:59', true], ['25:61', false]]) {
      verificar(`validarHorario(${mostrar(s)})`, E.validarHorario(s), esp);
    }
    verificar(
      'Desafio: posicional m[1..3] === nomeada m.groups',
      E.decomporDataPosicional('03/09/2026'),
      E.decomporDataNomeada('03/09/2026'),
    );
  },

  4() {
    titulo('Etapa 4 — Substituição e separação');
    verificar('normalizarEspacos', E.normalizarEspacos('  LFA   com  Python   é   prática!  '), 'LFA com Python é prática!');
    verificar("mascararCpf('123.456.789-00')", E.mascararCpf('123.456.789-00'), '123.***.***-00');
    verificar(
      "separar('LFA;Python,Regex | Automatos')",
      E.separar('LFA;Python,Regex | Automatos'),
      ['LFA', 'Python', 'Regex', 'Automatos'],
    );
    verificar(
      "Desafio (literal): substituirLiteral('preço: $5', '$5', '$&$&')",
      E.substituirLiteral('preço: $5', '$5', '$&$&'),
      'preço: $&$&',
    );
    verificar("Desafio (grupos): '01/09/2026' → '$<ano>-$<mes>-$<dia>'", E.reformatarDataComGrupos('01/09/2026'), '2026-09-01');
  },

  5() {
    titulo('Etapa 5 — Parser de logs (dados/logs.txt)');
    const r = E.analisarLogs(carregarLog('logs.txt'));
    verificar('[válidas, rejeitadas]', [r.validas.length, r.rejeitadas.length], [5, 1]);
    verificar('porNivel', r.porNivel, { INFO: 3, WARN: 1, ERROR: 1 });
    verificar('porUsuario', r.porUsuario, { ana: 2, bruno: 2, carla: 1 });
    verificar(
      '[ações distintas, todas com contagem 1]',
      [Object.keys(r.porAcao).length, Object.values(r.porAcao).every((n) => n === 1)],
      [5, true],
    );
    for (const x of r.rejeitadas) console.log(`      rejeitada — linha ${x.linha}: ${x.motivo} → ${mostrar(x.conteudo)}`);

    console.log('  Desafio — dados/logs_ampliado.txt (+2 válidas, +1 inválida):');
    const a = E.analisarLogs(carregarLog('logs_ampliado.txt'));
    verificar('[válidas, rejeitadas]', [a.validas.length, a.rejeitadas.length], [7, 2]);
    verificar('porNivel', a.porNivel, { INFO: 4, WARN: 2, ERROR: 1 });
    verificar('porUsuario', a.porUsuario, { ana: 3, bruno: 2, carla: 2 });
    verificar('porAcao.login', a.porAcao.login, 2);

    console.log('  Desafio — dados/logs_semantica.txt (IP fora de faixa, data e hora impossíveis):');
    const s = E.analisarLogs(carregarLog('logs_semantica.txt'));
    verificar('[válidas, rejeitadas]', [s.validas.length, s.rejeitadas.length], [0, 3]);
    for (const x of s.rejeitadas) console.log(`      linha ${x.linha}: ${x.motivo}`);
  },

  6() {
    titulo('Etapa 6 — Mini analisador léxico');
    const tipos = (s) => E.tokenizar(s).tokens.map((t) => t.tipo);
    verificar(
      "'total = preco * 2 + desconto_1 - 3.5'",
      tipos('total = preco * 2 + desconto_1 - 3.5'),
      ['ID', 'ASSIGN', 'ID', 'OP', 'NUMBER', 'OP', 'ID', 'OP', 'NUMBER'],
    );
    verificar(
      "'resultado = (a + b) >= 10; x != 0, y == 2'",
      tipos('resultado = (a + b) >= 10; x != 0, y == 2'),
      ['ID', 'ASSIGN', 'LPAREN', 'ID', 'OP', 'ID', 'RPAREN', 'RELOP', 'NUMBER', 'SEMICOLON', 'ID', 'RELOP', 'NUMBER', 'COMMA', 'ID', 'RELOP', 'NUMBER'],
    );
    verificar("Desafio: 'x==y' → lexemas (== tem prioridade sobre =)", E.tokenizar('x==y').tokens.map((t) => t.lexema), ['x', '==', 'y']);
    verificar("Desafio: erro em 'a = b @ 2'", E.tokenizar('a = b @ 2').erros, [{ simbolo: '@', pos: 6, coluna: 7 }]);
    try {
      E.tokenizarOuFalhar('a = b @ 2');
    } catch (e) {
      console.log(`      ${e.name}: ${e.message}`);
    }
  },
};

const pedida = process.argv[2];
for (const [n, rodar] of Object.entries(ETAPAS)) {
  if (!pedida || pedida === n) rodar();
}

const cor = ok === total ? VERDE : VERMELHO;
console.log(`\n${cor}${NEGRITO}${ok}/${total} verificações ok${RESET}`);
if (ok !== total) process.exitCode = 1;
