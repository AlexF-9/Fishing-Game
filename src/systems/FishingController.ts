import { AX, AY, DOCK_END, H, ROD_LEN, WATER_Y } from '../config';
import type { Fish } from '../data/fish';
import { RAR } from '../data/rarities';
import { Emitter, float, notifyState } from '../state/events';
import { cap, chooseFish, maxDist, valueMult, waitMult, zoneMult } from '../state/formulas';
import { persist, save } from '../state/save';

export type Phase = 'idle' | 'charging' | 'casting' | 'waiting' | 'bite' | 'reeling' | 'result';

export interface Reel {
  fish: Fish;
  /** Posição do marcador (0–1). */
  p: number;
  dir: 1 | -1;
  spd: number;
  /** Largura e centro da zona verde (0–1). */
  zw: number;
  zc: number;
  hits: number;
  miss: number;
  need: number;
  flash: number;
  flashCol: string;
}

export interface Landed { fish: Fish; kg: number; val: number; isNew: boolean; record: boolean }

export interface Point { x: number; y: number }

type Events = {
  cast: []; splash: []; bite: []; hit: []; miss: []; lose: []; blocked: [];
  ripple: [x: number, y: number, r: number, life: number];
  landed: [info: Landed];
  /** O anzol chegou ao fundo (mostra-se o multiplicador de sorte). */
  hookBottom: [];
};

/** Tempo (s) que o anzol demora a descer até à profundidade máxima. */
const SINK_TIME = 1.2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Regras do ciclo de pesca, sem nada de Phaser.
 * idle → charging → casting → waiting → bite → reeling → result → idle
 */
export class FishingController {
  readonly events = new Emitter<Events>();

  phase: Phase = 'idle';
  power = 0;
  /** Ângulo da cana (radianos), suavizado em direção ao alvo da fase. */
  rodA = -1.0;
  /** Relógio global para animações (avança sempre). */
  clock = 0;
  cast = { t: 0, from: { x: 0, y: 0 } as Point, tx: 0, depth: 0 };
  reel: Reel | null = null;
  /** Descida do anzol depois de a boia cair (0 = à superfície, 1 = no fundo). */
  sink = 0;

  /** Devolve true quando há uma janela aberta (o jogo fica em pausa). */
  isPaused: () => boolean = () => false;

  private chargeT = 0;
  private waitT = 0;
  private biteT = 0;

  /**
   * Deslocamento da pata em relação à pose base, posto pela GameScene a cada frame
   * (a cana acompanha o corpo quando o animal se inclina para lançar ou puxar).
   */
  pawShift: Point = { x: 0, y: 0 };

  rodBase(): Point { return { x: AX + 10 + this.pawShift.x, y: AY - 22 + this.pawShift.y }; }
  rodTip(): Point {
    const b = this.rodBase();
    return { x: b.x + Math.cos(this.rodA) * ROD_LEN, y: b.y + Math.sin(this.rodA) * ROD_LEN };
  }
  /** Onde o anzol vai cair com a força atual. */
  previewX(): number { return DOCK_END + 10 + Math.max(20, this.power * maxDist()); }

  // ---------- input ----------
  press(): void {
    if (this.isPaused()) return;
    switch (this.phase) {
      case 'idle':
        if (!save.animal) return;
        if (save.bucket.length >= cap()) {
          float('Balde cheio! Vende os peixes', AX + 20, AY - 90, '#ffd23f');
          this.events.emit('blocked');
          return;
        }
        this.phase = 'charging'; this.chargeT = 0; this.power = 0;
        break;
      case 'waiting':
        this.phase = 'idle';
        float('Cedo demais... recolheste a linha', AX + 20, AY - 85);
        break;
      case 'bite':
        this.startReel();
        break;
      case 'reeling':
        this.reelPress();
        break;
    }
  }

  release(): void {
    if (this.phase !== 'charging') return;
    const tip = this.rodTip();
    const dist = Math.max(20, this.power * maxDist());
    this.cast = { t: 0, from: { x: tip.x, y: tip.y }, tx: DOCK_END + 10 + dist, depth: dist / maxDist(5) };
    this.phase = 'casting';
    this.rodA = -0.55;
    this.events.emit('cast');
  }

  /** Cancela o lançamento em curso (ao abrir uma janela). */
  cancelCharge(): void { if (this.phase === 'charging') this.phase = 'idle'; }

  /** Fecha o cartão do peixe. */
  closeResult(): void { if (this.phase === 'result') this.phase = 'idle'; }

  /** Volta ao estado inicial (reset do save ou troca de zona). */
  resetPhase(): void { this.phase = 'idle'; this.reel = null; }

  // ---------- minijogo ----------
  private startReel(): void {
    const f = chooseFish(this.cast.depth);
    const rr = RAR[f.r];
    const zw = Math.min(0.6, rr.zone * zoneMult());
    this.reel = {
      fish: f, p: 0, dir: 1, spd: 0.7 * rr.speed, zw, zc: zw / 2 + Math.random() * (1 - zw),
      hits: 0, miss: 0, need: f.r >= 3 ? 4 : 3, flash: 0, flashCol: '',
    };
    this.phase = 'reeling';
    this.events.emit('hit');
    if (f.r >= 3) float('Algo GRANDE mordeu!', this.cast.tx, WATER_Y - 30, rr.color);
  }

