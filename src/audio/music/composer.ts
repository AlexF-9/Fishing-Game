import type { Note } from './instruments';
import type { Chord, Style } from './styles';

// Compositor generativo. Em vez de um loop fixo, gera cada compasso na hora a partir de:
//  - um MOTIVO de 4 notas, o "boiar" da boia (sobe, sobe, desce), igual em todos os ambientes;
//  - transformações por frase de 4 compassos (original, invertido, ao contrário, deslocado);
//  - regras de forma: o 8.º compasso de cada 8 só respira (sem melodia) e
//    os compassos 29–32 de cada 32 são uma secção despida (só baixo e fundo).
// O resultado nunca se repete igual, mas soa sempre ao mesmo jogo.

export const MOTIF = [0, 2, 4, 2];

export interface Timed { step: number; note: Note }

/** Gerador pseudo-aleatório com semente (variações reprodutíveis por deck). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Índice da escala mais próximo de um semitom. */
function degreeOf(style: Style, semis: number): number {
  const pc = ((semis % 12) + 12) % 12;
  let best = 0, bd = 99;
  style.scale.forEach((s, i) => { const d = Math.abs(s - pc); if (d < bd) { bd = d; best = i; } });
  return best;
}
function degToMidi(style: Style, deg: number): number {
  const n = style.scale.length, oct = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return style.root + style.lead.octave + style.scale[i] + 12 * oct;
}
/** Aproxima a nota do tom do acorde mais próximo (tempos fortes). */
function snapToChord(style: Style, midi: number, chord: Chord): number {
  const base = style.root + chord.root;
  let best = midi, bd = 99;
  for (let o = -2; o <= 2; o++) for (const t of chord.tones) {
    const m = base + t + 12 * o, d = Math.abs(m - midi);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

type Transform = (m: number[]) => number[];
const TRANSFORMS: Transform[] = [
  m => m,
  m => m.map(d => -d),
  m => [...m].reverse(),
  m => m.map(d => d + 1),
  m => m.map((d, i) => (i % 2 ? d + 2 : d)),
];

export interface PhraseState { transform: Transform; rhythm: number[] }

export function newPhrase(style: Style, rng: () => number): PhraseState {
  return {
    transform: TRANSFORMS[Math.floor(rng() * TRANSFORMS.length)],
    rhythm: style.lead.rhythms[Math.floor(rng() * style.lead.rhythms.length)],
  };
}

/**
 * Gera as notas de um compasso.
 * @param bar índice do compasso desde o início do deck
 */
export function composeBar(style: Style, bar: number, phrase: PhraseState, rng: () => number, stepDur: number): Timed[] {
  const out: Timed[] = [];
  const chord = style.chords[bar % style.chords.length];
  const inPhrase = bar % 4;
  const breakdown = bar % 32 >= 28;
  const breath = bar % 8 === 7;
  const intro = bar < 2;
  const hum = () => 0.88 + rng() * 0.24;
  const barDur = stepDur * 16;
  const chordBase = (base: number) => base + ((style.root + chord.root - base) % 12 + 12) % 12;

  // fundo (pad) ou drone: um acorde por compasso
  if (style.pad) {
    const b = chordBase(style.pad.base);
    for (const t of chord.tones.slice(0, 3)) out.push({ step: 0, note: { inst: 'pad', midi: b + t, dur: barDur, vol: style.pad.vol } });
  }
  if (style.drone) out.push({ step: 0, note: { inst: 'drone', midi: style.drone.midi, dur: barDur, vol: style.drone.vol } });

  // baixo
  const bassRoot = chordBase(style.bass.base);
  const pattern = breakdown ? style.bass.pattern.slice(0, 1) : style.bass.pattern;
  for (const [step, interval, len] of pattern) {
    out.push({ step, note: { inst: style.bass.inst, midi: bassRoot + interval, dur: len * stepDur * 0.95, vol: style.bass.vol * hum() } });
  }

  // percussão (cala-se na secção despida e no compasso de respirar fica só metade)
  if (!breakdown && !intro) {
    for (const p of style.perc) {
      if (breath && p.step >= 8) continue;
      out.push({ step: p.step, note: { inst: p.inst, midi: 60, dur: 0.1, vol: p.vol * hum() } });
    }
  }

  // arpejo
  if (style.arp && !breakdown && !breath) {
    const b = chordBase(style.arp.base);
    const tones = [...chord.tones, 12];
    for (let s = 0, i = 0; s < 16; s += style.arp.every, i++) {
      out.push({ step: s, note: { inst: 'bell', midi: b + tones[i % tones.length], dur: stepDur * 2, vol: style.arp.vol * hum() } });
    }
  }

  // sinos soltos
  if (style.bells && !breakdown) {
    for (let beat = 0; beat < 4; beat++) if (rng() < style.bells.prob) {
      const m = style.root + 12 + chord.root + chord.tones[Math.floor(rng() * chord.tones.length)];
      out.push({ step: beat * 4 + (rng() < 0.5 ? 0 : 2), note: { inst: 'bell', midi: m, dur: 0.8, vol: style.bells.vol, echo: true } });
    }
  }

  // sonar
  if (style.sonar && bar % style.sonar.everyBars === 0) {
    out.push({ step: 0, note: { inst: 'sonar', midi: style.sonar.midi, dur: 1, vol: style.sonar.vol, echo: true } });
  }

  // melodia: motivo transformado sobre a raiz do acorde
  if (!breakdown && !breath && !intro) {
    const motif = phrase.transform(MOTIF);
    const rootDeg = degreeOf(style, chord.root);
    const onsets = phrase.rhythm.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
    onsets.forEach((step, k) => {
      if (rng() > style.lead.density) return;
      let deg = rootDeg + motif[k % motif.length];
      const last = inPhrase === 3 && k === onsets.length - 1;
      if (last) deg = rootDeg; // fim de frase resolve na raiz
      let midi = degToMidi(style, deg);
      if (step === 0 || step === 8 || last) midi = snapToChord(style, midi, chord);
      while (midi > style.lead.max) midi -= 12;
      while (midi < style.lead.max - 19) midi += 12;
      const next = onsets[k + 1] ?? 16;
      const len = phrase.rhythm[step] === 2 ? next - step : Math.min(2, next - step);
      out.push({ step, note: { inst: style.lead.inst, midi, dur: len * stepDur * 0.9, vol: style.lead.vol * hum(), echo: style.lead.echo } });
    });
  }
  return out;
}

/**
 * Camada do minijogo (por semicolcheia): hi-hats a correr, baixo pulsado e uma nota de tensão.
 * `tension` (0–1) é a fração de acertos; a camada fica mais densa à medida que te aproximas.
 */
export function composeReelStep(style: Style, bar: number, step: number, tension: number, stepDur: number): Note[] {
  const chord = style.chords[bar % style.chords.length];
  const notes: Note[] = [];
  notes.push({ inst: 'hat', midi: 60, dur: 0.05, vol: step % 4 === 0 ? 0.016 : 0.009 });
  if (step % 2 === 0) {
    const bass = 36 + ((style.root + chord.root - 36) % 12 + 12) % 12;
    notes.push({ inst: 'tri', midi: bass, dur: stepDur * 1.2, vol: 0.045 });
  }
  if (step % 8 === 0) notes.push({ inst: 'kick', midi: 40, dur: 0.1, vol: 0.05 });
  if (step % (tension > 0.5 ? 2 : 4) === 2) {
    notes.push({ inst: 'pulse12', midi: style.root + chord.root + 7, dur: stepDur * 0.8, vol: 0.02 + tension * 0.012 });
  }
  return notes;
}
