import Phaser from 'phaser';
import { ANIMAL_IDS } from '../data/animals';
import { ANIM_FRAMES, ANIMAL_H, ANIMAL_W, animalSheet, drawPaw } from './animals';
import { buildFont, CELL_H, CELL_W, FONT_CHARS, FONT_KEY, FONT_PER_ROW } from './font';
import type { PixelCanvas } from './pixel';
import { FISH } from '../data/fish';
import { drawFish, fishKey } from './fish';
import * as S from './scenery';

/** Chaves estáveis de todas as texturas geradas. */
export const TEX = {
  hillsFar: 'hills_far', hillsNear: 'hills_near', pineBig: 'pine_big', pineSmall: 'pine_small',
  dock: 'dock', bucket: 'bucket', boat: 'boat', islands: 'islands', lighthouse: 'lighthouse',
  lampGlow: 'lamp_glow', sunGlow: 'sun_glow', sun: 'sun', moon: 'moon', starSmall: 'star_s', starBig: 'star_b',
  wave: 'wave', bobber: 'bobber', hook: 'hook', bang: 'bang',
  cloud: (i: number) => `cloud_${i}`,
  animal: (id: string) => `animal_${id}`,
  paw: (id: string) => `paw_${id}`,
} as const;

function add(scene: Phaser.Scene, key: string, p: PixelCanvas): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, p.flush())!;
}

/** Gera todas as texturas em pixel art, a fonte e as animações. Chamado uma vez no BootScene. */
export function registerAll(scene: Phaser.Scene): void {
  // cenário
  add(scene, TEX.hillsFar, S.hillsFar());
  add(scene, TEX.hillsNear, S.hillsNear());
  add(scene, TEX.pineBig, S.pine(true));
  add(scene, TEX.pineSmall, S.pine(false));
  add(scene, TEX.dock, S.dock());
  add(scene, TEX.bucket, S.bucket());
  add(scene, TEX.boat, S.boat());
  add(scene, TEX.islands, S.farIslands());
  add(scene, TEX.lighthouse, S.lighthouse());
  add(scene, TEX.lampGlow, S.glow(14, '#ffe9a0'));
  add(scene, TEX.sunGlow, S.glow(22, '#fff3c0'));
  add(scene, TEX.sun, S.sun());
  add(scene, TEX.moon, S.moon());
  add(scene, TEX.starSmall, S.star(false));
  add(scene, TEX.starBig, S.star(true));
  for (let i = 0; i < 3; i++) add(scene, TEX.cloud(i), S.cloud(i));
  add(scene, TEX.wave, S.waveTile());
  add(scene, TEX.bobber, S.bobber());
  add(scene, TEX.hook, S.hook());
  add(scene, TEX.bang, S.bang());

  // animais: spritesheet com frames numerados + animações
  for (const id of ANIMAL_IDS) {
    const key = TEX.animal(id);
    const sheet = animalSheet(id);
    const tex = add(scene, key, sheet);
    for (let i = 0; i < sheet.w / ANIMAL_W; i++) tex.add(i, 0, i * ANIMAL_W, 0, ANIMAL_W, ANIMAL_H);
    const frames = (list: number[]) => list.map(frame => ({ key, frame }));
    scene.anims.create({ key: `${id}_idle`, frames: frames(ANIM_FRAMES.idle), frameRate: 3, repeat: -1 });
    scene.anims.create({ key: `${id}_cast`, frames: frames(ANIM_FRAMES.cast), frameRate: 12, repeat: 0 });
    scene.anims.create({ key: `${id}_reel`, frames: frames(ANIM_FRAMES.reel), frameRate: 8, repeat: -1 });
    add(scene, TEX.paw(id), drawPaw(id));
  }

  // os 18 peixes (o fundo usa-os em silhueta via tintFill)
  for (const f of FISH) add(scene, fishKey(f.id), drawFish(f));

  // fonte bitmap
  add(scene, FONT_KEY, buildFont());
  const fontData = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY,
    width: CELL_W,
    height: CELL_H,
    chars: FONT_CHARS,
    charsPerRow: FONT_PER_ROW,
    'spacing.x': 0,
    'spacing.y': 0,
    'offset.x': 0,
    'offset.y': 0,
    lineSpacing: 0,
  });
  scene.cache.bitmapFont.add(FONT_KEY, fontData);
}
