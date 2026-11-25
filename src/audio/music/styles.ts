import type { Inst } from './instruments';

// Os quatro ambientes da banda sonora. Cada um é uma "receita" que o compositor
// usa para gerar compassos novos em tempo real (nada é um loop fixo).

export type StyleId = 'lagoDia' | 'lagoNoite' | 'marDia' | 'marNoite';

export interface Chord { root: number; tones: number[] }
export interface PercHit { step: number; inst: Inst; vol: number }

export interface Style {
  id: StyleId;
  bpm: number;
  /** Atraso das colcheias fracas (0–0,3): dá o balanço lo-fi. */
  swing: number;
  /** Tónica (MIDI) da melodia. */
  root: number;
  /** Escala em semitons a partir da tónica. */
  scale: number[];
  /** Progressão de 4 acordes (raiz em semitons a partir da tónica). */
  chords: Chord[];
  lead: { inst: Inst; vol: number; density: number; octave: number; max: number; echo?: boolean; rhythms: number[][] };
  bass: { inst: Inst; vol: number; base: number; pattern: [step: number, interval: number, len: number][] };
  pad?: { vol: number; base: number };
  drone?: { vol: number; midi: number };
  arp?: { vol: number; every: number; base: number };
  bells?: { vol: number; prob: number };
  sonar?: { vol: number; everyBars: number; midi: number };
  perc: PercHit[];
  /** Eco: tempo em batidas e realimentação. */
  echo?: { beats: number; feedback: number };
  /** Corte do filtro passa-baixo do ambiente (Hz). */
  cutoff: number;
}

// Ritmos da melodia em 16 semicolcheias: 1 = nota curta, 2 = nota longa, 0 = pausa.
const R = {
  A: [1, 0, 0, 0, 1, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1, 0],
  B: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 2, 0, 0, 0],
  C: [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  D: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  E: [0, 0, 1, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0],
};

const MAJ = [0, 4, 7], MIN = [0, 3, 7], MAJ7 = [0, 4, 7, 11], MIN7 = [0, 3, 7, 10];

export const STYLES: Record<StyleId, Style> = {
  // Lago de dia: calmo, leve e acolhedor. Dó maior pentatónica, I–vi–IV–V.
  lagoDia: {
    id: 'lagoDia', bpm: 84, swing: 0.12, root: 60, scale: [0, 2, 4, 7, 9],
    chords: [{ root: 0, tones: MAJ }, { root: 9, tones: MIN }, { root: 5, tones: MAJ }, { root: 7, tones: MAJ }],
    lead: { inst: 'pulse25', vol: 0.05, density: 0.85, octave: 0, max: 72, rhythms: [R.A, R.B, R.C, R.E] },
    bass: { inst: 'tri', vol: 0.09, base: 36, pattern: [[0, 0, 3], [6, 7, 2], [8, 12, 3], [12, 7, 2], [14, 0, 2]] },
    pad: { vol: 0.016, base: 48 },
    bells: { vol: 0.02, prob: 0.08 },
    perc: [2, 6, 10, 14].map(step => ({ step, inst: 'shaker' as Inst, vol: 0.012 })),
    cutoff: 5000,
  },

  // Lago de noite: mais lento e misterioso. Lá dórico, acordes de sétima, eco e sinos.
  lagoNoite: {
    id: 'lagoNoite', bpm: 66, swing: 0, root: 57, scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [{ root: 0, tones: MIN7 }, { root: 8, tones: MAJ7 }, { root: 5, tones: MIN7 }, { root: 7, tones: MIN7 }],
    lead: { inst: 'tri', vol: 0.055, density: 0.55, octave: 0, max: 69, echo: true, rhythms: [R.C, R.D, R.B] },
    bass: { inst: 'tri', vol: 0.08, base: 33, pattern: [[0, 0, 8], [8, 7, 6]] },
    pad: { vol: 0.026, base: 45 },
    bells: { vol: 0.024, prob: 0.15 },
    perc: [],
    echo: { beats: 0.75, feedback: 0.35 },
    cutoff: 2600,
  },

  // Mar de dia: mais aberto e aventureiro. Ré mixolídio, I–♭VII–IV–I, arpejos e caixa.
  marDia: {
    id: 'marDia', bpm: 92, swing: 0.05, root: 62, scale: [0, 2, 4, 5, 7, 9, 10],
    chords: [{ root: 0, tones: MAJ }, { root: 10, tones: MAJ }, { root: 5, tones: MAJ }, { root: 0, tones: MAJ }],
    lead: { inst: 'pulse12', vol: 0.045, density: 0.8, octave: 0, max: 72, rhythms: [R.A, R.B, R.E] },
    bass: { inst: 'tri', vol: 0.085, base: 38, pattern: [[0, 0, 2], [2, 0, 1], [4, 7, 2], [8, 0, 2], [10, 0, 1], [12, 7, 2], [14, 12, 2]] },
    pad: { vol: 0.012, base: 50 },
    arp: { vol: 0.016, every: 2, base: 62 },
    perc: [
      { step: 0, inst: 'kick', vol: 0.05 }, { step: 8, inst: 'kick', vol: 0.045 },
      { step: 4, inst: 'snare', vol: 0.028 }, { step: 12, inst: 'snare', vol: 0.028 },
      ...[2, 6, 10, 14].map(step => ({ step, inst: 'hat' as Inst, vol: 0.01 })),
    ],
    echo: { beats: 0.5, feedback: 0.25 },
    cutoff: 6000,
  },

  // Mar de noite: profundo e tenso. Ré frígio (o Mi♭ dá a tensão), drone grave e "ping" de sonar.
  marNoite: {
    id: 'marNoite', bpm: 60, swing: 0, root: 50, scale: [0, 1, 3, 5, 7, 8, 10],
    chords: [{ root: 0, tones: MIN }, { root: 1, tones: MAJ }, { root: 0, tones: MIN }, { root: 10, tones: MAJ }],
    lead: { inst: 'tri', vol: 0.05, density: 0.35, octave: 12, max: 70, echo: true, rhythms: [R.D, R.C] },
    bass: { inst: 'tri', vol: 0.08, base: 38, pattern: [[0, 0, 12]] },
    drone: { vol: 0.028, midi: 38 },
    sonar: { vol: 0.03, everyBars: 2, midi: 74 },
    perc: [],
    echo: { beats: 1, feedback: 0.45 },
    cutoff: 1800,
  },
};
