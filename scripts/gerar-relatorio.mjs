#!/usr/bin/env node
/**
 * Gera equipe_02_javascript/relatorio.pdf a partir de docs/relatorio/relatorio.html
 * usando o Chrome ou o Edge em modo headless (nenhuma dependência npm).
 * Caminho do navegador pode ser forçado com a variável CHROME.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = new URL('../', import.meta.url);
const html = fileURLToPath(new URL('docs/relatorio/relatorio.html', raiz));
const pdf = fileURLToPath(new URL('equipe_02_javascript/relatorio.pdf', raiz));

const candidatos = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const navegador = candidatos.find((c) => existsSync(c));
if (!navegador) {
  console.error('Chrome/Edge não encontrado. Defina a variável CHROME com o caminho do executável.');
  process.exit(1);
}

execFileSync(navegador, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdf}`,
  pathToFileURL(html).href,
], { stdio: 'ignore' });

// Conta as páginas (objetos /Type /Page do PDF).
const paginas = (readFileSync(pdf, 'latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
console.log(`relatorio.pdf gerado: ${paginas} página(s)`);
if (paginas < 3 || paginas > 5) {
  console.error('Atenção: o enunciado pede de 3 a 5 páginas.');
  process.exitCode = 1;
}
