import { DAY_SECONDS } from '../config';
import { darkness } from '../state/formulas';
import { save } from '../state/save';

export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/** Mistura duas cores '#rrggbb'. */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
export const hex = (c: string) => parseInt(c.slice(1), 16);

/** Avança o relógio do dia (um dia = 4 minutos). */
export function advanceTime(dt: number): void {
  save.time = (save.time + dt / DAY_SECONDS) % 1;
}

/** Intensidade do pôr/nascer do sol (0–1). */
export function duskAmount(t = save.time): number {
  return Math.min(1, Math.max(0, 1 - Math.abs(t - 0.62) / 0.06) + Math.max(0, 1 - Math.abs(t - 0.95) / 0.04));
}

export function skyColors(): { top: string; bottom: string } {
  const d = darkness();
  return {
    top: mixColor('#5fb4e8', '#0b1430', d),
    bottom: mixColor(mixColor('#c4e8f7', '#f7a46b', duskAmount()), '#2a3866', d),
  };
}

export function waterColors(mar: boolean): { top: string; bottom: string } {
  const d = darkness();
  return {
    top: mixColor(mar ? '#2a6fae' : '#4aa8cf', mar ? '#0d1d3a' : '#173048', d),
    bottom: mixColor(mar ? '#0a2448' : '#1d5a85', mar ? '#040a18' : '#0a1522', d),
  };
}

/** Posição do sol (k 0–1 ao longo do arco), ou null se não estiver visível. */
export function sunArc(): number | null {
  const t = save.time;
  if (t < 0.68) return t / 0.68;
  if (t > 0.9) return 0;
  return null;
}
export function moonArc(): number {
  const t = save.time;
  return t >= 0.6 ? (t - 0.6) / 0.4 : 0;
}
