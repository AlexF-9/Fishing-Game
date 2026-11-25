import { AY, DOCK_END, W, WATER_Y, WORLD_H } from '../config';
import { PixelCanvas, rng, shade } from './pixel';

// Cenários em pixel art. As coordenadas das texturas estão pensadas para o mundo de 480×300.

const WOOD = '#9a6a3c', WOOD_L = '#c0894f', WOOD_D = '#6b4526', WOOD_DD = '#4a2e14';

// ---------- Lago ----------

/** Colinas ao longe (base na linha da água). */
export function hillsFar(): PixelCanvas {
  const h = 46, p = new PixelCanvas(W, h), r = rng(7);
  const base = '#7cb874', top = '#9bd08e';
  for (let x = 0; x < W; x++) {
    const y = Math.round(h - 22 - Math.sin(x / 70) * 12 - Math.sin(x / 23 + 1) * 4);
    for (let j = y; j < h; j++) p.px(x, j, base);
    p.px(x, y, top);
    if (x % 2 === 0) p.px(x, y + 1, top);
  }
  // árvores redondas ao longe
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W);
    const y = Math.round(h - 22 - Math.sin(x / 70) * 12 - Math.sin(x / 23 + 1) * 4) + 2;
    p.circle(x, y, 2 + Math.round(r()), '#5f9e5a');
  }
  return p;
}

export function hillsNear(): PixelCanvas {
  const h = 26, p = new PixelCanvas(W, h), r = rng(11);
  const base = '#4f8f55', top = '#6fae6a', dot = '#3f7a46';
  for (let x = 0; x < W; x++) {
    const y = Math.round(h - 10 - Math.sin(x / 40 + 2) * 6 - Math.sin(x / 13) * 2);
    for (let j = y; j < h; j++) p.px(x, j, base);
    p.px(x, y, top);
  }
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(r() * W), y = Math.floor(h - r() * 10);
    if (p.opaque(x, y - 1)) p.px(x, y, dot);
  }
  // margem de areia junto à água
  for (let x = 0; x < W; x++) { p.px(x, h - 1, '#c9b27a'); if (x % 3) p.px(x, h - 2, '#b39b63'); }
  return p;
}

/** Pinheiro (big = maior). Base do tronco ao centro em baixo. */
export function pine(big: boolean): PixelCanvas {
  const w = big ? 17 : 13, h = big ? 36 : 26, p = new PixelCanvas(w, h);
  const cx = Math.floor(w / 2);
  const dark = '#2f5f3a', mid = '#3f7a46', light = '#5c9a5a';
  p.rect(cx - 1, h - 5, 3, 5, '#5a3a1e');
  const layers = big ? 4 : 3;
  for (let i = 0; i < layers; i++) {
    const top = 1 + i * (big ? 7 : 6), bot = top + (big ? 12 : 10), half = 3 + i * 2;
    p.poly([cx + 0.5, top, cx - half, bot, cx + half + 1, bot], dark);
    p.poly([cx + 0.5, top + 1, cx - half + 1, bot - 1, cx + 0.5, bot - 1], mid);
    p.px(cx - 1, top + 3, light); p.px(cx - 2, top + 5, light);
  }
  return p.outline('#1f3d26');
}

/** Cais de madeira. Colocar em (0, AY - 5). */
export const DOCK_Y = AY - 5;
export function dock(): PixelCanvas {
  // as estacas descem até ao fundo do lago (o ecrã desce atrás do anzol)
  const w = DOCK_END + 4, h = BED_Y + O + 10 - DOCK_Y, p = new PixelCanvas(w, h);
  const waterRow = WATER_Y - DOCK_Y;
  const r = rng(23);
  for (const x of [14, 58, 102, 124]) {
    p.rect(x, 8, 6, h - 8, WOOD_D);
    p.rect(x, 8, 1, h - 8, shade(WOOD_D, 0.15));
    p.rect(x + 5, 8, 1, h - 8, WOOD_DD);
    // parte molhada abaixo da água, com limos
    p.dither(x, waterRow, 6, h - waterRow, '#3a3a2a');
    p.rect(x, waterRow, 6, 1, '#d8eef7');
    for (let i = 0; i < 10; i++) {
      const y = waterRow + 20 + Math.floor(r() * (h - waterRow - 30));
      p.rect(x + (r() < 0.5 ? 0 : 4), y, 2, 2 + Math.floor(r() * 3), '#3f6a3a');
    }
  }
  // tábuas
  p.rect(0, 1, w - 2, 7, WOOD);
  p.rect(0, 0, w - 2, 1, WOOD_L);
  p.rect(0, 1, w - 2, 1, shade(WOOD, 0.12));
  p.rect(0, 8, w - 2, 2, WOOD_D);
  for (let x = 0; x < w - 2; x += 15) { p.rect(x, 1, 1, 7, WOOD_D); p.px(x + 3, 4, WOOD_DD); p.px(x + 10, 3, WOOD_DD); }
  return p;
}

