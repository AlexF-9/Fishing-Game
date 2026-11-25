import { save } from '../state/save';

// Mesa de mistura: um único AudioContext com dois barramentos.
//
//   sfx ───────────────────────────────┐
//   music → musicLevel → duck → filtro ┴→ master → compressor → saída
//
// A música fica ~12 dB abaixo dos efeitos e "abaixa-se" (ducking) nos sons importantes
// (o "!", acertos, falhas, peixe apanhado), para nunca competir com eles.

/** Volume base da música (os efeitos tocam a 1). */
export const MUSIC_LEVEL = 0.28;

export interface Buses {
  ac: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  duck: GainNode;
  musicFilter: BiquadFilterNode;
}

let buses: Buses | null = null;
const unlockListeners: (() => void)[] = [];

/** Corre `fn` quando o áudio for desbloqueado pela primeira interação do jogador. */
export function onUnlock(fn: () => void): void {
  unlockListeners.push(fn);
  if (buses) fn();
}

export function getBuses(): Buses | null { return buses; }

/**
 * Cria (ou retoma) o AudioContext. Só deve ser chamado dentro de um clique ou tecla,
 * por causa da política de autoplay dos browsers.
 */
export function ensureAudio(): Buses | null {
  if (!buses) {
    let ac: AudioContext;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new Ctor();
    } catch { return null; }

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ac.destination);
    const master = ac.createGain(); master.connect(comp);
    const sfx = ac.createGain(); sfx.connect(master);
    const musicFilter = ac.createBiquadFilter();
    musicFilter.type = 'lowpass'; musicFilter.frequency.value = 9000; musicFilter.Q.value = 0.5;
    musicFilter.connect(master);
    const duck = ac.createGain(); duck.connect(musicFilter);
    const music = ac.createGain(); music.gain.value = 0; music.connect(duck);
    buses = { ac, master, sfx, music, duck, musicFilter };
    applyVolumes();

    // o jogo pára quando o separador fica escondido; o som também
    document.addEventListener('visibilitychange', () => {
      if (!buses) return;
      if (document.hidden) void buses.ac.suspend(); else void buses.ac.resume();
    });
    unlockListeners.forEach(fn => fn());
  }
  if (buses.ac.state === 'suspended' && !document.hidden) void buses.ac.resume();
  return buses;
}

/** Aplica o mute geral (🔊) e o interruptor da música (🎵). */
export function applyVolumes(): void {
  if (!buses) return;
  const t = buses.ac.currentTime;
  buses.master.gain.setTargetAtTime(save.mute ? 0 : 1, t, 0.03);
  buses.music.gain.setTargetAtTime(save.music ? MUSIC_LEVEL : 0, t, 0.25);
}

/** Baixa a música por instantes para um efeito importante se ouvir bem. */
export function duck(depth = 0.35, hold = 0.12, release = 0.6): void {
  if (!buses) return;
  const g = buses.duck.gain, t = buses.ac.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(depth, t + 0.03);
  g.setValueAtTime(depth, t + 0.03 + hold);
  g.linearRampToValueAtTime(1, t + 0.03 + hold + release);
}
