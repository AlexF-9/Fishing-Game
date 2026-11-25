import Phaser from 'phaser';
import { registerAll } from '../art/registerAll';

/** Gera todas as texturas em pixel art e arranca o jogo. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    registerAll(this);
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
