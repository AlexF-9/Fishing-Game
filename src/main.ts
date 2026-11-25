import Phaser from 'phaser';
import './ui/styles.css';
import { H, W } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { initUI } from './ui/input';
import { fishing } from './systems/FishingController';
import { save } from './state/save';
import { chooseFish } from './state/formulas';
import { getBuses, onUnlock } from './audio/mixer';
import { music, startMusic } from './audio/music/MusicDirector';

initUI();
// a banda sonora arranca com a primeira interação (política de autoplay)
onUnlock(startMusic);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: W,
  height: H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // o teclado e o ponteiro são tratados em ui/input.ts (DOM), como no jogo original
  input: { keyboard: false },
  scene: [BootScene, GameScene, UIScene],
});

// acesso para testes no browser
(window as unknown as { __pescaria: unknown }).__pescaria = { game, fishing, save, chooseFish, music, getBuses };
