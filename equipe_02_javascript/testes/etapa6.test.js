// Etapa 6 — Mini analisador léxico
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizar, tokenizarOuFalhar, ErroLexico, ESPEC_TOKENS } from '../src/etapa6-lexico.js';

const tipos = (s) => tokenizar(s).tokens.map((t) => t.tipo);

test('expressão do enunciado: tipos na ordem, sem tokens de espaço', () => {
  assert.deepEqual(tipos('total = preco * 2 + desconto_1 - 3.5'), [
    'ID', 'ASSIGN', 'ID', 'OP', 'NUMBER', 'OP', 'ID', 'OP', 'NUMBER',
  ]);
});

test('lexemas e posições são preservados', () => {
  const { tokens } = tokenizar('total = preco * 2 + desconto_1 - 3.5');
  assert.deepEqual(tokens[0], { tipo: 'ID', lexema: 'total', pos: 0 });
  assert.deepEqual(tokens.at(-1), { tipo: 'NUMBER', lexema: '3.5', pos: 33 });
});

test('segunda expressão do enunciado com parênteses, RELOP, ; e ,', () => {
  assert.deepEqual(tipos('resultado = (a + b) >= 10; x != 0, y == 2'), [
    'ID', 'ASSIGN', 'LPAREN', 'ID', 'OP', 'ID', 'RPAREN', 'RELOP', 'NUMBER', 'SEMICOLON',
    'ID', 'RELOP', 'NUMBER', 'COMMA', 'ID', 'RELOP', 'NUMBER',
  ]);
});

test('desafio: == != <= >= têm prioridade sobre = < >', () => {
  const lex = (s) => tokenizar(s).tokens.map((t) => `${t.tipo}:${t.lexema}`);
  assert.deepEqual(lex('x==y'), ['ID:x', 'RELOP:==', 'ID:y']);
  assert.deepEqual(lex('a<=b'), ['ID:a', 'RELOP:<=', 'ID:b']);
  assert.deepEqual(lex('a>=b'), ['ID:a', 'RELOP:>=', 'ID:b']);
  assert.deepEqual(lex('a!=b'), ['ID:a', 'RELOP:!=', 'ID:b']);
  assert.deepEqual(lex('a<b'), ['ID:a', 'RELOP:<', 'ID:b']);
  assert.deepEqual(lex('a=b'), ['ID:a', 'ASSIGN:=', 'ID:b']);
});

test('desafio: símbolo não reconhecido @ produz erro com posição', () => {
  const r = tokenizar('a = b @ 2');
  assert.deepEqual(r.erros, [{ simbolo: '@', pos: 6, coluna: 7 }]);
  assert.deepEqual(r.tokens.map((t) => t.tipo), ['ID', 'ASSIGN', 'ID', 'NUMBER']);
});

test('tokenizarOuFalhar lança ErroLexico com a posição', () => {
  assert.throws(() => tokenizarOuFalhar('a = b @ 2'), (e) => {
    assert.ok(e instanceof ErroLexico);
    assert.equal(e.pos, 6);
    assert.equal(e.simbolo, '@');
    assert.equal(e.message, "Símbolo inesperado '@' na posição 6 (coluna 7)");
    return true;
  });
  assert.equal(tokenizarOuFalhar('x = 1').length, 3);
});

test('borda: "!" isolado é erro; cadeia vazia (λ) não gera tokens', () => {
  assert.equal(tokenizar('!').erros.length, 1);
  assert.deepEqual(tokenizar(''), { tokens: [], erros: [] });
});

test('especificação lista os 11 tipos na ordem de prioridade', () => {
  assert.deepEqual(ESPEC_TOKENS.map(([t]) => t), [
    'NUMBER', 'ID', 'RELOP', 'ASSIGN', 'OP', 'LPAREN', 'RPAREN', 'COMMA', 'SEMICOLON', 'SKIP', 'MISMATCH',
  ]);
});