// ---------- Fundo (onde o anzol chega com a Chumbada) ----------

/** Linha onde começa o fundo. */
export const BED_Y = WORLD_H - 68;
/** Espaço por cima do chão na textura do fundo (para as algas e corais crescerem). */
const O = 24;

/** Fundo do lago: lodo, pedras, juncos e algas. Colocar em (0, BED_Y). */
export function lakeBed(): PixelCanvas {
  const h = WORLD_H - BED_Y, p = new PixelCanvas(W, h), r = rng(31);
  for (let x = 0; x < W; x++) {
    const top = Math.round(O + 6 + Math.sin(x / 37) * 3 + Math.sin(x / 11) * 1.5);
    for (let y = top; y < h; y++) p.px(x, y, y < top + 2 ? '#7a6a45' : (x + y) % 5 === 0 ? '#4a3f28' : '#5c4e31');
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W), y = O + 8 + Math.floor(r() * 6), s = 2 + Math.floor(r() * 3);
    p.ellipse(x, y, s + 1, s, '#6f7480'); p.px(x - 1, y - s + 1, '#9aa0aa');
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * W), tall = 8 + Math.floor(r() * 10);
    for (let y = 0; y < tall; y++) p.px(x + Math.round(Math.sin(y / 2 + x) * 1.2), O + 8 - y, y % 3 ? '#3f7a46' : '#5c9a5a');
  }
  return p;
}

/** Fundo do mar: areia, corais, algas, conchas e uma estrela-do-mar. Colocar em (0, BED_Y). */
export function seaBed(): PixelCanvas {
  const h = WORLD_H - BED_Y, p = new PixelCanvas(W, h), r = rng(57);
  for (let x = 0; x < W; x++) {
    const top = Math.round(O + 7 + Math.sin(x / 45) * 3 + Math.sin(x / 15) * 1);
    for (let y = top; y < h; y++) p.px(x, y, y < top + 2 ? '#d9c79a' : (x * 3 + y) % 7 === 0 ? '#b8a173' : '#c9b385');
  }
  // algas compridas
  for (let i = 0; i < 9; i++) {
    const x = 20 + Math.floor(r() * (W - 40)), tall = 14 + Math.floor(r() * 16);
    for (let y = 0; y < tall; y++) { const xx = x + Math.round(Math.sin(y / 3 + i) * 2); p.px(xx, O + 9 - y, '#2f7a5a'); p.px(xx + 1, O + 9 - y, y % 2 ? '#3f9a6a' : '#2f7a5a'); }
  }
  // corais
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * W), c = ['#e86a8a', '#f09a4a', '#c95ad0'][i % 3];
    p.rect(x, O + 2, 2, 8, c);
    p.rect(x - 3, O + 4, 3, 2, c); p.rect(x - 3, O + 1, 2, 3, c);
    p.rect(x + 2, O + 3, 3, 2, c); p.rect(x + 4, O, 2, 3, c);
  }
  // conchas e estrela-do-mar
  for (let i = 0; i < 10; i++) { const x = Math.floor(r() * W); p.ellipse(x, O + 12, 2, 1, '#f4e6d0'); p.px(x, O + 11, '#e0c8a8'); }
  const sx = 300;
  for (const [dx, dy] of [[0, -3], [-3, -1], [3, -1], [-2, 2], [2, 2], [0, 0], [0, -1], [-1, 0], [1, 0]]) p.px(sx + dx, O + 12 + dy, '#f08a4a');
  return p;
}

/** Balde em cima do cais. */
export function bucket(): PixelCanvas {
  const p = new PixelCanvas(10, 10);
  p.poly([1, 3, 9, 3, 8, 10, 2, 10], '#8fa3b5');
  p.rect(2, 4, 6, 1, '#b9cad8');
  p.rect(2, 7, 6, 1, '#6f8396');
  p.line(1, 3, 4, 0, '#5a6b7a'); p.line(5, 0, 8, 3, '#5a6b7a');
  p.rect(2, 2, 6, 1, '#3d6f9a');
  return p.outline('#3a4652');
}

