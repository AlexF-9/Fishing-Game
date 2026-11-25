import Phaser from 'phaser';
import { FONT_KEY, fontText } from '../art/font';
import { TEX } from '../art/registerAll';
import { AX, AY, W, WATER_Y } from '../config';
import { RAR } from '../data/rarities';
import { bus } from '../state/events';
import { save } from '../state/save';
import { depthMeters, luckMult } from '../state/formulas';
import { hex } from '../systems/DayNight';
import { fishing } from '../systems/FishingController';
import { overlayOpen } from '../ui/dom';

interface Floater { text: Phaser.GameObjects.BitmapText; life: number }

/**
 * Interface dentro do canvas, por cima do mundo: barra de força, "!", minijogo,
 * textos flutuantes e dica — tudo em pixel art com a fonte bitmap gerada.
 */
export class UIScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private hint!: Phaser.GameObjects.BitmapText;
  private bang!: Phaser.GameObjects.Image;
  private forca!: Phaser.GameObjects.BitmapText;
  private reelTitle!: Phaser.GameObjects.BitmapText;
  private missTxt!: Phaser.GameObjects.BitmapText;
  private floats: Floater[] = [];
  private depthTxt!: Phaser.GameObjects.BitmapText;
  private luckTxt!: Phaser.GameObjects.BitmapText;
  /** Tempo do "salto" do rótulo de sorte quando o anzol chega ao fundo. */
  private pop = 0;

  constructor() { super('UI'); }

  private text(x: number, y: number, s: string, color = '#ffffff'): Phaser.GameObjects.BitmapText {
    return this.add.bitmapText(x, y, FONT_KEY, fontText(s)).setLetterSpacing(-1).setTint(hex(color)).setOrigin(0.5);
  }

  create(): void {
    this.g = this.add.graphics();
    this.hint = this.text(W / 2 + 60, 24, 'Mantém ESPAÇO para lançar');
    this.bang = this.add.image(0, 0, TEX.bang).setOrigin(0.5, 1);
    this.forca = this.text(0, 0, 'FORÇA').setOrigin(0.5, 1);
    this.reelTitle = this.text(W / 2, 27, 'PUXA! Carrega na zona verde');
    this.missTxt = this.text(0, 0, '', '#ff8080').setOrigin(1, 0.5);

    this.depthTxt = this.text(0, 0, '', '#cfe3ef').setOrigin(0, 0.5);
    this.luckTxt = this.text(0, 0, '').setOrigin(0, 0.5);
    fishing.events.on('hookBottom', () => { this.pop = 0.35; });

    bus.on('float', (s, x, y, color) => {
      // empilha textos que nasceriam em cima uns dos outros
      while (this.floats.some(f => Math.abs(f.text.y - y) < 10 && Math.abs(f.text.x - x) < 120)) y -= 11;
      const t = this.text(x, y, s, color);
      const half = t.width / 2 + 2;
      t.x = Math.round(Phaser.Math.Clamp(x, half, W - half));
      this.floats.push({ text: t, life: 1.8 });
    });
  }

  update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    const g = this.g, ph = fishing.phase, clock = fishing.clock;
    g.clear();

    // dica
    this.hint.setVisible(ph === 'idle' && !!save.animal && !overlayOpen());
    this.hint.setAlpha(Math.sin(clock * 3) > -0.3 ? 1 : 0.55);

    // barra de força
    this.forca.setVisible(ph === 'charging');
    if (ph === 'charging') {
      const x = AX - 50, y = AY - 96, h = 76;
      g.fillStyle(0x000000, 0.7); g.fillRect(x - 1, y - 1, 14, h + 2);
      g.fillStyle(0x1d2b38); g.fillRect(x, y, 12, h);
      const fill = Math.round((h - 4) * fishing.power);
      // degradê em degraus: verde → amarelo → vermelho
      for (let i = 0; i < fill; i++) {
        const t = i / (h - 4);
        g.fillStyle(t < 0.55 ? 0x5bd16b : t < 0.8 ? 0xffd23f : 0xff5d3b);
        g.fillRect(x + 2, y + h - 3 - i, 8, 1);
      }
      g.fillStyle(0xffffff, 0.35); g.fillRect(x + 2, y + h - 2 - fill, 2, fill);
      this.forca.setPosition(x + 6, y - 2);
      // previsão do alcance (elipse pontilhada)
      const px = fishing.previewX();
      g.fillStyle(0xffd23f, 0.8);
      for (let i = 0; i < 16; i += 1) {
        if (i % 2) continue;
        const a = (i / 16) * Math.PI * 2;
        g.fillRect(Math.round(px + Math.cos(a) * 7), Math.round(WATER_Y + 3 + Math.sin(a) * 2), 1, 1);
      }
    }

    // "!" da mordida
    const bp = fishing.bobberPos();
    this.bang.setVisible(ph === 'bite' && !!bp);
    if (ph === 'bite' && bp) this.bang.setPosition(Math.round(bp.x), Math.round(bp.y - 10 - Math.abs(Math.sin(clock * 12)) * 4));

    // minijogo
    const r = fishing.reel;
    const reeling = ph === 'reeling' && !!r;
    this.reelTitle.setVisible(reeling);
    this.missTxt.setVisible(reeling);
    if (reeling && r) {
      const rr = RAR[r.fish.r];
      const bx = 140, by = 38, bw = 200, bh = 14;
      g.fillStyle(0x000000, 0.6); g.fillRect(bx - 8, by - 19, bw + 16, bh + 38);
      g.fillStyle(hex(r.flash > 0 ? r.flashCol : rr.color)); g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      g.fillStyle(0x1d2b38); g.fillRect(bx, by, bw, bh);
      const zx = bx + Math.round((r.zc - r.zw / 2) * bw), zw = Math.round(r.zw * bw);
      g.fillStyle(0x4cc76a); g.fillRect(zx, by + 2, zw, bh - 4);
      g.fillStyle(0x7be07b); g.fillRect(zx, by + 2, zw, 1);
      const mx = bx + Math.round(r.p * bw);
      g.fillStyle(0x000000); g.fillRect(mx - 2, by - 4, 5, bh + 8);
      g.fillStyle(0xffffff); g.fillRect(mx - 1, by - 3, 3, bh + 6);
      for (let i = 0; i < r.need; i++) {
        const cx = W / 2 - (r.need - 1) * 7 + i * 14, cy = by + bh + 9;
        g.fillStyle(0x000000); g.fillRect(cx - 4, cy - 4, 9, 9);
        g.fillStyle(i < r.hits ? 0x4cc76a : 0x3a4652); g.fillRect(cx - 3, cy - 3, 7, 7);
        if (i < r.hits) { g.fillStyle(0x9af0a8); g.fillRect(cx - 2, cy - 2, 2, 2); }
      }
      this.missTxt.setText('✖'.repeat(r.miss) + '·'.repeat(3 - r.miss)).setPosition(bx + bw, by + bh + 10);
    }

    // profundidade e multiplicador de sorte, ao lado do anzol quando chega ao fundo
    const hp = fishing.hookPos();
    const showLuck = !!hp && fishing.sink >= 1;
    this.depthTxt.setVisible(showLuck);
    this.luckTxt.setVisible(showLuck);
    if (showLuck && hp) {
      this.pop = Math.max(0, this.pop - dt);
      const mult = luckMult(fishing.cast.depth);
      const tier = mult < 1.2 ? 0 : mult < 1.4 ? 1 : mult < 1.6 ? 2 : mult < 1.85 ? 3 : 4;
      this.depthTxt.setText(fontText(`${depthMeters(fishing.cast.depth)} m`));
      this.luckTxt.setText(fontText(`Sorte x${mult.toFixed(1).replace('.', ',')}`)).setTint(hex(RAR[tier].color));
      const w = Math.max(this.depthTxt.width, this.luckTxt.width);
      const right = hp.x + 8 + w < W - 4;
      const x = Math.round(right ? hp.x + 8 : hp.x - 8 - w);
      const y = Math.round(Math.min(hp.y, 300 - 16) - (this.pop > 0 ? Math.sin((this.pop / 0.35) * Math.PI) * 4 : 0));
      this.depthTxt.setPosition(x, y - 4);
      this.luckTxt.setPosition(x, y + 6);
      // pequena moldura escura para ler bem sobre a água
      g.fillStyle(0x0a1622, 0.55); g.fillRect(x - 3, y - 10, w + 5, 22);
    }

    // textos flutuantes
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      f.text.y -= 11 * dt;
      f.text.setAlpha(Math.min(1, f.life));
      if (f.life <= 0) { f.text.destroy(); this.floats.splice(i, 1); }
    }
  }
}
