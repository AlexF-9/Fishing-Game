import { FISH, type Fish } from '../data/fish';
import { PixelCanvas, rng, shade } from './pixel';

// Os 18 peixes em pixel art. Todos cabem numa tela de 40×24, virados para a direita.
export const FISH_W = 40;
export const FISH_H = 24;
export const SIL_COLOR = '#3a4c60';

const OUTLINE = '#1c1a26';
const EYE = '#111111';

interface BodySpec { cx: number; cy: number; rx: number; ry: number; back: string; side: string; belly: string }

/** Corpo oval com três tons: dorso, flanco e barriga. */
function body(p: PixelCanvas, b: BodySpec): void {
  for (let y = Math.floor(b.cy - b.ry); y <= Math.ceil(b.cy + b.ry); y++)
    for (let x = Math.floor(b.cx - b.rx); x <= Math.ceil(b.cx + b.rx); x++) {
      const dx = (x - b.cx) / (b.rx + 0.35), dy = (y - b.cy) / (b.ry + 0.35);
      if (dx * dx + dy * dy > 1) continue;
      const rel = (y - b.cy) / b.ry;
      p.px(x, y, rel < -0.4 ? b.back : rel > 0.45 ? b.belly : b.side);
    }
}
/** Só pinta onde já há corpo. */
function on(p: PixelCanvas, x: number, y: number, c: string): void { if (p.opaque(x, y)) p.px(x, y, c); }

function eye(p: PixelCanvas, x: number, y: number, big = false): void {
  if (big) { p.rect(x - 1, y - 1, 3, 3, '#ffffff'); p.rect(x, y, 2, 2, EYE); }
  else { p.rect(x, y, 2, 2, EYE); p.px(x, y, '#ffffff'); }
}
function gill(p: PixelCanvas, b: BodySpec): void {
  const x = Math.round(b.cx + b.rx * 0.45), h = Math.max(1, Math.round(b.ry * 0.45));
  for (let y = -h; y <= h; y++) on(p, x - (Math.abs(y) === h ? 1 : 0), b.cy + y, shade(b.side, -0.3));
}
function mouth(p: PixelCanvas, b: BodySpec): void {
  p.px(Math.round(b.cx + b.rx), b.cy + 1, shade(b.side, -0.45));
  p.px(Math.round(b.cx + b.rx) - 1, b.cy + 1, shade(b.side, -0.45));
}
/** Cauda em leque (x = ligação ao corpo). */
function tailFan(p: PixelCanvas, x: number, cy: number, len: number, h: number, c: string): void {
  p.poly([x + 1, cy - 1, x - len, cy - h, x - len + 2, cy, x - len, cy + h, x + 1, cy + 1], c);
  for (let i = 1; i < len - 1; i += 2) p.px(x - i, cy, shade(c, -0.2));
}
/** Cauda bifurcada (atuns, cavalas, espadas). */
function tailFork(p: PixelCanvas, x: number, cy: number, len: number, h: number, c: string): void {
  p.poly([x + 1, cy, x - len, cy - h, x - len + 3, cy - h + 1, x - 2, cy], c);
  p.poly([x + 1, cy, x - len, cy + h, x - len + 3, cy + h - 1, x - 2, cy], c);
  p.rect(x - 3, cy - 1, 4, 3, c);
}
function dorsal(p: PixelCanvas, x0: number, x1: number, base: number, h: number, c: string, spiky = false): void {
  if (!spiky) { p.poly([x0, base + 1, x0 + (x1 - x0) * 0.35, base - h, x1, base + 1], c); return; }
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0), top = Math.round(base - h * Math.sin(Math.PI * Math.min(1, t * 1.2)) * ((x - x0) % 2 ? 0.6 : 1));
    for (let y = top; y <= base; y++) p.px(x, y, c);
  }
}
function finBelow(p: PixelCanvas, x: number, y: number, c: string): void {
  p.poly([x, y, x - 4, y + 3, x - 1, y], c);
}

// ---------------- espécies ----------------

type Painter = (p: PixelCanvas, f: Fish) => void;

