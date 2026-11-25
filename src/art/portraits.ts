import type { AnimalId } from '../data/animals';
import type { Fish } from '../data/fish';
import { RAR } from '../data/rarities';
import { animalPortraitCanvas } from './animals';
import { drawFish, FISH_H, FISH_W } from './fish';
import { PixelCanvas, shade } from './pixel';

// Retratos em pixel art usados pela UI em HTML (cartão, livro, escolha de animal).

/** Peixe ampliado ×3 (120×72) para o Livro de Peixes. */
export function fishPortrait(f: Fish, sil: boolean): HTMLCanvasElement {
  return drawFish(f, sil).scaled(3);
}

export function animalPortrait(id: AnimalId, size = 120): HTMLCanvasElement {
  return animalPortraitCanvas(id, size);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

/** Ilustração do cartão de captura: brilho da raridade, raios (Lendário), brilhos (Épico+) e o peixe ×2. */
export const CARD_W = 110, CARD_H = 54;
export function catchArt(f: Fish): PixelCanvas {
  const p = new PixelCanvas(CARD_W, CARD_H);
  const col = RAR[f.r].color, cx = Math.floor(CARD_W / 2), cy = Math.floor(CARD_H / 2);
  for (let y = 0; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) {
    const d = Math.hypot((x - cx) / 54, (y - cy) / 27);
    const th = BAYER[(y % 4) * 4 + (x % 4)];
    if (d < 0.55 && th < 0.75) p.px(x, y, shade(col, 0.35));
    else if (d < 0.8 && th < 0.45) p.px(x, y, shade(col, 0.5));
    else if (d < 1 && th < 0.2) p.px(x, y, shade(col, 0.6));
  }
  if (f.r === 4) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      p.line(cx + Math.cos(a) * 44, cy + Math.sin(a) * 20, cx + Math.cos(a) * 54, cy + Math.sin(a) * 27, '#ffd23f');
    }
  }
  if (f.r >= 3) {
    for (const [x, y] of [[8, 8], [101, 10], [96, 45], [12, 44], [55, 3]]) {
      p.px(x, y, '#ffffff'); p.px(x - 1, y, '#fff3a8'); p.px(x + 1, y, '#fff3a8'); p.px(x, y - 1, '#fff3a8'); p.px(x, y + 1, '#fff3a8');
    }
  }
  p.blitScaled(drawFish(f), Math.round(cx - FISH_W), Math.round(cy - FISH_H) + 1, 2);
  return p;
}
