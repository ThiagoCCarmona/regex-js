/**
 * Ponto de entrada do pacote @regex-js/etapas.
 * Reexporta as seis etapas (sem dependências de Node — funciona no navegador).
 * Funções que leem arquivos ficam em ./node.js.
 */
export * from './etapa1-reconhecimento.js';
export * from './etapa2-validacao.js';
export * from './etapa3-extracao.js';
export * from './etapa4-transformacao.js';
export * from './etapa5-logs.js';
export * from './etapa6-lexico.js';