// ---------- Mar ----------

/** Barco à vela. Colocar em (5, AY - 75). */
export const BOAT_X = 5, BOAT_Y = AY - 75;
export function boat(): PixelCanvas {
  const p = new PixelCanvas(140, 100);
  const hull = '#b5523b', hullD = '#7a3022';
  // mastro e vela
  p.rect(25, 6, 3, 68, hullD);
  p.rect(25, 6, 1, 68, '#a2503a');
  p.poly([28, 8, 28, 62, 78, 58], '#f4efe1');
  p.poly([28, 8, 28, 62, 34, 61], '#e2d8c0');
  for (let y = 22; y < 60; y += 12) p.line(29, y, 28 + (y - 8) * 0.9, y - 1, '#d8cdb2');
  p.rect(28, 40, Math.round(32 * 0.9), 2, '#e8743b');
  // bandeira
  p.poly([28, 2, 28, 8, 37, 5], '#e84040');
  // casco
  p.poly([0, 72, 131, 72, 116, 97, 15, 97], hull);
  p.poly([0, 72, 131, 72, 129, 75, 2, 75], '#e8d9b5');
  for (let y = 80; y < 97; y += 6) p.line(6 + (y - 72) * 0.6, y, 125 - (y - 72) * 0.6, y, hullD);
  p.rect(0, 70, 132, 2, WOOD_L);
  p.rect(0, 69, 132, 1, WOOD);
  // vigias
  for (const x of [45, 70, 95]) { p.circle(x, 85, 2, '#5d8fb5'); p.px(x - 1, 84, '#bfe3f5'); }
  return p.outline('#3a1a12');
}

/** Ilhas distantes (silhuetas no fundo do Mar). */
export function farIslands(): PixelCanvas {
  const h = 20, p = new PixelCanvas(W, h);
  const c = '#6f8fae', cl = '#88a6c2';
  const isl = [[40, 60, 10], [150, 40, 6], [300, 90, 14], [390, 30, 5]];
  for (const [x0, wd, ht] of isl) {
    for (let x = x0; x < x0 + wd; x++) {
      const t = (x - x0) / wd, y = Math.round(h - Math.sin(Math.PI * t) * ht);
      for (let j = y; j < h; j++) p.px(x, j, c);
      p.px(x, y, cl);
    }
  }
  return p;
}

/** Farol. Base em (LH_X, WATER_Y), lâmpada em LH_LAMP. */
export const LH_X = 430;
export const LH_LAMP = { x: LH_X, y: WATER_Y - 44 };
export function lighthouse(): PixelCanvas {
  const w = 24, h = 52, p = new PixelCanvas(w, h);
  const cx = 12;
  // rochedo
  p.ellipse(cx, h - 2, 11, 4, '#5b6270');
  p.ellipse(cx - 2, h - 3, 6, 2, '#7a8292');
  // torre às riscas
  for (let y = 14; y < h - 4; y++) {
    const half = 3 + Math.floor((y - 14) / 10);
    const red = Math.floor((y - 14) / 7) % 2 === 1;
    p.rect(cx - half, y, half * 2 + 1, 1, red ? '#c94040' : '#ece6d8');
    p.px(cx + half, y, red ? '#9a2c2c' : '#c9c1ae');
  }
  // varanda, lanterna e telhado
  p.rect(cx - 5, 12, 11, 2, '#3a3f4a');
  p.rect(cx - 3, 6, 7, 6, '#ffe680');
  p.rect(cx - 3, 6, 1, 6, '#3a3f4a'); p.rect(cx + 3, 6, 1, 6, '#3a3f4a');
  p.poly([cx - 5, 6, cx + 6, 6, cx + 0.5, 0], '#c94040');
  p.rect(cx, 0, 1, 1, '#3a3f4a');
  return p.outline('#2a2e38');
}

/** Brilho da lâmpada (para blend ADD). */
export function glow(r: number, c: string): PixelCanvas {
  const p = new PixelCanvas(r * 2 + 1, r * 2 + 1);
  for (let y = 0; y <= r * 2; y++) for (let x = 0; x <= r * 2; x++) {
    const d = Math.hypot(x - r, y - r) / r;
    if (d > 1) continue;
    if (d < 0.35) p.px(x, y, c);
    else if (d < 0.7) { if ((x + y) % 2 === 0) p.px(x, y, c); }
    else if (x % 2 === 0 && y % 2 === 0) p.px(x, y, c);
  }
  return p;
}

