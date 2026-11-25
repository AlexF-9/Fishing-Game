// Núcleo do gerador de pixel art: tudo é desenhado píxel a píxel num <canvas> normal.
// Assim, o mesmo desenho serve o Phaser (TextureManager) e a UI em HTML (livro, cartão, escolha).

export type Palette = Record<string, string>;

const rgbCache = new Map<string, [number, number, number]>();
function rgb(c: string): [number, number, number] {
  let v = rgbCache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    v = [n >> 16, (n >> 8) & 255, n & 255];
    rgbCache.set(c, v);
  }
  return v;
}

/** Escurece (t<0) ou clareia (t>0) uma cor '#rrggbb'. */
export function shade(c: string, t: number): string {
  const [r, g, b] = rgb(c);
  const f = (v: number) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

/** Uma imagem em pixel art editável píxel a píxel. */
export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  private data: ImageData;
  private dirty = false;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.data = new ImageData(w, h);
  }

  private idx(x: number, y: number) { return (y * this.w + x) * 4; }
  inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  /** Pinta um píxel. alpha 0–1 (sem mistura: substitui). */
  px(x: number, y: number, c: string, alpha = 1): this {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return this;
    const [r, g, b] = rgb(c), i = this.idx(x, y), d = this.data.data;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(alpha * 255);
    this.dirty = true;
    return this;
  }
  clear(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    this.data.data[this.idx(x, y) + 3] = 0;
    this.dirty = true;
  }
  opaque(x: number, y: number): boolean {
    return this.inside(x, y) && this.data.data[this.idx(x, y) + 3] > 0;
  }
  get(x: number, y: number): string | null {
    if (!this.opaque(x, y)) return null;
    const d = this.data.data, i = this.idx(x, y);
    return '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
  }

  rect(x: number, y: number, w: number, h: number, c: string, alpha = 1): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, alpha);
    return this;
  }

  /** Elipse cheia com centro (cx, cy) e raios rx, ry (aceita meios píxeis). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx - 0.5) / (rx + 0.35), dy = (y + 0.5 - cy - 0.5) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    return this;
  }
  circle(cx: number, cy: number, r: number, c: string): this { return this.ellipse(cx, cy, r, r, c); }

  /** Polígono cheio (pontos [x0,y0,x1,y1,...]), por teste de ponto interior. */
  poly(pts: number[], c: string): this {
    const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
    const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    const n = xs.length;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        if ((ys[i] > py) !== (ys[j] > py) && px < ((xs[j] - xs[i]) * (py - ys[i])) / (ys[j] - ys[i]) + xs[i]) inside = !inside;
      }
      if (inside) this.px(x, y, c);
    }
    return this;
  }

  /** Linha de Bresenham com 1 píxel de espessura. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    bresenham(x0, y0, x1, y1, (x, y) => this.px(x, y, c));
    return this;
  }
  /** Linha grossa (círculos ao longo da linha). */
  thickLine(x0: number, y0: number, x1: number, y1: number, r: number, c: string): this {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.circle(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, c);
    return this;
  }

  /** Preenche com padrão xadrez (dithering 50%). */
  dither(x: number, y: number, w: number, h: number, c: string, phase = 0): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x + i + y + j + phase) % 2 === 0) this.px(x + i, y + j, c);
    return this;
  }

  /** Contorno de 1 píxel à volta de tudo o que é opaco (4 vizinhos). */
  outline(c: string): this {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.opaque(x, y)) continue;
      if (this.opaque(x - 1, y) || this.opaque(x + 1, y) || this.opaque(x, y - 1) || this.opaque(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.px(x, y, c);
    return this;
  }

  /** Troca todas as cores opacas por uma só (silhuetas). */
  silhouette(c: string): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.opaque(x, y)) this.px(x, y, c);
    return this;
  }

  /** Copia outra imagem para esta, em (dx, dy), opcionalmente espelhada. */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c) this.px(dx + (flipX ? src.w - 1 - x : x), dy + y, c, src.alphaAt(x, y));
    }
    return this;
  }
  /** Copia outra imagem ampliada por um fator inteiro. */
  blitScaled(src: PixelCanvas, dx: number, dy: number, s: number): this {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c) this.rect(dx + x * s, dy + y * s, s, s, c, src.alphaAt(x, y));
    }
    return this;
  }
  alphaAt(x: number, y: number): number { return this.inside(x, y) ? this.data.data[this.idx(x, y) + 3] / 255 : 0; }

  /** Desenha uma matriz de caracteres ('.' ou ' ' = transparente). */
  matrix(rows: string[], pal: Palette, dx = 0, dy = 0): this {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) this.px(dx + x, dy + y, pal[ch]); }));
    return this;
  }

  /** Escreve os píxeis no canvas e devolve-o. */
  flush(): HTMLCanvasElement {
    if (this.dirty) { this.canvas.getContext('2d')!.putImageData(this.data, 0, 0); this.dirty = false; }
    return this.canvas;
  }

  /** Cópia ampliada (vizinho mais próximo) para a UI em HTML. */
  scaled(s: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * s; c.height = this.h * s;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.flush(), 0, 0, c.width, c.height);
    return c;
  }
}

/** Percorre os píxeis de uma linha de Bresenham. */
export function bresenham(x0: number, y0: number, x1: number, y1: number, plot: (x: number, y: number) => void): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Gerador pseudo-aleatório determinístico (para cenários sempre iguais). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Junta vários frames do mesmo tamanho numa tira horizontal (spritesheet). */
export function stripOf(frames: PixelCanvas[]): PixelCanvas {
  const fw = frames[0].w, fh = frames[0].h;
  const sheet = new PixelCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => sheet.blit(f, i * fw, 0));
  return sheet;
}
