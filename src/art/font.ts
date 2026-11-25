import { PixelCanvas } from './pixel';

// Fonte bitmap 5×7 desenhada no código, com contorno escuro de 1 píxel já incluído.
// Cada célula tem 7×12: 1 px de contorno à volta, 2 linhas para acentos e 1 para a cedilha.
// O texto é escrito em maiúsculas; a cor vem do tint (o contorno preto não muda).

export const FONT_KEY = 'pixelfont';
export const CELL_W = 7;
export const CELL_H = 12;

const G: Record<string, string> = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ....# .###.',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '.': '..... ..... ..... ..... ..... ..... ..#..',
  ',': '..... ..... ..... ..... ..... ..#.. .#...',
  ':': '..... ..#.. ..... ..... ..... ..#.. .....',
  "'": '..#.. ..#.. ..... ..... ..... ..... .....',
  '"': '.#.#. .#.#. ..... ..... ..... ..... .....',
  '-': '..... ..... ..... .###. ..... ..... .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '·': '..... ..... ..... ..#.. ..... ..... .....',
  '✖': '..... #...# .#.#. ..#.. .#.#. #...# .....',
  ' ': '..... ..... ..... ..... ..... ..... .....',
};

// acentos: 2 linhas por cima da letra
const ACC: Record<string, [string, string]> = {
  acute: ['...#.', '..#..'],
  grave: ['.#...', '..#..'],
  tilde: ['.##.#', '#..#.'],
  circ: ['..#..', '.#.#.'],
};
const ACCENTED: Record<string, [string, keyof typeof ACC]> = {
  'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Ã': ['A', 'tilde'], 'Â': ['A', 'circ'],
  'É': ['E', 'acute'], 'Ê': ['E', 'circ'], 'Í': ['I', 'acute'],
  'Ó': ['O', 'acute'], 'Õ': ['O', 'tilde'], 'Ô': ['O', 'circ'], 'Ú': ['U', 'acute'],
};

export const FONT_CHARS = Object.keys(G).join('') + Object.keys(ACCENTED).join('') + 'Ç';
export const FONT_PER_ROW = 16;

/** Desenha a folha de glifos (branco com contorno preto). */
export function buildFont(): PixelCanvas {
  const chars = [...FONT_CHARS];
  const rows = Math.ceil(chars.length / FONT_PER_ROW);
  const sheet = new PixelCanvas(FONT_PER_ROW * CELL_W, rows * CELL_H);

  chars.forEach((ch, i) => {
    const cell = new PixelCanvas(CELL_W, CELL_H);
    const ox = 1, oy = 3; // 1 px de contorno + 2 linhas de acento
    const plot = (rowsStr: string[], y0: number) =>
      rowsStr.forEach((r, y) => [...r].forEach((b, x) => { if (b === '#') cell.px(ox + x, y0 + y, '#ffffff'); }));

    if (ACCENTED[ch]) {
      const [base, acc] = ACCENTED[ch];
      plot(G[base].split(' '), oy);
      plot(ACC[acc], oy - 2);
    } else if (ch === 'Ç') {
      plot(G.C.split(' '), oy);
      plot(['..#..'], oy + 7);
    } else {
      plot(G[ch].split(' '), oy);
    }
    cell.outline('#000000');
    sheet.blit(cell, (i % FONT_PER_ROW) * CELL_W, Math.floor(i / FONT_PER_ROW) * CELL_H);
  });
  return sheet;
}

/** Normaliza o texto para os glifos disponíveis (maiúsculas, sem emoji). */
export function fontText(s: string): string {
  return [...s.toUpperCase()].map(ch => (FONT_CHARS.includes(ch) ? ch : ch === '·' ? '·' : '')).join('');
}