// ---------- Céu ----------

export function sun(): PixelCanvas {
  const p = new PixelCanvas(31, 31);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    p.px(15 + Math.round(Math.cos(a) * 14), 15 + Math.round(Math.sin(a) * 14), '#ffe9a0');
    if (i % 2 === 0) p.px(15 + Math.round(Math.cos(a) * 13), 15 + Math.round(Math.sin(a) * 13), '#ffe9a0');
  }
  p.circle(15, 15, 10, '#ffc93a');
  p.circle(14, 14, 9, '#ffd84a');
  p.circle(12, 12, 4, '#ffeb8a');
  return p;
}

export function moon(): PixelCanvas {
  const p = new PixelCanvas(22, 22);
  p.circle(11, 11, 9, '#f2efe0');
  p.circle(15, 8, 8, '#000000');
  // apaga a parte "escura" para formar o crescente
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) if (p.get(x, y) === '#000000') p.clear(x, y);
  p.px(6, 13, '#d6d1bb'); p.px(7, 15, '#d6d1bb'); p.px(5, 10, '#d6d1bb');
  return p;
}

export function star(big: boolean): PixelCanvas {
  const p = new PixelCanvas(3, 3);
  if (big) { p.px(1, 0, '#cfd8ff'); p.px(0, 1, '#cfd8ff'); p.px(2, 1, '#cfd8ff'); p.px(1, 2, '#cfd8ff'); }
  p.px(1, 1, '#ffffff');
  return p;
}

export function cloud(variant: number): PixelCanvas {
  const sizes = [[44, 16], [60, 20], [34, 12]];
  const [w, h] = sizes[variant % sizes.length];
  const p = new PixelCanvas(w, h), r = rng(100 + variant);
  const shadeC = '#dfe9f2';
  const puffs: [number, number, number][] = [];
  const n = Math.floor(w / 10);
  for (let i = 0; i < n; i++) {
    const x = 6 + (i * (w - 12)) / Math.max(1, n - 1), rad = 4 + r() * (h / 2 - 4);
    puffs.push([x, h - rad - 1, rad]);
  }
  for (const [x, y, rad] of puffs) p.circle(x, y + 1, rad, shadeC);
  for (const [x, y, rad] of puffs) p.circle(x - 1, y, rad - 1, '#ffffff');
  p.rect(4, h - 4, w - 8, 3, shadeC);
  return p;
}

// ---------- Água e pesca ----------

/** Padrão de ondas para TileSprite (branco sobre transparente). */
export function waveTile(): PixelCanvas {
  const p = new PixelCanvas(32, 3);
  p.rect(2, 1, 5, 1, '#ffffff'); p.px(3, 0, '#ffffff'); p.px(5, 0, '#ffffff');
  p.rect(18, 2, 3, 1, '#ffffff'); p.px(19, 1, '#ffffff');
  return p;
}

/** Boia (vermelha em cima, branca em baixo). Origem no centro da base. */
export function bobber(): PixelCanvas {
  const p = new PixelCanvas(7, 10);
  p.rect(3, 0, 1, 2, '#333333');
  p.ellipse(3, 5, 2, 3, '#ffffff');
  p.rect(1, 2, 5, 3, '#e84040'); p.rect(2, 2, 3, 1, '#ff7a6a');
  return p.outline('#2a1a1a');
}

/** Gancho (linha recolhida). */
export function hook(): PixelCanvas {
  const p = new PixelCanvas(5, 6);
  p.px(2, 0, '#cccccc'); p.px(2, 1, '#cccccc'); p.px(2, 2, '#cccccc'); p.px(2, 3, '#cccccc');
  p.px(1, 4, '#cccccc'); p.px(0, 3, '#cccccc'); p.px(3, 4, '#cccccc'); p.px(4, 3, '#cccccc');
  return p;
}

/** "!" grande da mordida. */
export function bang(): PixelCanvas {
  const p = new PixelCanvas(9, 20);
  p.rect(2, 1, 5, 11, '#ffd23f'); p.rect(3, 12, 3, 2, '#ffd23f');
  p.rect(2, 16, 5, 3, '#ffd23f');
  p.rect(3, 1, 1, 10, '#fff1a8');
  return p.outline('#4a2a00');
}
