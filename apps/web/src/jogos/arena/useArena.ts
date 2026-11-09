/**
 * Conexão WebSocket com o servidor da Regex Arena, com reconexão automática.
 * `aoConectar` roda a cada (re)conexão — é onde a página entra/retoma a sala.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { urlWebSocket } from '../../lib/config.ts';

export interface DesafioPublico {
  id: string;
  titulo: string;
  etapa: number;
  dica: string;
  deveCasar: string[];
  naoDeveCasar: string[];
}

export interface LinhaRanking {
  apelido: string;
  pontos: number;
  pontosRodada: number;
  acertou: boolean;
}

export interface EstadoSala {
  pin: string;
  agora: number;
  totalJogadores: number;
  totalDesafios: number;
  totalRodadas: number;
  partidaEncerrada: boolean;
  ranking: LinhaRanking[];
  rodada: { numero: number; fimEm: number; ativa: boolean; acertos: number; desafio: DesafioPublico } | null;
}

export type MensagemServidor =
  | { t: 'sala:criada'; pin: string; token: string }
  | ({ t: 'sala:estado' } & EstadoSala)
  | { t: 'jogador:entrou'; id: string; apelido: string; pin: string; pontos: number }
  | { t: 'rodada:inicio'; numero: number; totalRodadas: number; desafio: DesafioPublico; ocultosQtd: number; fimEm: number; duracaoMs: number; agora: number }
  | ({ t: 'rodada:fim' } & FimRodada)
  | { t: 'partida:nova' }
  | {
      t: 'resultado';
      padrao: string;
      ok: boolean;
      erro?: string;
      acertosDeve?: boolean[];
      acertosNaoDeve?: boolean[];
      ocultosFalhos?: number;
      correto: boolean;
      pontos: number;
      total: number;
    }
  | { t: 'erro'; codigo: string; msg: string };

export interface FimRodada {
  numero: number;
  totalRodadas: number;
  ultima: boolean;
  solucao: string;
  desafio: DesafioPublico;
  ocultos: { deve: string[]; naoDeve: string[] };
  ranking: LinhaRanking[];
}

export type Enviar = (msg: object) => void;

export function useArena(aoMensagem: (m: MensagemServidor) => void, aoConectar: (enviar: Enviar) => void) {
  const [conectado, setConectado] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const cbMensagem = useRef(aoMensagem);
  const cbConectar = useRef(aoConectar);
  cbMensagem.current = aoMensagem;
  cbConectar.current = aoConectar;
  /** Diferença entre o relógio do servidor e o local (ms). */
  const desvio = useRef(0);

  const enviar = useCallback<Enviar>((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    let encerrado = false;
    let tentativas = 0;
    let timer = 0;

    function conectar() {
      const s = new WebSocket(urlWebSocket());
      ws.current = s;
      s.onopen = () => {
        tentativas = 0;
        setConectado(true);
        cbConectar.current(enviar);
      };
      s.onmessage = (ev) => {
        let msg: MensagemServidor;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if ('agora' in msg && typeof msg.agora === 'number') desvio.current = msg.agora - Date.now();
        cbMensagem.current(msg);
      };
      s.onclose = () => {
        setConectado(false);
        if (encerrado) return;
        const espera = Math.min(8000, 500 * 2 ** tentativas++);
        timer = window.setTimeout(conectar, espera);
      };
    }

    conectar();
    return () => {
      encerrado = true;
      window.clearTimeout(timer);
      ws.current?.close();
    };
  }, [enviar]);

  /** Milissegundos que faltam até `fimEm` (horário do servidor). */
  const restante = useCallback((fimEm: number) => Math.max(0, fimEm - (Date.now() + desvio.current)), []);

  return { conectado, enviar, restante };
}

/** Re-renderiza a cada `ms` enquanto `ativo` (para cronômetros). */
export function useTique(ativo: boolean, ms = 250) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const id = window.setInterval(() => setN((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ativo, ms]);
}
