/**
 * Funções que dependem do Node.js (leitura de arquivos em dados/).
 * Ficam separadas de index.js para que o site (navegador) possa importar as
 * etapas sem puxar o módulo node:fs.
 */
import { readFileSync } from 'node:fs';

const DADOS = new URL('../dados/', import.meta.url);

/** Lê um arquivo de dados/ como texto UTF-8. */
export function lerDado(nomeArquivo) {
  return readFileSync(new URL(nomeArquivo, DADOS), 'utf8');
}

/** Texto-base da Etapa 3. */
export function carregarTextoBase() {
  return lerDado('texto_base.txt');
}
