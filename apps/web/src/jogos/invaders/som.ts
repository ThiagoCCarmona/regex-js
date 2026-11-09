/**
 * Bipes 8-bit gerados com WebAudio (sem arquivos de áudio).
 * Começa DESLIGADO: numa sala de aula, som só quando quem apresenta quiser.
 */
const CHAVE = 'invaders:som';
let ctx: AudioContext | null = null;

export function somLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function definirSom(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE, ligado ? '1' : '0');
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

/** Uma nota: onda, frequência inicial → final, duração (s), atraso (s), volume. */
function nota(tipo: OscillatorType, de: number, ate: number, dur: number, atraso = 0, volume = 0.08) {
  if (!somLigado()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(de, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, ate), t + dur);
    ganho.gain.setValueAtTime(volume, t);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* navegador sem WebAudio: segue em silêncio */
  }
}

export const sons = {
  disparo: () => nota('square', 880, 220, 0.12),
  acerto: (n: number) => {
    for (let i = 0; i < Math.min(n, 5); i++) nota('square', 520 + i * 140, 1040 + i * 140, 0.09, i * 0.06, 0.06);
  },
  aliada: () => nota('sawtooth', 220, 90, 0.35, 0, 0.09),
  vida: () => {
    nota('triangle', 330, 110, 0.25);
    nota('triangle', 220, 70, 0.3, 0.18);
  },
  fase: () => [523, 659, 784, 1047].forEach((f, i) => nota('square', f, f, 0.12, i * 0.1, 0.06)),
  fim: () => [392, 330, 262, 196].forEach((f, i) => nota('triangle', f, f * 0.98, 0.22, i * 0.16, 0.08)),
};
