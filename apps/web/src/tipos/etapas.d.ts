/**
 * Tipos do pacote @regex-js/etapas (JavaScript puro, sem build).
 * Só o que o site usa; as assinaturas espelham os módulos em equipe_02_javascript/src.
 */
declare module '@regex-js/etapas' {
  // Etapa 1
  export const RE_ID: RegExp;
  export const RE_ID_MAIUSCULA: RegExp;
  export const RE_NUMERO: RegExp;
  export const RE_PALAVRA_L: RegExp;
  export const FRASE_ETAPA1: string;
  export function ehIdentificador(s: string): boolean;
  export function ehIdentificadorMaiusculo(s: string): boolean;
  export function extrairNumeros(texto: string): string[];
  export function palavrasComL(texto: string): string[];

  // Etapa 2
  export const RE_MATRICULA: RegExp;
  export const RE_DATA: RegExp;
  export const RE_TELEFONE: RegExp;
  export const RE_CODIGO_LFA: RegExp;
  export function validarMatricula(s: string): boolean;
  export function validarTelefone(s: string): boolean;
  export function validarCodigoLfa(s: string): boolean;
  export function validarData(s: string): { sintatica: boolean; semantica: boolean; motivo: string };

  // Etapa 3
  export const RE_EMAIL: RegExp;
  export const RE_DATA_TEXTO: RegExp;
  export const RE_HASHTAG: RegExp;
  export const RE_HORARIO: RegExp;
  export const RE_HORARIO_TEXTO: RegExp;
  export function extrairEmails(t: string): string[];
  export function extrairHashtags(t: string): string[];
  export function extrairDatas(t: string): Array<{ texto: string; dia: string; mes: string; ano: string }>;
  export function validarHorario(s: string): boolean;
  export function extrairHorarios(t: string): Array<{ texto: string; valido: boolean }>;

  // Etapa 4
  export const RE_CPF: RegExp;
  export const RE_SEPARADORES: RegExp;
  export function normalizarEspacos(s: string): string;
  export function mascararCpf(s: string): string | null;
  export function separar(s: string): string[];
  export function substituirLiteral(texto: string, alvo: string, novo: string): string;
  export function reformatarDataComGrupos(s: string): string;

  // Etapa 5
  export const RE_LOG: RegExp;
  export interface CamposLog { data: string; hora: string; nivel: string; usuario: string; ip: string; acao: string }
  export interface ResultadoLogs {
    validas: Array<CamposLog & { linha: number }>;
    rejeitadas: Array<{ linha: number; conteudo: string; motivo: string }>;
    porNivel: Record<string, number>;
    porUsuario: Record<string, number>;
    porAcao: Record<string, number>;
  }
  export function analisarLogs(texto: string, opcoes?: { semantica?: boolean }): ResultadoLogs;

  // Etapa 6
  export const ESPEC_TOKENS: Array<[string, string]>;
  export interface Token { tipo: string; lexema: string; pos: number }
  export interface ErroToken { simbolo: string; pos: number; coluna: number }
  export function tokenizar(entrada: string): { tokens: Token[]; erros: ErroToken[] };
}