const PAINT: Record<string, Painter> = {
  bota(p) {
    const leather = '#6b4a2b', dark = '#3f2a17', lace = '#e8dcc4';
    // alga a sair da bota
    for (let y = 0; y < 8; y++) p.px(17 + Math.round(Math.sin(y / 1.5) * 1.5), y, y % 3 ? '#3f8f4e' : '#5fae5a');
    p.rect(12, 4, 9, 13, leather);
    p.rect(12, 4, 9, 1, shade(leather, 0.2));
    p.poly([12, 15, 29, 15, 31, 18, 31, 20, 12, 20], leather);
    p.rect(12, 20, 20, 2, dark);
    p.rect(21, 16, 7, 1, shade(leather, 0.15));
    for (let y = 6; y < 15; y += 2) { p.px(14, y, lace); p.px(18, y, lace); p.px(15, y + 1, lace); p.px(17, y + 1, lace); p.px(16, y + 1, lace); }
    p.rect(25, 18, 2, 2, '#2a1a0e'); // buraco
    p.px(13, 12, shade(leather, -0.3)); p.px(19, 9, shade(leather, -0.3));
  },

  prateado(p) {
    const b = { cx: 22, cy: 12, rx: 9, ry: 4, back: '#7f93a6', side: '#b9c6d2', belly: '#e6eef4' };
    tailFork(p, 13, 12, 6, 4, '#8fa2b4');
    dorsal(p, 18, 24, 8, 3, '#8fa2b4');
    body(p, b);
    for (let x = 16; x < 28; x++) on(p, x, 12, x % 3 ? '#ffffff' : '#dbe6ef');
    gill(p, b); mouth(p, b); eye(p, 27, 10);
  },

  carpa(p) {
    const b = { cx: 21, cy: 12, rx: 12, ry: 6, back: '#9a7a2e', side: '#c9a14a', belly: '#ecd59a' };
    tailFan(p, 10, 12, 8, 6, '#b08a38');
    dorsal(p, 14, 26, 7, 4, '#9a7a2e');
    body(p, b);
    for (let y = 7; y < 17; y++) for (let x = 11; x < 30; x++) if ((x + y * 2) % 4 === 0 && y < 15) on(p, x, y, shade('#c9a14a', -0.15));
    finBelow(p, 22, 17, '#b08a38');
    gill(p, b); mouth(p, b); eye(p, 28, 10);
    p.px(33, 14, '#7a5f22'); p.px(34, 15, '#7a5f22'); // barbilho
  },

  perca(p) {
    const fin = '#f08a3c';
    const b = { cx: 21, cy: 12, rx: 11, ry: 6, back: '#4f6d1c', side: '#a8c44f', belly: '#e9efc0' };
    tailFan(p, 11, 12, 7, 5, fin);
    dorsal(p, 12, 27, 7, 5, '#5f7f24', true);
    body(p, b);
    for (const sx of [14, 18, 22, 26]) for (let y = 5; y < 16; y++) { on(p, sx, y, '#3f5a16'); on(p, sx + 1, y, '#4f6d1c'); }
    finBelow(p, 20, 17, fin); finBelow(p, 26, 16, fin);
    gill(p, b); mouth(p, b); eye(p, 28, 10);
  },

  truta(p) {
    const b = { cx: 21, cy: 12, rx: 13, ry: 5, back: '#4f8a7a', side: '#c9d8d0', belly: '#f3f0ea' };
    tailFan(p, 9, 12, 7, 5, '#6fa7c9');
    dorsal(p, 15, 23, 8, 3, '#5f9a8a');
    body(p, b);
    for (let x = 9; x < 34; x++) { on(p, x, 12, '#f4b3c6'); on(p, x, 11, '#e77fa0'); on(p, x, 13, '#e77fa0'); }
    const r = rng(42);
    for (let i = 0; i < 14; i++) on(p, 10 + Math.floor(r() * 22), 7 + Math.floor(r() * 4), '#1e3a33');
    finBelow(p, 20, 16, '#e7a1b6');
    gill(p, b); mouth(p, b); eye(p, 29, 10);
  },

  lucio(p) {
    const b = { cx: 20, cy: 12, rx: 16, ry: 4, back: '#3f5a2a', side: '#6f8f4e', belly: '#d8dfb0' };
    tailFan(p, 5, 12, 5, 5, '#4f6d34');
    dorsal(p, 7, 12, 8, 4, '#4f6d34');
    finBelow(p, 11, 16, '#4f6d34');
    body(p, b);
    for (let y = 9; y < 15; y += 2) for (let x = 7 + (y % 4); x < 30; x += 4) on(p, x, y, '#c8d89a');
    p.rect(30, 13, 6, 1, '#2f4520'); // maxilar comprido
    gill(p, b); eye(p, 31, 10);
  },

  lua(p) {
    const b = { cx: 20, cy: 12, rx: 9, ry: 8, back: '#8fa4e6', side: '#d9e4ff', belly: '#f2f6ff' };
    p.poly([16, 5, 19, -1, 24, 5], '#8fa4e6');
    p.poly([16, 19, 19, 24, 24, 19], '#8fa4e6');
    tailFan(p, 12, 12, 4, 4, '#a9baf0');
    body(p, b);
    // crescente dourado no flanco
    for (const [x, y] of [[17, 9], [16, 10], [16, 11], [16, 12], [17, 13], [18, 14], [18, 8]]) on(p, x, y, '#fff3a8');
    on(p, 19, 11, '#ffffff'); on(p, 22, 14, '#ffffff');
    mouth(p, b); eye(p, 25, 10, true);
    // estrelinhas à volta
    for (const [x, y] of [[4, 3], [35, 4], [33, 20], [6, 19]]) { p.px(x, y, '#fff3a8'); p.px(x - 1, y, '#c9d4ff'); p.px(x + 1, y, '#c9d4ff'); p.px(x, y - 1, '#c9d4ff'); p.px(x, y + 1, '#c9d4ff'); }
  },

  enguia(p) {
    const c = '#3c5a7a', belly = '#6f90b0';
    const yAt = (x: number) => 12 + Math.sin(x / 4.5) * 3;
    for (let x = 4; x <= 33; x++) {
      const r = x < 10 ? 1 + (x - 4) / 6 : x > 30 ? 3 : 2.2;
      p.circle(x, yAt(x), r, c);
    }
    p.circle(34, yAt(34), 3, c);
    for (let x = 6; x <= 33; x++) on(p, x, Math.round(yAt(x)) + 2, belly);
    // relâmpagos amarelos
    for (const x0 of [10, 18, 26]) {
      const y0 = Math.round(yAt(x0));
      p.px(x0, y0 - 1, '#ffe14d'); p.px(x0 + 1, y0, '#ffe14d'); p.px(x0, y0 + 1, '#ffe14d'); p.px(x0 + 1, y0 + 2, '#ffe14d');
    }
    eye(p, 34, Math.round(yAt(34)) - 2);
    p.px(37, Math.round(yAt(34)) + 1, '#1c2a3a');
    // faíscas por fora
    for (const [x, y] of [[8, 4], [23, 3], [30, 20], [15, 21]]) { p.px(x, y, '#ffe14d'); p.px(x + 1, y + 1, '#fff6a8'); }
  },

  koi(p) {
    const b = { cx: 22, cy: 12, rx: 12, ry: 6, back: '#fff4e6', side: '#fff4e6', belly: '#ffffff' };
    // cauda longa e esvoaçante
    p.poly([11, 11, 2, 4, 0, 9, 4, 12, 0, 16, 2, 21, 11, 14], '#ffb627');
    for (let i = 0; i < 6; i++) p.px(4 + i, 8 + (i % 2), '#ffd67a');
    dorsal(p, 15, 27, 7, 4, '#ff8a3c');
    body(p, b);
    p.ellipse(16, 10, 4, 3, '#ff5e2b'); p.ellipse(24, 9, 3, 2, '#ffb627'); p.ellipse(21, 14, 3, 2, '#ff5e2b');
    p.ellipse(29, 10, 2, 2, '#ff5e2b');
    // remove o que saiu do corpo (redesenha a barriga onde ficou fora)
    finBelow(p, 21, 17, '#ffb627');
    on(p, 18, 9, '#ffe9a0'); on(p, 25, 8, '#ffe9a0');
    gill(p, b); mouth(p, b); eye(p, 30, 10);
    p.px(34, 14, '#c97a2a'); p.px(35, 15, '#c97a2a');
  },

  rei(p) {
    const gold = '#d4af37', goldL = '#ffe28a';
    const b = { cx: 21, cy: 14, rx: 14, ry: 7, back: '#1f4f43', side: '#2f6f5f', belly: '#a8c79a' };
    tailFan(p, 8, 14, 7, 7, gold);
    dorsal(p, 12, 26, 8, 4, gold, true);
    body(p, b);
    for (const sx of [13, 19, 25]) for (let y = 7; y < 22; y++) { on(p, sx, y, gold); on(p, sx + 1, y, shade(gold, -0.2)); }
    finBelow(p, 21, 20, gold);
    gill(p, b); mouth(p, b); eye(p, 30, 12, true);
    // coroa
    p.rect(26, 4, 9, 3, gold);
    for (const x of [26, 30, 34]) { p.px(x, 3, gold); p.px(x, 2, gold); }
    p.px(28, 3, gold); p.px(32, 3, gold);
    p.rect(26, 4, 9, 1, goldL);
    p.px(30, 5, '#e84040'); p.px(27, 5, '#4fa3ff'); p.px(33, 5, '#4fa3ff');
  },

  cavala(p) {
    const b = { cx: 22, cy: 12, rx: 12, ry: 4, back: '#2f5c80', side: '#9ec2dc', belly: '#e8f2f8' };
    tailFork(p, 11, 12, 7, 6, '#2f5c80');
    dorsal(p, 17, 22, 8, 3, '#2f5c80');
    for (let x = 12; x < 16; x += 2) { p.px(x, 7 + (x % 3 ? 1 : 0), '#2f5c80'); p.px(x, 17 - (x % 3 ? 1 : 0), '#2f5c80'); }
    body(p, b);
    for (let x = 11; x < 32; x++) for (let y = 8; y < 12; y++) if ((x + Math.round(Math.sin(y * 1.4) * 2)) % 4 === 0) on(p, x, y, '#1a3a56');
    gill(p, b); mouth(p, b); eye(p, 29, 10);
  },

  robalo(p) {
    const b = { cx: 21, cy: 12, rx: 13, ry: 6, back: '#5c6b78', side: '#9aa8b4', belly: '#dfe5ea' };
    tailFan(p, 9, 12, 7, 5, '#7c8a96');
    dorsal(p, 12, 19, 7, 5, '#6c7a86', true);
    dorsal(p, 20, 27, 7, 3, '#6c7a86');
    body(p, b);
    for (let x = 9; x < 31; x++) on(p, x, 10, '#4c5a66');
    finBelow(p, 21, 17, '#7c8a96');
    gill(p, b); eye(p, 29, 9);
    p.rect(31, 13, 4, 1, '#3c4852'); // boca grande
  },

  polvo(p) {
    const c = '#d9605a', d = '#a83a35', light = '#f2a29c';
    for (let i = 0; i < 6; i++) {
      const x0 = 12 + i * 3;
      for (let y = 12; y < 23; y++) {
        const x = x0 + Math.round(Math.sin((y - 12) / 2.5 + i) * 1.5) + Math.round((i - 2.5) * (y - 12) * 0.12);
        p.rect(x, y, y < 18 ? 2 : 1, 1, c);
        if (y % 2 === 0 && y < 21) p.px(x + (y < 18 ? 1 : 0), y, light);
      }
    }
    p.ellipse(20, 8, 9, 7, c);
    p.ellipse(19, 6, 5, 3, shade(c, 0.15));
    for (const [x, y] of [[15, 5], [24, 4], [22, 9], [13, 9]]) on(p, x, y, d);
    eye(p, 16, 9, true); eye(p, 23, 9, true);
  },

  lanterna(p) {
    const b = { cx: 20, cy: 14, rx: 11, ry: 7, back: '#1e2240', side: '#2a2f4f', belly: '#3a4068' };
    tailFan(p, 9, 14, 5, 5, '#2a2f4f');
    body(p, b);
    // boca enorme com dentes
    p.poly([25, 15, 32, 13, 32, 19, 25, 17], '#0e0f1c');
    for (const x of [27, 29, 31]) { p.px(x, 14, '#ffffff'); p.px(x - 1, 18, '#ffffff'); }
    eye(p, 25, 10, true);
    // haste e isco luminoso
    for (let t = 0; t <= 1; t += 0.08) {
      const x = 22 + t * 12, y = 7 - Math.sin(Math.PI * t) * 6 + t * 1;
      p.px(x, y, '#5e6690');
    }
    p.circle(34, 8, 2, '#7ef0ff');
    p.px(34, 7, '#ffffff');
    for (const [x, y] of [[37, 8], [34, 11], [31, 6], [36, 5]]) p.px(x, y, '#b8faff', 0.7);
    for (const [x, y] of [[13, 12], [17, 16], [21, 11]]) on(p, x, y, '#7ef0ff');
  },

  espada(p) {
    const b = { cx: 17, cy: 13, rx: 11, ry: 4, back: '#4f7aa0', side: '#7aa0c4', belly: '#e0ecf5' };
    tailFork(p, 7, 13, 6, 6, '#3f6a92');
    // vela dorsal alta
    p.poly([9, 10, 13, 1, 18, 2, 24, 10], '#3f6a92');
    for (let x = 12; x < 22; x += 3) p.line(x, 9, x + 1, 3, '#5f8ab2');
    body(p, b);
    p.rect(27, 12, 3, 2, '#c0d4e6');
    p.rect(30, 12, 9, 1, '#c0d4e6');
    p.px(39, 12, '#ffffff');
    gill(p, b); eye(p, 24, 11);
  },

  martelo(p) {
    const b = { cx: 18, cy: 13, rx: 13, ry: 5, back: '#55616c', side: '#7d8a96', belly: '#e6e9ec' };
    // cauda assimétrica
    p.poly([6, 12, 0, 3, 3, 3, 8, 12], '#55616c');
    p.poly([6, 14, 1, 19, 4, 19, 8, 14], '#55616c');
    p.poly([14, 9, 18, 1, 22, 9], '#55616c'); // barbatana dorsal
    body(p, b);
    p.poly([18, 17, 14, 22, 21, 17], '#6c7884');
    // cabeça em martelo
    p.rect(30, 7, 4, 13, '#7d8a96');
    p.rect(30, 7, 4, 2, '#55616c');
    p.rect(33, 7, 1, 13, '#6c7884');
    eye(p, 31, 7); eye(p, 31, 18);
    for (const x of [24, 26, 28]) { on(p, x, 12, '#45505a'); on(p, x, 13, '#45505a'); }
  },

  cristal(p) {
    const base = '#62d6f2', light = '#bff4ff', dark = '#3aa8c8';
    p.poly([4, 7, 10, 12, 4, 17], light); // cauda de cristal
    p.poly([9, 12, 20, 2, 33, 12, 20, 22], base);
    p.poly([9, 12, 20, 2, 20, 12], light);
    p.poly([20, 12, 33, 12, 20, 22], dark);
    p.line(12, 12, 20, 4, '#ffffff'); p.line(20, 2, 20, 21, '#9eeaff');
    p.line(9, 12, 33, 12, '#9eeaff');
    eye(p, 26, 9);
    for (const [x, y] of [[6, 3], [35, 5], [32, 19], [12, 20]]) { p.px(x, y, '#ffffff'); p.px(x - 1, y, light); p.px(x + 1, y, light); p.px(x, y - 1, light); p.px(x, y + 1, light); }
  },

  lula(p) {
    const c = '#e07aa0', d = '#a8406b', light = '#f4b3ca';
    // tentáculos para a frente
    for (let i = 0; i < 6; i++) {
      const y0 = 9 + i * 1.3;
      for (let x = 27; x < 37 + (i === 1 || i === 4 ? 3 : 0); x++) p.px(x, Math.round(y0 + Math.sin(x / 2 + i) * 1.2 + (i - 2.5) * (x - 27) * 0.12), c);
    }
    // manto comprido com barbatanas na ponta
    p.poly([2, 12, 8, 5, 11, 12, 8, 19], d);
    p.poly([6, 12, 24, 6, 28, 9, 28, 15, 24, 18], c);
    p.poly([6, 12, 24, 6, 24, 10], light);
    for (const [x, y] of [[12, 11], [16, 13], [20, 9], [19, 15], [14, 9]]) on(p, x, y, d);
    eye(p, 25, 10, true);
  },
};

/** Desenha um peixe (ou a sua silhueta "???"). */
export function drawFish(f: Fish, sil = false): PixelCanvas {
  const p = new PixelCanvas(FISH_W, FISH_H);
  (PAINT[f.id] ?? PAINT.carpa)(p, f);
  p.outline(OUTLINE);
  if (sil) p.silhouette(SIL_COLOR);
  return p;
}

export const fishKey = (id: string) => `fish_${id}`;
export const ALL_FISH = FISH;
