import { ANIMALS, type AnimalId } from '../data/animals';
import { PixelCanvas, shade, stripOf } from './pixel';

// Os 4 pescadores, desenhados por código em frames de 40×48 (pés na última linha).
export const ANIMAL_W = 40;
export const ANIMAL_H = 48;

/** Ponto onde a pata segura a cana, relativo aos pés (centro inferior do frame). */
export const PAW_OFFSET = { x: 10, y: -19 };

interface Pose {
  /** Respiração: 1 = peito cheio. */
  b?: number;
  /** Deslocamento da cabeça. */
  hx?: number;
  hy?: number;
}

/** Ordem dos frames na spritesheet. */
export const POSES: Pose[] = [
  // idle (respirar) 0–3
  { b: 0 }, { b: 0 }, { b: 1 }, { b: 1 },
  // lançar 4–6: preparar, atirar, acompanhar
  { hx: -2, hy: 1 }, { hx: 2 }, { hx: 3, hy: 1 },
  // puxar 7–8
  { hx: -1 }, { hx: -2, hy: 1, b: 1 },
];
export const ANIM_FRAMES = { idle: [0, 1, 2, 3], cast: [4, 5, 6], reel: [7, 8] };

const EYE = '#1a1a1a', BLUSH = '#ff8f9e', PINK = '#f6a5b5', BEAK = '#f39a2b', BEAK_D = '#b86a12';

/** Elipse com sombra em crescente no canto inferior direito. */
function shadedEllipse(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, c: string): void {
  p.ellipse(cx, cy, rx, ry, shade(c, -0.18));
  p.ellipse(cx - 1, cy - 1, rx - 1, ry - 1, c);
}

export function drawAnimalFrame(id: AnimalId, pose: Pose): PixelCanvas {
  const a = ANIMALS[id];
  const p = new PixelCanvas(ANIMAL_W, ANIMAL_H);
  const b = pose.b ?? 0, hx = pose.hx ?? 0, hy = pose.hy ?? 0;
  const penguin = id === 'pinguim';
  const bodyX = 20 + Math.round(hx / 2);

  // cauda (atrás de tudo)
  if (id === 'gato') {
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (1 - t) * (1 - t) * 11 + 2 * (1 - t) * t * 0 + t * t * 4;
      const y = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 38 + t * t * 22;
      p.circle(x, y, 2, t > 0.8 ? a.dark : a.main);
    }
  } else if (id === 'lontra') {
    p.thickLine(13, 42, 3, 45, 2.5, a.main);
    p.thickLine(12, 43, 4, 45, 1, shade(a.main, -0.15));
  }

  // pés
  const foot = penguin ? BEAK : a.main;
  p.ellipse(13, 45, 4, 2, foot);
  p.ellipse(27, 45, 4, 2, foot);

  // corpo
  if (penguin) {
    shadedEllipse(p, bodyX, 31 - b, 13, 15 + b, a.main);
    p.ellipse(bodyX, 33 - b, 8, 11 + b, a.light);
    p.thickLine(8, 25, 5, 36, 1.8, a.main); // asa
  } else if (id === 'lontra') {
    // lontra: corpo mais esguio e comprido
    shadedEllipse(p, bodyX, 34 - b, 10, 11 + b, a.main);
    p.ellipse(bodyX, 35 - b, 6, 8 + b, a.light);
  } else {
    shadedEllipse(p, bodyX, 35 - b, 12, 10 + b, a.main);
    p.ellipse(bodyX, 37 - b, 7, 6 + b, a.light);
  }

  // cabeça
  const cx = 20 + hx, cy = (penguin ? 12 : 15) + hy - b;
  if (id === 'gato') {
    for (const s of [-1, 1]) {
      p.poly([cx + s * 11, cy - 3, cx + s * 8, cy - 15, cx + s * 2, cy - 8], a.main);
      p.poly([cx + s * 9, cy - 5, cx + s * 8, cy - 12, cx + s * 4, cy - 8], PINK);
    }
  } else if (id === 'urso') {
    for (const s of [-1, 1]) { p.circle(cx + s * 8, cy - 8, 4, a.main); p.circle(cx + s * 8, cy - 8, 2, a.light); }
  } else if (id === 'lontra') {
    for (const s of [-1, 1]) p.circle(cx + s * 9, cy - 6, 2.5, a.main);
  }
  shadedEllipse(p, cx, cy, 11, 10, a.main);
  if (penguin) p.ellipse(cx, cy + 2, 8, 7, a.light);
  if (id === 'urso') p.ellipse(cx, cy + 5, 5, 3, a.light);
  if (id === 'lontra') { p.ellipse(cx, cy + 3, 8, 5, a.light); p.rect(cx - 6, cy - 3, 4, 1, shade(a.main, -0.2)); p.rect(cx + 3, cy - 3, 4, 1, shade(a.main, -0.2)); }

  // olhos e bochechas
  for (const s of [-1, 1]) {
    const ex = cx + s * 4 - (s < 0 ? 1 : 0);
    p.rect(ex, cy - 1, 2, 2, EYE);
    p.px(ex + 1, cy - 1, '#ffffff');
    p.px(cx + s * 7, cy + 3, BLUSH);
    p.px(cx + s * 7 + (s < 0 ? -1 : 1), cy + 3, BLUSH);
  }

  // nariz / bico e boca
  if (penguin) {
    p.rect(cx - 2, cy + 3, 5, 2, BEAK);
    p.rect(cx - 1, cy + 5, 3, 1, BEAK_D);
  } else {
    if (id === 'gato') { p.rect(cx - 1, cy + 3, 3, 1, '#e8798c'); p.px(cx, cy + 4, '#e8798c'); }
    else p.rect(cx - 1, cy + 3, 3, 2, '#2a1a10');
    p.px(cx - 1, cy + 6, a.dark); p.px(cx + 1, cy + 6, a.dark); p.px(cx, cy + 5, a.dark);
  }

  p.outline(penguin ? '#0d1014' : a.dark);

  // bigodes (por fora do contorno)
  if (id === 'gato' || id === 'lontra') {
    const wc = shade(a.dark, -0.2);
    for (const s of [-1, 1]) {
      p.line(cx + s * 6, cy + 3, cx + s * 13, cy + 1, wc);
      p.line(cx + s * 6, cy + 5, cx + s * 13, cy + 6, wc);
    }
  }
  return p;
}

/** Pata que segura a cana. */
export function drawPaw(id: AnimalId): PixelCanvas {
  const a = ANIMALS[id];
  const p = new PixelCanvas(9, 9);
  if (id === 'pinguim') p.ellipse(4, 4, 2, 3, a.main);
  else { p.circle(4, 4, 3, a.main); p.px(3, 3, shade(a.main, 0.2)); }
  return p.outline(id === 'pinguim' ? '#0d1014' : a.dark);
}

/** Spritesheet de todos os frames de um animal. */
export function animalSheet(id: AnimalId): PixelCanvas {
  return stripOf(POSES.map(pose => drawAnimalFrame(id, pose)));
}

/** Retrato para a UI em HTML (frame parado, ampliado ×2, centrado num quadrado). */
export function animalPortraitCanvas(id: AnimalId, size = 120): HTMLCanvasElement {
  const frame = drawAnimalFrame(id, POSES[0]).scaled(2);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, Math.round((size - frame.width) / 2), size - frame.height - 4);
  return c;
}
