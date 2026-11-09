#!/usr/bin/env node
/**
 * Gera equipe_02_javascript/apresentacao.pptx a partir do MESMO roteiro dos
 * slides do site (apps/web/src/slides/conteudo.ts). Serve de cópia offline:
 * cada slide traz os tópicos, o código, a imagem da demonstração ao vivo
 * (docs/apresentacao/img, capturada do site) e as notas de quem apresenta.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import PptxGenJS from 'pptxgenjs';
import QRCode from 'qrcode';
import { SLIDES, EQUIPE } from '../apps/web/src/slides/conteudo.ts';

const raiz = new URL('../', import.meta.url);
const SAIDA = fileURLToPath(new URL('equipe_02_javascript/apresentacao.pptx', raiz));
const IMG = (n) => fileURLToPath(new URL(`docs/apresentacao/img/slide-${String(n).padStart(2, '0')}.png`, raiz));
const URL_SITE = 'https://regex-js.tccodes.com.br';
const URL_REPO = 'https://github.com/ThiagoCCarmona/regex-js';

const COR = { papel: 'F3F6F8', branco: 'FFFFFF', tinta: '1D3F94', tintaForte: '10204D', texto: '1A2433', suave: '4F5D70', marca: 'FFE14D', grade: 'DCE5EC', borda: 'B9C6D3' };
const FONTE = { titulo: 'Segoe UI Semibold', texto: 'Segoe UI', codigo: 'Consolas' };
const W = 13.333;
const H = 7.5;

/** Largura e altura de um PNG (lidas do cabeçalho IHDR). */
function tamanhoPng(caminho) {
  const b = readFileSync(caminho);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Encaixa uma imagem numa caixa preservando a proporção. */
function encaixar(caminho, x, y, cw, ch) {
  const { w, h } = tamanhoPng(caminho);
  const escala = Math.min(cw / w, ch / h);
  const iw = w * escala;
  const ih = h * escala;
  return { path: caminho, x: x + (cw - iw) / 2, y: y + (ch - ih) / 2, w: iw, h: ih };
}

const qr = (url) => QRCode.toDataURL(url, { margin: 1, width: 600, color: { dark: '#10204d', light: '#ffffff' } });

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = EQUIPE.integrantes.join(', ');
pptx.company = `Equipe ${EQUIPE.numero} — ${EQUIPE.disciplina}`;
pptx.title = 'Expressões regulares em JavaScript';
pptx.subject = 'Trabalho prático Regex Multilinguagem — LFA';

pptx.defineSlideMaster({
  title: 'CADERNO',
  background: { color: COR.papel },
  objects: [
    { rect: { x: 0, y: H - 0.42, w: W, h: 0.42, fill: { color: COR.branco }, line: { color: COR.grade, width: 1 } } },
    { text: { text: `Equipe ${EQUIPE.numero} · ${EQUIPE.linguagem} · ${EQUIPE.disciplina}`, options: { x: 0.5, y: H - 0.4, w: 8, h: 0.36, fontFace: FONTE.texto, fontSize: 10, color: COR.suave } } },
  ],
  slideNumber: { x: W - 1.2, y: H - 0.4, w: 0.8, h: 0.36, fontFace: FONTE.codigo, fontSize: 10, color: COR.suave, align: 'right' },
});

for (const [i, s] of SLIDES.entries()) {
  const n = i + 1;
  const slide = pptx.addSlide({ masterName: 'CADERNO' });
  slide.addNotes(s.notas);

  if (s.id === 'capa') {
    // Título com as palavras casadas pela regex /regulares|Java\w+/ "marcadas".
    slide.addText(
      [
        { text: 'Expressões ', options: { breakLine: false } },
        { text: 'regulares', options: { highlight: COR.marca } },
        { text: ' em ', options: {} },
        { text: 'JavaScript', options: { highlight: COR.marca } },
      ],
      { x: 0.6, y: 0.9, w: 8.4, h: 2.6, fontFace: FONTE.titulo, fontSize: 54, bold: true, color: COR.tintaForte, valign: 'top' },
    );
    slide.addText('/regulares|Java\\w+/g', { x: 0.6, y: 3.6, w: 6, h: 0.5, fontFace: FONTE.codigo, fontSize: 20, color: COR.tinta });
    slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 4.12, w: 4.2, h: 0, line: { color: COR.tinta, width: 2 } });
    slide.addText(s.subtitulo ?? '', { x: 0.6, y: 4.35, w: 8, h: 0.8, fontFace: FONTE.texto, fontSize: 20, color: COR.texto });
    slide.addText(
      `Equipe ${EQUIPE.numero}: ${EQUIPE.integrantes.join(', ')}\n${EQUIPE.disciplina}, ${EQUIPE.professor}, ${EQUIPE.semestre}`,
      { x: 0.6, y: 5.3, w: 8.5, h: 0.9, fontFace: FONTE.texto, fontSize: 14, color: COR.suave },
    );
    slide.addImage({ data: await qr(URL_SITE), x: 9.7, y: 1.6, w: 3, h: 3 });
    slide.addText('Acompanhe no celular\nregex-js.tccodes.com.br', { x: 9.4, y: 4.65, w: 3.6, h: 0.7, align: 'center', fontFace: FONTE.codigo, fontSize: 12, color: COR.suave });
    continue;
  }

  // Título
  slide.addText(s.titulo, { x: 0.5, y: 0.3, w: W - 1, h: 0.9, fontFace: FONTE.titulo, fontSize: 32, bold: true, color: COR.tintaForte, valign: 'middle' });
  if (s.subtitulo) slide.addText(s.subtitulo, { x: 0.5, y: 1.15, w: W - 1, h: 0.5, fontFace: FONTE.texto, fontSize: 20, color: COR.suave });

  const temImagem = s.demo && existsSync(IMG(n)) && !['arena', 'fim'].includes(s.id);
  // O slide da Arena tem o QR code à direita: o texto não pode passar por baixo dele.
  const larguraTexto = temImagem ? 5.6 : s.id === 'arena' ? 7.3 : W - 1;
  let y = s.subtitulo ? 1.8 : 1.35;

  if (s.topicos.length) {
    const alturaTopicos = Math.min(3.4, 0.5 + s.topicos.length * 0.62);
    slide.addText(
      s.topicos.map((t) => ({ text: t, options: { bullet: { indent: 16 }, paraSpaceAfter: 6 } })),
      { x: 0.5, y, w: larguraTexto, h: alturaTopicos, fontFace: FONTE.texto, fontSize: temImagem ? 15 : 18, color: COR.texto, valign: 'top' },
    );
    y += alturaTopicos + 0.15;
  }

  if (s.codigo) {
    const linhas = s.codigo.split('\n').length;
    const alturaCodigo = Math.min(H - 0.6 - y, 0.3 + linhas * 0.26);
    slide.addText(s.codigo, {
      x: 0.5, y, w: larguraTexto, h: alturaCodigo,
      fontFace: FONTE.codigo, fontSize: 10.5, color: COR.tintaForte, valign: 'top',
      fill: { color: COR.branco }, line: { color: COR.borda, width: 1 }, margin: 8,
    });
    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 0.07, h: alturaCodigo, fill: { color: COR.tinta }, line: { color: COR.tinta, width: 0 } });
  }

  if (temImagem) {
    slide.addImage(encaixar(IMG(n), 6.4, 1.35, W - 6.9, H - 2.0));
    slide.addText('Demonstração ao vivo em regex-js.tccodes.com.br', { x: 6.4, y: H - 0.72, w: W - 6.9, h: 0.3, fontFace: FONTE.texto, fontSize: 10, italic: true, color: COR.suave, align: 'right' });
  }

  if (s.id === 'arena') {
    slide.addImage({ data: await qr(`${URL_SITE}/arena`), x: 8.6, y: 1.5, w: 3.6, h: 3.6 });
    slide.addText('regex-js.tccodes.com.br/arena', { x: 8.1, y: 5.2, w: 4.6, h: 0.4, align: 'center', fontFace: FONTE.codigo, fontSize: 13, color: COR.suave });
  }
  if (s.id === 'fim') {
    slide.addImage({ data: await qr(URL_SITE), x: 4.4, y: 3.4, w: 2.4, h: 2.4 });
    slide.addImage({ data: await qr(URL_REPO), x: 7.6, y: 3.4, w: 2.4, h: 2.4 });
    slide.addText('Site', { x: 4.4, y: 5.85, w: 2.4, h: 0.3, align: 'center', fontFace: FONTE.texto, fontSize: 12, color: COR.suave });
    slide.addText('Código no GitHub', { x: 7.6, y: 5.85, w: 2.4, h: 0.3, align: 'center', fontFace: FONTE.texto, fontSize: 12, color: COR.suave });
  }
}

await pptx.writeFile({ fileName: SAIDA });
console.log(`apresentacao.pptx gerado: ${SLIDES.length} slides`);
