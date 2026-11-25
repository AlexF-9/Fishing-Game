import Phaser from 'phaser';
import { ANIM_FRAMES, pawOffset } from '../art/animals';
import { bresenham } from '../art/pixel';
import { TEX } from '../art/registerAll';
import { BOAT_X, BOAT_Y, DOCK_Y, LH_LAMP, LH_X } from '../art/scenery';
import { fishKey } from '../art/fish';
import { FISH } from '../data/fish';
import { AX, AY, DOCK_END, H, W, WATER_Y } from '../config';
import type { AnimalId } from '../data/animals';
import { darkness } from '../state/formulas';
import { persist, save } from '../state/save';
import { advanceTime, duskAmount, hex, mixColor, moonArc, skyColors, sunArc, waterColors } from '../systems/DayNight';
import { fishing, type Phase } from '../systems/FishingController';
import { updTime } from '../ui/hud';
import { syncAction } from '../ui/touch';

interface Swimmer { img: Phaser.GameObjects.Image; v: number }
interface Ripple { x: number; y: number; r: number; life: number }
interface Cloud { img: Phaser.GameObjects.Image; v: number }

// Matriz de Bayer 4×4 para o dithering do céu e da água.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

/** Pinta um gradiente vertical em faixas com dithering num CanvasTexture. */
function paintBands(tex: Phaser.Textures.CanvasTexture, top: string, bottom: string, bands: number, highlight?: string): void {
  const { width: w, height: h } = tex;
  const ctx = tex.getContext();
  const img = ctx.createImageData(w, h);
  const cols = Array.from({ length: bands + 1 }, (_, i) => hex(mixColor(top, bottom, i / bands)));
  for (let y = 0; y < h; y++) {
    const t = (y / (h - 1)) * bands, b = Math.min(bands - 1, Math.floor(t)), frac = t - b;
    for (let x = 0; x < w; x++) {
      const c = frac > BAYER[(y % 4) * 4 + (x % 4)] ? cols[b + 1] : cols[b];
      const i = (y * w + x) * 4;
      img.data[i] = c >> 16; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255; img.data[i + 3] = 255;
    }
  }
  if (highlight) {
    const c = hex(highlight);
    for (let x = 0; x < w; x++) { const i = x * 4; img.data[i] = c >> 16; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255; }
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

/** Mundo do jogo: céu, cenário, água, animal, cana, linha e boia. */
export class GameScene extends Phaser.Scene {
  private skyTex!: Phaser.Textures.CanvasTexture;
  private waterTex!: Phaser.Textures.CanvasTexture;
  private paintTimer = 0;
  private lastZone = '';

  private stars: { img: Phaser.GameObjects.Image; p: number }[] = [];
  private sunGlow!: Phaser.GameObjects.Image;
  private sun!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private clouds: Cloud[] = [];

  private lake!: Phaser.GameObjects.Container;
  private sea!: Phaser.GameObjects.Container;
  private lampGlow!: Phaser.GameObjects.Image;
  private beam!: Phaser.GameObjects.Graphics;
  private boat!: Phaser.GameObjects.Image;
  private lakeFg: Phaser.GameObjects.Image[] = [];
  /** Elementos de cenário que escurecem à noite. */
  private tinted: Phaser.GameObjects.Image[] = [];

  private swimmers: Swimmer[] = [];
  private waves: Phaser.GameObjects.TileSprite[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private ripples: Ripple[] = [];
  private drops: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  private animal!: Phaser.GameObjects.Sprite;
  private rod!: Phaser.GameObjects.Graphics;
  private paw!: Phaser.GameObjects.Image;
  private bobber!: Phaser.GameObjects.Image;
  private hook!: Phaser.GameObjects.Image;
  /** Anzol debaixo de água (desce até ao fundo depois do lançamento). */
  private deepHook!: Phaser.GameObjects.Image;
  private veil!: Phaser.GameObjects.Rectangle;

  private animalId: AnimalId | null = null;
  private lastPhase: Phase | null = null;
  private saveTimer = 0;

  constructor() { super('Game'); }

  create(): void {
    // céu
    this.skyTex = this.textures.createCanvas('sky', W, WATER_Y)!;
    this.add.image(0, 0, 'sky').setOrigin(0);
    for (let i = 0; i < 60; i++) {
      const big = i % 9 === 0;
      const img = this.add.image(Math.floor(Math.random() * W), Math.floor(Math.random() * (WATER_Y - 30)), big ? TEX.starBig : TEX.starSmall);
      this.stars.push({ img, p: Math.random() * 6 });
    }
    this.sunGlow = this.add.image(0, 0, TEX.sunGlow).setBlendMode(Phaser.BlendModes.ADD);
    this.sun = this.add.image(0, 0, TEX.sun);
    this.moon = this.add.image(0, 0, TEX.moon);
    for (let i = 0; i < 5; i++) {
      const img = this.add.image(i * 100 + Math.random() * 50, 12 + Math.floor(Math.random() * 60), TEX.cloud(i % 3)).setOrigin(0);
      this.clouds.push({ img, v: 3 + Math.random() * 5 });
    }

    // Lago: colinas e pinheiros
    const hf = this.add.image(0, WATER_Y, TEX.hillsFar).setOrigin(0, 1);
    const small = [205, 292, 330, 455].map(x => this.add.image(x, WATER_Y - 12, TEX.pineSmall).setOrigin(0.5, 1));
    const hn = this.add.image(0, WATER_Y, TEX.hillsNear).setOrigin(0, 1);
    const big = [180, 248, 380, 420].map(x => this.add.image(x, WATER_Y - 3, TEX.pineBig).setOrigin(0.5, 1));
    this.lake = this.add.container(0, 0, [hf, ...small, hn, ...big]);
    this.tinted.push(hf, hn, ...small, ...big);

    // Mar: ilhas, farol, luz
    const isl = this.add.image(0, WATER_Y, TEX.islands).setOrigin(0, 1);
    this.beam = this.add.graphics();
    const lh = this.add.image(LH_X, WATER_Y + 2, TEX.lighthouse).setOrigin(0.5, 1);
    this.lampGlow = this.add.image(LH_LAMP.x, LH_LAMP.y, TEX.lampGlow).setBlendMode(Phaser.BlendModes.ADD);
    this.sea = this.add.container(0, 0, [isl, this.beam, lh, this.lampGlow]);
    this.tinted.push(isl, lh);

    // água
    this.waterTex = this.textures.createCanvas('water', W, H - WATER_Y)!;
    this.add.image(0, WATER_Y, 'water').setOrigin(0);
    for (let i = 0; i < 7; i++) {
      const img = this.add.image(0, 0, fishKey('carpa')).setTintFill(0x0a1622).setAlpha(0.28);
      const s: Swimmer = { img, v: 0 };
      this.resetSwimmer(s, true);
      this.swimmers.push(s);
    }
    for (let row = 0; row < 5; row++) {
      const ts = this.add.tileSprite(0, WATER_Y + 5 + row * 24, W, 3, TEX.wave).setOrigin(0).setAlpha(0.42 - row * 0.06);
      ts.tilePositionX = row * 11;
      this.waves.push(ts);
    }
    this.fx = this.add.graphics();

    // cais / barco
    // (ficam fora dos contentores porque têm de ser desenhados por cima da água)
    const dock = this.add.image(0, DOCK_Y, TEX.dock).setOrigin(0);
    const bucket = this.add.image(36, DOCK_Y - 9, TEX.bucket).setOrigin(0);
    this.boat = this.add.image(BOAT_X, BOAT_Y, TEX.boat).setOrigin(0);
    this.lakeFg = [dock, bucket];
    this.tinted.push(dock, bucket, this.boat);

    // pescador
    this.animal = this.add.sprite(AX, AY - 3, TEX.animal('gato'), 0).setOrigin(0.5, 1);
    this.rod = this.add.graphics();
    this.paw = this.add.image(0, 0, TEX.paw('gato'));
    this.bobber = this.add.image(0, 0, TEX.bobber).setOrigin(0.5, 0.6);
    this.hook = this.add.image(0, 0, TEX.hook).setOrigin(0.5, 0);
    this.deepHook = this.add.image(0, 0, TEX.hook).setOrigin(0.5, 0).setVisible(false);

    this.veil = this.add.rectangle(0, 0, W, H, 0x080c28).setOrigin(0).setAlpha(0).setDepth(10);

    fishing.events.on('ripple', (x, y, r, life) => this.ripples.push({ x, y, r, life }));
    fishing.events.on('splash', () => this.splash(fishing.cast.tx, WATER_Y, 12));
    fishing.events.on('hit', () => { if (fishing.phase === 'reeling') this.splash(fishing.cast.tx, WATER_Y, 5); });
    fishing.events.on('landed', ({ fish }) => this.fishJump(fishKey(fish.id)));
    this.paintSkyAndWater();
  }

  /** Gotas de água em pixel. */
  private splash(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.drops.push({ x, y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 45, life: 0.6 + Math.random() * 0.3 });
    }
  }

  /** O peixe salta da água para o pescador antes do cartão aparecer. */
  private fishJump(key: string): void {
    const x0 = fishing.cast.tx, y0 = WATER_Y, x1 = AX + 16, y1 = AY - 30;
    const img = this.add.image(x0, y0, key).setDepth(5).setFlipX(true);
    this.splash(x0, y0, 14);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 600,
      onUpdate: tw => {
        const t = tw.getValue() ?? 0;
        img.setPosition(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 60));
        img.setAngle(Math.round(Math.sin(t * Math.PI * 4) * 2) * 15);
      },
      onComplete: () => img.destroy(),
    });
  }

  private resetSwimmer(s: Swimmer, anyX: boolean): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const night = darkness() > 0.5;
    const pool = FISH.filter(f => f.zone === save.zone && f.id !== 'bota' && (!f.night || night));
    const f = pool[Math.floor(Math.random() * pool.length)];
    s.v = (8 + Math.random() * 15) * dir;
    s.img.setTexture(fishKey(f.id)).setScale(Math.random() < 0.3 ? 1 : 0.5).setFlipX(dir < 0);
    s.img.x = anyX ? DOCK_END + Math.random() * (W - DOCK_END) : dir > 0 ? DOCK_END - 20 : W + 20;
    s.img.y = Math.round(WATER_Y + 25 + Math.random() * (H - WATER_Y - 40));
  }

  private paintSkyAndWater(): void {
    const sky = skyColors();
    paintBands(this.skyTex, sky.top, sky.bottom, 12);
    const wc = waterColors(save.zone === 'mar');
    paintBands(this.waterTex, wc.top, wc.bottom, 8, mixColor(wc.top, '#ffffff', 0.35));
  }

  update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    advanceTime(dt);
    fishing.update(dt);

    this.paintTimer -= dt;
    if (this.paintTimer <= 0 || this.lastZone !== save.zone) {
      if (this.lastZone && this.lastZone !== save.zone) for (const s of this.swimmers) this.resetSwimmer(s, true);
      this.paintTimer = 0.25; this.lastZone = save.zone;
      this.paintSkyAndWater();
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vy += 140 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      if (d.life <= 0 || (d.vy > 0 && d.y > WATER_Y + 2)) this.drops.splice(i, 1);
    }

    for (const s of this.swimmers) {
      s.img.x += s.v * dt;
      if ((s.v > 0 && s.img.x > W + 25) || (s.v < 0 && s.img.x < DOCK_END - 25)) this.resetSwimmer(s, false);
    }
    for (const c of this.clouds) { c.img.x += c.v * dt; if (c.img.x > W + 10) c.img.x = -70; }
    this.waves.forEach((ts, i) => { ts.tilePositionX -= (6 + i * 2) * dt * (i % 2 ? -1 : 1); });
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]; r.r += 20 * dt; r.life -= dt;
      if (r.life <= 0) this.ripples.splice(i, 1);
    }

    this.saveTimer += dt;
    if (this.saveTimer > 5) { this.saveTimer = 0; persist(); }
    updTime();
    syncAction(fishing.phase);
    this.drawWorld();
  }

  private drawWorld(): void {
    const d = darkness(), mar = save.zone === 'mar', clock = fishing.clock;
    const sceneTint = hex(mixColor('#ffffff', '#5a6890', d));

    // estrelas, sol, lua
    for (const s of this.stars) s.img.setAlpha(d * (0.5 + 0.5 * Math.sin(clock * 2 + s.p)));
    const k = sunArc();
    const sunVisible = k !== null && d < 1;
    this.sun.setVisible(sunVisible);
    this.sunGlow.setVisible(sunVisible);
    let sunX = 0, sunY = 0;
    if (k !== null) {
      sunX = Math.round(60 + k * 380); sunY = Math.round(WATER_Y - 20 - Math.sin(Math.PI * k) * 135);
      this.sun.setPosition(sunX, sunY).setAlpha(1 - d);
      this.sunGlow.setPosition(sunX, sunY).setAlpha((1 - d) * (0.12 + duskAmount() * 0.3));
      this.sun.setTint(hex(mixColor('#ffffff', '#ff9a5a', duskAmount())));
    }
    const m = moonArc();
    this.moon.setVisible(d > 0.1).setAlpha(d)
      .setPosition(Math.round(60 + m * 380), Math.round(WATER_Y - 30 - Math.sin(Math.PI * m) * 120));
    const cloudTint = hex(mixColor(mixColor('#ffffff', '#ffc9a0', duskAmount()), '#4a5578', d));
    for (const c of this.clouds) c.img.setTint(cloudTint).setAlpha(0.95 - d * 0.5);

    // zona
    this.lake.setVisible(!mar);
    this.sea.setVisible(mar);
    this.boat.setVisible(mar);
    for (const img of this.lakeFg) img.setVisible(!mar);
    for (const img of this.tinted) img.setTint(sceneTint);

    // farol
    const lampOn = d > 0.3;
    this.lampGlow.setVisible(mar && lampOn).setAlpha(d * (0.6 + 0.4 * Math.sin(clock * 3)));
    this.beam.clear();
    if (mar && lampOn) {
      const a = Math.PI + Math.sin(clock * 0.8) * 0.9, len = 170, spread = 0.09;
      this.beam.fillStyle(0xfff3c0, 0.14 * d);
      this.beam.fillTriangle(LH_LAMP.x, LH_LAMP.y,
        LH_LAMP.x + Math.cos(a - spread) * len, LH_LAMP.y + Math.sin(a - spread) * len * 0.25,
        LH_LAMP.x + Math.cos(a + spread) * len, LH_LAMP.y + Math.sin(a + spread) * len * 0.25);
    }

    // barco a balançar
    const bob = mar ? Math.round(Math.sin(clock * 1.5)) : 0;
    this.boat.y = BOAT_Y + bob;

    // reflexos e ondulações
    const g = this.fx;
    g.clear();
    if (sunVisible) {
      g.fillStyle(0xffe9a0, (1 - d) * 0.45);
      for (let i = 0; i < 6; i++) {
        const w = 10 - i * 1.2 + Math.round(Math.sin(clock * 3 + i) * 2);
        g.fillRect(Math.round(sunX - w / 2 + Math.sin(clock * 2 + i) * 2), WATER_Y + 3 + i * 5, Math.max(2, Math.round(w)), 1);
      }
    }
    if (d > 0.3) {
      const mx = this.moon.x;
      g.fillStyle(0xf2efe0, d * 0.3);
      for (let i = 0; i < 5; i++) g.fillRect(Math.round(mx - 4 + Math.sin(clock * 2 + i) * 2), WATER_Y + 3 + i * 6, 7 - i, 1);
    }
    for (const r of this.ripples) {
      g.fillStyle(0xffffff, Math.max(0, Math.min(1, r.life)));
      const rx = r.r * 1.8, ry = Math.max(1, r.r * 0.5), n = Math.max(12, Math.round(rx * 3));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.fillRect(Math.round(r.x + Math.cos(a) * rx), Math.round(r.y + Math.sin(a) * ry), 1, 1);
      }
    }

    for (const dr of this.drops) {
      g.fillStyle(0xdff3ff, Math.min(1, dr.life * 2));
      g.fillRect(Math.round(dr.x), Math.round(dr.y), 1, dr.vy < 0 ? 2 : 1);
    }

    this.drawFisher(bob, d);
    this.veil.setAlpha(0.22 * d);
  }

  private drawFisher(bob: number, d: number): void {
    const id = save.animal;
    const show = !!id;
    this.animal.setVisible(show); this.paw.setVisible(show); this.rod.clear();
    if (!id) { this.bobber.setVisible(false); this.hook.setVisible(false); this.deepHook.setVisible(false); return; }

    if (id !== this.animalId) {
      this.animalId = id; this.lastPhase = null;
      this.paw.setTexture(TEX.paw(id));
    }
    this.animal.setPosition(AX, AY - 3 + bob);
    const fisherTint = hex(mixColor('#ffffff', '#8a94c0', d));
    this.animal.setTint(fisherTint); this.paw.setTint(fisherTint);

    // animação derivada da fase
    const ph = fishing.phase;
    if (ph !== this.lastPhase) {
      if (ph === 'charging') this.animal.stop();
      else if (ph === 'casting') this.animal.play(`${id}_cast`);
      else if (ph === 'reeling') this.animal.play(`${id}_reel`);
      this.lastPhase = ph;
    }
    // a carregar: inclina-se mais para trás quanto maior a força
    if (ph === 'charging') this.animal.setTexture(TEX.animal(id), ANIM_FRAMES.charge[fishing.power < 0.45 ? 0 : 1]);
    // nas restantes fases respira (depois de o lançamento acabar)
    const idleKey = `${id}_idle`;
    const cur = this.animal.anims.currentAnim?.key, playing = this.animal.anims.isPlaying;
    if (!['charging', 'casting', 'reeling'].includes(ph) && !(playing && (cur === idleKey || cur === `${id}_cast`))) {
      this.animal.play(idleKey);
    }

    // a cana e a pata seguem a pose do corpo neste frame
    const po = pawOffset(Number(this.animal.frame.name) || 0), base = pawOffset(0);
    fishing.pawShift = { x: po.x - base.x, y: po.y - base.y };

    // cana (2 px: madeira clara por cima, escura por baixo)
    const b = fishing.rodBase(), tip = fishing.rodTip();
    const bx = b.x, by = b.y + bob, tx = tip.x, ty = tip.y + bob;
    const g = this.rod;
    const plot = (c: number) => (x: number, y: number) => { g.fillStyle(c); g.fillRect(x, y, 1, 1); };
    bresenham(bx, by + 1, tx, ty + 1, plot(0x4a2e14));
    bresenham(bx, by, tx, ty, plot(0xa8743c));
    // carreto
    const rx = Math.round(bx + Math.cos(fishing.rodA) * 9), ry = Math.round(by + Math.sin(fishing.rodA) * 9);
    g.fillStyle(0x222222); g.fillRect(rx - 1, ry + 1, 3, 3);
    g.fillStyle(0x888888); g.fillRect(rx, ry + 1, 1, 1);
    this.paw.setPosition(Math.round(AX + po.x + Math.cos(fishing.rodA) * 3), Math.round(AY - 3 + po.y + bob + Math.sin(fishing.rodA) * 3));

    // linha e boia
    const bp = fishing.bobberPos();
    const lineCol = 0xe8f0f5;
    if (bp) {
      const sag = ph === 'reeling' ? 2 : 20;
      const cx = (tx + bp.x) / 2, cy = Math.max(ty, bp.y) + sag;
      let px = tx, py = ty;
      for (let i = 1; i <= 20; i++) {
        const t = i / 20;
        const x = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * bp.x;
        const y = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * bp.y;
        bresenham(px, py, x, y, (qx, qy) => { g.fillStyle(lineCol, 0.85); g.fillRect(qx, qy, 1, 1); });
        px = x; py = y;
      }
      this.bobber.setVisible(true).setPosition(Math.round(bp.x), Math.round(bp.y));
      this.bobber.setTint(hex(mixColor('#ffffff', '#c0c8e8', d)));
      this.hook.setVisible(false);
      if (d > 0.5) { g.fillStyle(0xff7878, 0.25); g.fillCircle(Math.round(bp.x), Math.round(bp.y) - 2, 5); }

      // linha debaixo de água até ao anzol (pontilhada, mais apagada)
      const hp = fishing.hookPos();
      if (hp) {
        let i = 0;
        bresenham(bp.x, bp.y + 3, hp.x, hp.y, (qx, qy) => { if (i++ % 2 === 0) { g.fillStyle(lineCol, 0.45); g.fillRect(qx, qy, 1, 1); } });
        this.deepHook.setVisible(true).setPosition(Math.round(hp.x), Math.round(hp.y)).setAlpha(0.9);
      } else this.deepHook.setVisible(false);
    } else {
      bresenham(tx, ty, tx, ty + 22, (qx, qy) => { g.fillStyle(lineCol, 0.85); g.fillRect(qx, qy, 1, 1); });
      this.bobber.setVisible(false);
      this.deepHook.setVisible(false);
      this.hook.setVisible(true).setPosition(Math.round(tx), Math.round(ty + 22));
    }
  }
}
