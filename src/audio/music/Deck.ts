import { composeBar, composeReelStep, newPhrase, seeded, type PhraseState, type Timed } from './composer';
import { playNote } from './instruments';
import type { Style } from './styles';

/**
 * Um "deck" toca um ambiente com o seu próprio andamento e relógio.
 * Nas transições há dois decks ao mesmo tempo: o antigo a desvanecer e o novo a entrar.
 * As notas são agendadas com ~0,2 s de antecedência (lookahead), por isso o ritmo
 * não depende da taxa de fotogramas do jogo.
 */
export class Deck {
  readonly out: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly echoIn: GainNode | null = null;
  private readonly reelGain: GainNode;
  private readonly reelFilter: BiquadFilterNode;

  /** Semicolcheia global desde o início do deck. */
  private step = 0;
  private nextTime: number;
  private barNotes: Timed[] = [];
  private phrase: PhraseState;
  private readonly rng: () => number;

  /** Até quando (tempo do AudioContext) a camada do minijogo continua a gerar notas. */
  private reelUntil = 0;
  reelOn = false;
  /** 0–1, fração de acertos no minijogo. */
  tension = 0;
  /** O deck pára de agendar a partir daqui (fim do fade-out). */
  stopAt: number | null = null;

  constructor(private readonly ac: AudioContext, dest: AudioNode, readonly style: Style, startAt: number, fadeIn: number) {
    this.rng = seeded(Math.floor(Math.random() * 1e9));
    this.phrase = newPhrase(style, this.rng);
    this.nextTime = startAt;

    this.out = ac.createGain();
    this.out.gain.setValueAtTime(0, ac.currentTime);
    this.out.gain.setValueAtTime(0, startAt);
    this.out.gain.linearRampToValueAtTime(1, startAt + fadeIn);
    this.out.connect(dest);

    this.filter = ac.createBiquadFilter();
    this.filter.type = 'lowpass'; this.filter.frequency.value = style.cutoff; this.filter.Q.value = 0.6;
    this.filter.connect(this.out);

    if (style.echo) {
      const delay = ac.createDelay(2);
      delay.delayTime.value = (60 / style.bpm) * style.echo.beats;
      const fb = ac.createGain(); fb.gain.value = style.echo.feedback;
      const wet = ac.createGain(); wet.gain.value = 0.35;
      const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1800;
      this.echoIn = ac.createGain();
      this.echoIn.connect(delay);
      delay.connect(tone).connect(fb).connect(delay);
      tone.connect(wet).connect(this.filter);
    }

    this.reelFilter = ac.createBiquadFilter();
    this.reelFilter.type = 'lowpass'; this.reelFilter.frequency.value = 900;
    this.reelGain = ac.createGain(); this.reelGain.gain.value = 0;
    this.reelFilter.connect(this.reelGain).connect(this.filter);
  }

  get stepDur(): number { return 60 / this.style.bpm / 4; }
  get barDur(): number { return this.stepDur * 16; }
  get bar(): number { return Math.floor(this.step / 16); }

  /** Instante do próximo limite de `bars` compassos (para trocar ambiente "em compasso"). */
  nextBoundary(bars: number): number {
    const stepsPer = bars * 16;
    const target = Math.ceil(this.step / stepsPer) * stepsPer;
    return this.nextTime + (target - this.step) * this.stepDur;
  }

  /** Desvanece a partir de `at` durante `dur` segundos e depois pára. */
  fadeOut(at: number, dur: number): void {
    const g = this.out.gain, now = this.ac.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setValueAtTime(g.value, Math.max(now + 0.05, at)); // mantém o volume até ao limite do compasso
    g.linearRampToValueAtTime(0, Math.max(now + 0.05, at) + dur);
    this.stopAt = Math.max(now + 0.05, at) + dur;
  }

  /** Liga/desliga a camada do minijogo (só muda no tempo seguinte, para entrar a tempo). */
  setReel(on: boolean, tension: number): void {
    this.tension = tension;
    this.reelFilter.frequency.setTargetAtTime(700 + tension * 2600, this.ac.currentTime, 0.2);
    if (on === this.reelOn) return;
    this.reelOn = on;
    const beat = this.stepDur * 4;
    const t = this.nextBoundaryStep(4);
    const g = this.reelGain.gain;
    g.cancelScheduledValues(this.ac.currentTime);
    g.setValueAtTime(g.value, this.ac.currentTime);
    if (on) {
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(1, t + beat / 2);
      this.reelUntil = Infinity;
    } else {
      // volta ao normal suavemente: um compasso inteiro de saída
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + this.barDur);
      this.reelUntil = t + this.barDur;
    }
  }
  private nextBoundaryStep(steps: number): number {
    const target = Math.ceil(this.step / steps) * steps;
    return this.nextTime + (target - this.step) * this.stepDur;
  }

  /** Agenda tudo o que cai antes de `until`. Devolve false quando o deck acabou. */
  schedule(until: number): boolean {
    while (this.nextTime < until) {
      if (this.stopAt !== null && this.nextTime >= this.stopAt) return false;
      const s = this.step % 16;
      if (s === 0) {
        if (this.bar % 4 === 0) this.phrase = newPhrase(this.style, this.rng);
        this.barNotes = composeBar(this.style, this.bar, this.phrase, this.rng, this.stepDur);
      }
      // swing: atrasa as colcheias fracas
      const swing = s % 4 === 2 ? this.style.swing * this.stepDur * 2 : 0;
      const t = this.nextTime + swing;
      for (const n of this.barNotes) if (n.step === s) playNote(this.ac, this.filter, this.echoIn, n.note, t);
      if (this.nextTime < this.reelUntil) {
        for (const n of composeReelStep(this.style, this.bar, s, this.tension, this.stepDur)) playNote(this.ac, this.reelFilter, null, n, t);
      }
      this.nextTime += this.stepDur;
      this.step++;
    }
    return this.stopAt === null || this.ac.currentTime < this.stopAt + 1;
  }

  dispose(): void { this.out.disconnect(); }
}
