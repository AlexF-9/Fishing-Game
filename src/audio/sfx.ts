import { save } from '../state/save';
import { duck, ensureAudio, getBuses } from './mixer';

// Efeitos sonoros gerados no código (WebAudio), iguais aos do jogo original.
// Agora passam pelo barramento de efeitos da mesa de mistura, e os importantes baixam a música.

/** Desbloqueia o áudio (chamar dentro de um clique ou tecla). */
export function audioInit(): void { ensureAudio(); }

function tone(f1: number, f2: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0): void {
  const b = getBuses();
  if (!b || save.mute) return;
  const AC = b.ac;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(b.sfx);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  cast:   () => tone(700, 180, 0.3, 'triangle', 0.10),
  splash: () => { tone(320, 70, 0.25, 'sine', 0.18); tone(1200, 400, 0.12, 'triangle', 0.04); },
  bite:   () => { duck(0.2, 0.3, 0.8); tone(880, 880, 0.08, 'square', 0.07); tone(1175, 1175, 0.1, 'square', 0.07, 0.1); },
  bottom: () => { tone(330, 300, 0.12, 'triangle', 0.06); tone(990, 980, 0.1, 'sine', 0.03, 0.06); },
  hit:    () => { duck(0.45, 0.05, 0.35); tone(520, 980, 0.12, 'triangle', 0.13); },
  miss:   () => { duck(0.45, 0.05, 0.35); tone(220, 110, 0.2, 'sawtooth', 0.07); },
  lose:   () => { duck(0.35, 0.3, 0.8); tone(420, 90, 0.5, 'sawtooth', 0.07); },
  catch:  () => { duck(0.2, 0.5, 1.0); [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.2, 'triangle', 0.12, i * 0.1)); },
  coin:   () => { duck(0.5, 0.15, 0.4); tone(988, 990, 0.08, 'square', 0.06); tone(1319, 1320, 0.22, 'square', 0.06, 0.08); },
  buy:    () => { duck(0.5, 0.15, 0.4); [660, 880, 1320].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.1, i * 0.07)); },
};
