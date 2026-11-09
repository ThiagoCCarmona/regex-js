/** Estado em memória das salas da Regex Arena. */
import { randomInt, randomUUID } from 'node:crypto';
import { DESAFIOS, type Desafio } from './desafios.ts';
import { calcularPontos } from './pontuacao.ts';

export const DURACAO_RODADA_MS = 60_000;
export const INTERVALO_ENVIO_MS = 1_000;
export const APELIDO_MAX = 16;

export interface Jogador {
  id: string;
  apelido: string;
  pontos: number;
  ultimoEnvio: number;
  acertouRodada: boolean;
  pontosRodada: number;
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

  constructor(pin: string) {
    this.pin = pin;
  }

  entrar(apelidoBruto: string): ResultadoEntrada {
    const apelido = String(apelidoBruto ?? '').trim();
    if (apelido.length === 0) return { ok: false, erro: 'Informe um apelido' };
    if (apelido.length > APELIDO_MAX) return { ok: false, erro: `Apelido com no máximo ${APELIDO_MAX} caracteres` };
    const emUso = [...this.jogadores.values()].some((j) => j.apelido.toLowerCase() === apelido.toLowerCase());
    if (emUso) return { ok: false, erro: 'Esse apelido já está na sala' };
    const jogador: Jogador = {
      id: randomUUID(),
      apelido,
      pontos: 0,
      ultimoEnvio: -Infinity,
      acertouRodada: false,
      pontosRodada: 0,
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
    if (agora - j.ultimoEnvio < INTERVALO_ENVIO_MS) return 'Aguarde 1 segundo entre envios';
    j.ultimoEnvio = agora;
    return null;
  }

  /** Registra o resultado da avaliação; devolve os pontos ganhos (0 se não pontuou). */
  registrarResultado(jogadorId: string, correto: boolean, tamanho: number, agora: number): number {
    const j = this.jogadores.get(jogadorId);
    if (!j || !correto || j.acertouRodada || !this.rodada || !this.rodadaAtiva(agora)) return 0;
    const pontos = calcularPontos(tamanho, this.rodada.fimEm - agora, DURACAO_RODADA_MS);
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

  criarSala(): Sala {
    let pin = '';
    do {
      pin = String(randomInt(1000, 10000));
    } while (this.salas.has(pin));
    const sala = new Sala(pin);
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
