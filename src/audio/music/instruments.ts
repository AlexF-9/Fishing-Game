// Instrumentos chiptune / lo-fi feitos com osciladores e ruído (sem amostras).

export type Inst =
  | 'pulse25' | 'pulse12' | 'tri' | 'bell' | 'pad' | 'drone'
  | 'hat' | 'shaker' | 'snare' | 'kick' | 'sonar';

export interface Note {
  inst: Inst;
  midi: number;
  /** Duração em segundos. */
  dur: number;
  vol: number;
  /** Também manda o som para o eco do deck. */
  echo?: boolean;
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const waves = new WeakMap<AudioContext, Map<number, PeriodicWave>>();
/** Onda de pulso com o duty cycle dado (série de Fourier). */
function pulseWave(ac: AudioContext, duty: number): PeriodicWave {
  let m = waves.get(ac);
  if (!m) waves.set(ac, (m = new Map()));
  let w = m.get(duty);
  if (!w) {
    const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
    w = ac.createPeriodicWave(real, imag);
    m.set(duty, w);
  }
  return w;
}

const noiseBufs = new WeakMap<AudioContext, AudioBuffer>();
function noise(ac: AudioContext): AudioBuffer {
  let b = noiseBufs.get(ac);
  if (!b) {
    b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ac, b);
  }
  return b;
}

/** Envelope ADSR simples num GainNode. */
function env(g: AudioParam, t: number, vol: number, a: number, d: number, s: number, dur: number, r: number): number {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(vol, t + a);
  g.setTargetAtTime(vol * s, t + a, d);
  const end = t + Math.max(dur, a + 0.01);
  g.setTargetAtTime(0, end, r);
  return end + r * 5;
}

function noiseHit(ac: AudioContext, out: AudioNode, t: number, vol: number, type: BiquadFilterType, freq: number, decay: number): void {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = type === 'bandpass' ? 1.2 : 0.7;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0, t + 0.002, decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay * 6);
}

/** Agenda uma nota no instante t (segundos do AudioContext). */
export function playNote(ac: AudioContext, out: AudioNode, echo: AudioNode | null, n: Note, t: number): void {
  const f = mtof(n.midi);
  const dest = ac.createGain();
  dest.connect(out);
  if (n.echo && echo) dest.connect(echo);

  switch (n.inst) {
    case 'pulse25':
    case 'pulse12': {
      const o = ac.createOscillator();
      o.setPeriodicWave(pulseWave(ac, n.inst === 'pulse25' ? 0.25 : 0.125));
      o.frequency.value = f;
      const g = ac.createGain();
      const stop = env(g.gain, t, n.vol, 0.006, 0.08, 0.55, n.dur, 0.04);
      // vibrato suave nas notas longas (toque lo-fi)
      if (n.dur > 0.3) {
        const lfo = ac.createOscillator(), depth = ac.createGain();
        lfo.frequency.value = 5.2; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(f * 0.004, t + 0.25);
        lfo.connect(depth).connect(o.frequency); lfo.start(t); lfo.stop(stop);
      }
      o.connect(g).connect(dest); o.start(t); o.stop(stop);
      break;
    }
    case 'tri': {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ac.createGain();
      const stop = env(g.gain, t, n.vol, 0.012, 0.15, 0.7, n.dur, 0.06);
      o.connect(g).connect(dest); o.start(t); o.stop(stop);
      break;
    }
    case 'bell': {
      for (const [mul, v] of [[1, 1], [2.01, 0.25], [3.98, 0.08]] as const) {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(n.vol * v, t + 0.004);
        g.gain.setTargetAtTime(0, t + 0.004, Math.max(0.25, n.dur * 0.6) / mul);
        o.connect(g).connect(dest); o.start(t); o.stop(t + 3);
      }
      break;
    }
    case 'pad':
    case 'drone': {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = n.inst === 'drone' ? 500 : 1100;
      const g = ac.createGain();
      const atk = Math.min(1.2, n.dur * 0.35);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(n.vol, t + atk);
      g.gain.setValueAtTime(n.vol, t + n.dur - 0.05); g.gain.linearRampToValueAtTime(0, t + n.dur + 0.6);
      for (const det of [-7, 7]) {
        const o = ac.createOscillator(); o.type = n.inst === 'drone' ? 'sawtooth' : 'triangle';
        o.frequency.value = f; o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + n.dur + 0.7);
      }
      lp.connect(g).connect(dest);
      break;
    }
    case 'hat': noiseHit(ac, dest, t, n.vol, 'highpass', 7000, 0.012); break;
    case 'shaker': noiseHit(ac, dest, t, n.vol, 'bandpass', 5200, 0.022); break;
    case 'snare': {
      noiseHit(ac, dest, t, n.vol, 'bandpass', 1900, 0.045);
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      const g = ac.createGain(); g.gain.setValueAtTime(n.vol * 0.6, t); g.gain.setTargetAtTime(0, t, 0.03);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.2);
      break;
    }
    case 'kick': {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const g = ac.createGain(); g.gain.setValueAtTime(n.vol, t); g.gain.setTargetAtTime(0, t + 0.01, 0.06);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.4);
      break;
    }
    case 'sonar': {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(n.vol, t + 0.01);
      g.gain.setTargetAtTime(0, t + 0.01, 0.35);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 2.5);
      break;
    }
  }
  // liberta o nó de saída da nota quando acabar
  window.setTimeout(() => dest.disconnect(), (t - ac.currentTime + 4) * 1000);
}