  private reelPress(): void {
    const r = this.reel!;
    if (Math.abs(r.p - r.zc) <= r.zw / 2) {
      r.hits++; r.flash = 0.25; r.flashCol = '#7be07b';
      this.events.emit('hit');
      this.events.emit('ripple', this.cast.tx, WATER_Y + 2, 2, 1);
      if (r.hits >= r.need) { this.landFish(); return; }
      let nz: number;
      do { nz = r.zw / 2 + Math.random() * (1 - r.zw); } while (Math.abs(nz - r.zc) < 0.2);
      r.zc = nz; r.spd *= 1.08;
    } else {
      r.miss++; r.flash = 0.25; r.flashCol = '#ff6b6b';
      this.events.emit('miss');
      if (r.miss >= 3) {
        this.phase = 'idle'; this.reel = null;
        float('O peixe fugiu!', this.cast.tx - 30, WATER_Y - 35, '#ffb3b3');
        this.events.emit('lose');
      }
    }
  }

  private landFish(): void {
    const f = this.reel!.fish;
    this.reel = null;
    const t = Math.pow(Math.random(), 1.6);
    const kg = +(f.min + (f.max - f.min) * t).toFixed(1);
    const val = Math.max(1, Math.round(f.value * (0.75 + 0.6 * t) * valueMult()));
    const isNew = !save.book[f.id];
    if (isNew) save.book[f.id] = { n: 0, best: 0 };
    const record = !isNew && kg > save.book[f.id].best;
    save.book[f.id].n++;
    save.book[f.id].best = Math.max(save.book[f.id].best, kg);
    save.bucket.push({ id: f.id, kg, v: val });
    persist();
    notifyState();
    this.phase = 'result';
    this.events.emit('landed', { fish: f, kg, val, isNew, record });
  }

  // ---------- ciclo ----------
  update(dt: number): void {
    this.clock += dt;
    if (this.isPaused()) return; // pausa enquanto há janelas abertas

    // o anzol desce até ao fundo enquanto a linha está na água
    if (this.phase === 'waiting' || this.phase === 'bite' || this.phase === 'reeling') {
      const before = this.sink;
      this.sink = this.phase === 'waiting' ? Math.min(1, this.sink + dt / SINK_TIME) : 1;
      if (before < 1 && this.sink >= 1) this.events.emit('hookBottom');
    }

    let target = -1.0;
    switch (this.phase) {
      case 'charging':
        this.chargeT += dt * 1.1;
        this.power = 1 - Math.abs((this.chargeT % 2) - 1);
        target = -1.0 - this.power * 0.85;
        break;
      case 'casting':
        target = -0.55;
        this.cast.t += dt / 0.7;
        if (this.cast.t >= 1) {
          this.cast.t = 1;
          this.phase = 'waiting';
          this.waitT = (2.5 + Math.random() * 4) * waitMult();
          this.sink = 0;
          this.events.emit('ripple', this.cast.tx, WATER_Y + 2, 2, 1);
          this.events.emit('splash');
        }
        break;
      case 'waiting':
        target = -0.7;
        this.waitT -= dt;
        if (this.waitT <= 0) {
          this.phase = 'bite'; this.biteT = 1.0;
          this.events.emit('bite');
          this.events.emit('ripple', this.cast.tx, WATER_Y + 2, 1.5, 0.8);
        }
        break;
      case 'bite':
        target = -0.55;
        this.biteT -= dt;
        if (this.biteT <= 0) {
          this.phase = 'idle';
          float('Foste lento... fugiu!', this.cast.tx - 30, WATER_Y - 35, '#ffb3b3');
          this.events.emit('lose');
        }
        break;
      case 'reeling': {
        const r = this.reel!;
        target = -0.45 + Math.sin(this.clock * 18) * 0.06;
        r.p += r.dir * r.spd * dt;
        if (r.p > 1) { r.p = 1; r.dir = -1; }
        if (r.p < 0) { r.p = 0; r.dir = 1; }
        r.flash = Math.max(0, r.flash - dt);
        break;
      }
    }
    this.rodA += (target - this.rodA) * Math.min(1, dt * (this.phase === 'casting' ? 25 : 10));
  }

  /** Profundidade máxima do anzol (y) para este lançamento: mais longe = mais fundo. */
  hookBottomY(): number { return WATER_Y + 12 + this.cast.depth * (H - WATER_Y - 32); }

  /** Posição do anzol debaixo de água, ou null. Sobe com os acertos no minijogo. */
  hookPos(): Point | null {
    if (!['waiting', 'bite', 'reeling'].includes(this.phase)) return null;
    const eased = 1 - Math.pow(1 - this.sink, 3);
    let y = WATER_Y + 3 + (this.hookBottomY() - WATER_Y - 3) * eased;
    if (this.phase === 'reeling' && this.reel) y -= (y - WATER_Y - 6) * (this.reel.hits / this.reel.need);
    const sway = this.phase === 'bite' ? Math.sin(this.clock * 35) * 1.5 : Math.sin(this.clock * 1.7) * 0.8;
    return { x: this.cast.tx + sway, y };
  }

  /** Posição da boia, ou null quando a linha está recolhida. */
  bobberPos(): Point | null {
    const c = this.clock, ct = this.cast;
    switch (this.phase) {
      case 'casting': {
        const end = { x: ct.tx, y: WATER_Y + 1 };
        return { x: lerp(ct.from.x, end.x, ct.t), y: lerp(ct.from.y, end.y, ct.t) - Math.sin(Math.PI * ct.t) * 65 };
      }
      case 'waiting': return { x: ct.tx, y: WATER_Y + 1 + Math.sin(c * 3) };
      case 'bite':    return { x: ct.tx + Math.sin(c * 40), y: WATER_Y + 4 + Math.sin(c * 30) * 1.5 };
      case 'reeling': return { x: ct.tx + Math.round((Math.random() - 0.5) * 2), y: WATER_Y + 2 + Math.sin(c * 20) * 1.5 };
      default: return null;
    }
  }
}

/** Instância única partilhada pelas cenas e pela UI. */
export const fishing = new FishingController();
