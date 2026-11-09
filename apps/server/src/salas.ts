/** Estado em memória das salas da Regex Arena. */
import { randomInt, randomUUID } from 'node:crypto';
import { DESAFIOS, type Desafio } from './desafios.ts';
import { calcularPontos } from './pontuacao.ts';

export const DURACAO_RODADA_MS = 60_000;
export const INTERVALO_ENVIO_MS = 1_000;
export const APELIDO_MAX = 16;
export const MAX_SALAS = 200;
export const MAX_JOGADORES = 150;
const TOTAL_PINS = 9000; // 1000..9999

export interface Limites {
  maxSalas?: number;
  maxJogadores?: number;
}

export interface Jogador {
  id: string;
  apelido: string;
  pontos: number;
  ultimoEnvio: number;
  acertouRodada: boolean;
  pontosRodada: number;
  /** Há uma regex deste jogador sendo avaliada. */
  avaliando: boolean;
}

export interface Rodada {
  numero: number;
  desafio: Desafio;
  inicio: number;
  fimEm: number;
  encerrada: boolean;
}

export interface LinhaRanking {
  apelido: string;
  pontos: number;
  pontosRodada: number;
  acertou: boolean;
}

export type ResultadoEntrada = { ok: true; jogador: Jogador } | { ok: false; erro: string };

export class Sala {
  readonly pin: string;
  readonly jogadores = new Map<string, Jogador>();
  rodada: Rodada | null = null;
  private usados = new Set<string>();
  private readonly maxJogadores: number;

  constructor(pin: string, maxJogadores = MAX_JOGADORES) {
    this.pin = pin;
    this.maxJogadores = maxJogadores;
  }

  entrar(apelidoBruto: string): ResultadoEntrada {
    const apelido = String(apelidoBruto ?? '').trim();
    if (apelido.length === 0) return { ok: false, erro: 'Informe um apelido' };
    if (apelido.length > APELIDO_MAX) return { ok: false, erro: `Apelido com no máximo ${APELIDO_MAX} caracteres` };
    if (this.jogadores.size >= this.maxJogadores) return { ok: false, erro: 'A sala está cheia' };
    const emUso = [...this.jogadores.values()].some((j) => j.apelido.toLowerCase() === apelido.toLowerCase());
    if (emUso) return { ok: false, erro: 'Esse apelido já está na sala' };
    const jogador: Jogador = {
      id: randomUUID(),
      apelido,
      pontos: 0,
      ultimoEnvio: -Infinity,
      acertouRodada: false,
      pontosRodada: 0,
      avaliando: false,
    };
    this.jogadores.set(jogador.id, jogador);
    return { ok: true, jogador };
  }

  sair(jogadorId: string): void {
    this.jogadores.delete(jogadorId);
  }

  /** Inicia a próxima rodada (ou a de `desafioId`), sem repetir desafios até acabarem. */
  iniciarRodada(agora: number, desafioId?: string): Rodada {
    let desafio = desafioId ? DESAFIOS.find((d) => d.id === desafioId) : undefined;
    if (!desafio) {
      if (this.usados.size >= DESAFIOS.length) this.usados.clear();
      desafio = DESAFIOS.find((d) => !this.usados.has(d.id))!;
    }
    this.usados.add(desafio.id);
    for (const j of this.jogadores.values()) {
      j.acertouRodada = false;
      j.pontosRodada = 0;
      j.avaliando = false;
    }
    this.rodada = {
      numero: (this.rodada?.numero ?? 0) + 1,
      desafio,
      inicio: agora,
      fimEm: agora + DURACAO_RODADA_MS,
      encerrada: false,
    };
    return this.rodada;
  }

  encerrarRodada(): void {
    if (this.rodada) this.rodada.encerrada = true;
  }

  rodadaAtiva(agora: number): boolean {
    return !!this.rodada && !this.rodada.encerrada && agora < this.rodada.fimEm;
  }

  /** Verifica se o jogador pode enviar agora; devolve mensagem de erro ou null. */
  tentarEnvio(jogadorId: string, agora: number): string | null {
    const j = this.jogadores.get(jogadorId);
    if (!j) return 'Jogador não está na sala';
    if (!this.rodada) return 'Aguarde a rodada começar';
    if (!this.rodadaAtiva(agora)) return 'A rodada foi encerrada';
    if (j.avaliando) return 'Aguarde: sua regex anterior ainda está sendo avaliada';
    if (agora - j.ultimoEnvio < INTERVALO_ENVIO_MS) return 'Aguarde 1 segundo entre envios';
    j.ultimoEnvio = agora;
    j.avaliando = true;
    return null;
  }

  /**
   * Registra o resultado da avaliação e libera o jogador para novo envio.
   * `enviadoEm` é o instante do ENVIO (não o fim da avaliação): quem enviou a
   * tempo pontua mesmo que a rodada termine durante a avaliação.
   * Devolve os pontos ganhos (0 se não pontuou).
   */
  registrarResultado(jogadorId: string, correto: boolean, tamanho: number, enviadoEm: number): number {
    const j = this.jogadores.get(jogadorId);
    if (!j) return 0;
    j.avaliando = false;
    if (!correto || j.acertouRodada || !this.rodada || enviadoEm >= this.rodada.fimEm || enviadoEm < this.rodada.inicio) return 0;
    const pontos = calcularPontos(tamanho, this.rodada.fimEm - enviadoEm, DURACAO_RODADA_MS);
    j.acertouRodada = true;
    j.pontosRodada = pontos;
    j.pontos += pontos;
    return pontos;
  }

  /** Todos acertaram? (usado para encerrar a rodada mais cedo) */
  todosAcertaram(): boolean {
    return this.jogadores.size > 0 && [...this.jogadores.values()].every((j) => j.acertouRodada);
  }

  ranking(): LinhaRanking[] {
    return [...this.jogadores.values()]
      .map((j) => ({ apelido: j.apelido, pontos: j.pontos, pontosRodada: j.pontosRodada, acertou: j.acertouRodada }))
      .sort((a, b) => b.pontos - a.pontos || a.apelido.localeCompare(b.apelido));
  }
}

export class GerenciadorSalas {
  private salas = new Map<string, Sala>();
  private readonly maxSalas: number;
  private readonly maxJogadores: number;

  constructor({ maxSalas = MAX_SALAS, maxJogadores = MAX_JOGADORES }: Limites = {}) {
    this.maxSalas = maxSalas;
    this.maxJogadores = maxJogadores;
  }

  get total(): number {
    return this.salas.size;
  }

  /** Cria uma sala com PIN livre, ou devolve null se o limite foi atingido. */
  criarSala(): Sala | null {
    if (this.salas.size >= Math.min(this.maxSalas, TOTAL_PINS)) return null;
    let pin = String(randomInt(1000, 10000));
    // Sorteio com poucas tentativas; se falhar, varre a partir de um ponto (sempre termina).
    for (let t = 0; t < 20 && this.salas.has(pin); t++) pin = String(randomInt(1000, 10000));
    if (this.salas.has(pin)) {
      const inicio = Number(pin) - 1000;
      for (let k = 1; k <= TOTAL_PINS && this.salas.has(pin); k++) pin = String(1000 + ((inicio + k) % TOTAL_PINS));
      if (this.salas.has(pin)) return null;
    }
    const sala = new Sala(pin, this.maxJogadores);
    this.salas.set(pin, sala);
    return sala;
  }

  obter(pin: string): Sala | undefined {
    return this.salas.get(String(pin));
  }

  remover(pin: string): void {
    this.salas.delete(pin);
  }
}
