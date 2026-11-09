#!/usr/bin/env node
/**
 * Monta a entrega para o professor, FORA do repositório:
 *   ../entrega/equipe_02_javascript/       (cópia da pasta, sem node_modules)
 *   ../entrega/equipe_02_javascript.zip    (mesmo conteúdo compactado)
 * O zip é escrito com zlib nativo (sem dependências).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const origem = join(raiz, 'equipe_02_javascript');
const destinoBase = join(raiz, '..', 'entrega');
const destino = join(destinoBase, 'equipe_02_javascript');
const zip = join(destinoBase, 'equipe_02_javascript.zip');

const OBRIGATORIOS = ['README.md', 'src', 'testes', 'dados', 'relatorio.pdf', 'apresentacao.pptx', 'uso_ia.md'];
const faltando = OBRIGATORIOS.filter((f) => !existsSync(join(origem, f)));
if (faltando.length) {
  console.error(`Faltam itens obrigatórios: ${faltando.join(', ')}. Rode "pnpm relatorio" e "pnpm pptx" antes.`);
  process.exit(1);
}

const ignorar = (caminho) => caminho.split(sep).includes('node_modules');

rmSync(destino, { recursive: true, force: true });
mkdirSync(destinoBase, { recursive: true });
cpSync(origem, destino, { recursive: true, filter: (c) => !ignorar(c) });

function listar(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const c = join(dir, nome);
    if (ignorar(c)) return [];
    return statSync(c).isDirectory() ? listar(c) : [c];
  });
}

/** Escreve um .zip (método deflate) com os arquivos sob o prefixo dado. */
function escreverZip(arquivos, base, prefixo, saida) {
  const partes = [];
  const central = [];
  let offset = 0;
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2);
  const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();

  for (const arq of arquivos) {
    const nome = Buffer.from(`${prefixo}/${relative(base, arq).split(sep).join('/')}`, 'utf8');
    const dados = readFileSync(arq);
    const comprimido = deflateRawSync(dados, { level: 9 });
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(data, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    partes.push(local, nome, comprimido);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(hora, 12);
    c.writeUInt16LE(data, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comprimido.length, 20);
    c.writeUInt32LE(dados.length, 24);
    c.writeUInt16LE(nome.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, nome);
    offset += local.length + nome.length + comprimido.length;
  }

  const tamanhoCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(tamanhoCentral, 12);
  fim.writeUInt32LE(offset, 16);
  writeFileSync(saida, Buffer.concat([...partes, ...central, fim]));
}

const arquivos = listar(destino);
escreverZip(arquivos, destino, 'equipe_02_javascript', zip);
console.log(`Pasta: ${destino}`);
console.log(`Zip:   ${zip} (${arquivos.length} arquivos, ${(statSync(zip).size / 1024).toFixed(0)} KB)`);
