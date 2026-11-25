import { FISH, type Fish } from '../data/fish';
import { RAR } from '../data/rarities';
import type { Upgrade } from '../data/upgrades';
import { save } from './save';
import { SINKER_PER_LEVEL } from '../config';

export const cap       = () => 5 + save.upg.balde * 3;
/** Alcance máximo em píxeis do jogo (metade dos valores originais 230 + l·80). */
export const maxDist   = (l = save.upg.linha) => 115 + l * 40;
export const zoneMult  = () => (1 + save.upg.cana * 0.12) * (save.animal === 'gato' ? 1.15 : 1);
export const waitMult  = () => (1 - save.upg.isco * 0.12) * (save.animal === 'pinguim' ? 0.75 : 1);
export const valueMult = () => (save.animal === 'urso' ? 1.25 : 1);
export const upgCost   = (u: Upgrade, l: number) => Math.round((u.base * Math.pow(u.mult, l)) / 5) * 5;
export const bucketTotal = () => save.bucket.reduce((s, b) => s + b.v, 0);

/** 0 = dia pleno, 1 = noite plena. */
export function darkness(t = save.time): number {
  if (t < 0.55) return 0;
  if (t < 0.67) return (t - 0.55) / 0.12;
  if (t < 0.92) return 1;
  return 1 - (t - 0.92) / 0.08;
}
export const isNight = () => darkness() > 0.5;

/** Profundidade extra dada pela Chumbada (em unidades de profundidade). */
export const sinkerBonus = (l = save.upg.chumbo) => l * SINKER_PER_LEVEL;

/** Sorte total: Amuleto + talento da Lontra + profundidade a que o anzol chegou (distância + Chumbada). */
export const luck = (depth: number) => save.upg.sorte * 0.25 + (save.animal === 'lontra' ? 0.4 : 0) + depth * 0.8;
/** Multiplicador mostrado no fundo: cada raridade acima de Comum pesa (1 + sorte/2)× mais por nível. */
export const luckMult = (depth: number) => 1 + luck(depth) * 0.5;
/** Profundidade em metros (para mostrar ao jogador). */
export const depthMeters = (depth: number) => Math.max(1, Math.round(depth * 40));

/** depth: distância do lançamento (0–1 do alcance máximo possível) + Chumbada (até +1). */
export function chooseFish(depth: number): Fish {
  const night = isNight();
  const pool = FISH.filter(f => f.zone === save.zone && (!f.night || night));
  const L = luck(depth);
  const tiers = [0, 1, 2, 3, 4].filter(t => pool.some(f => f.r === t));
  const ws = tiers.map(t => RAR[t].weight * Math.pow(1 + L * 0.5, t));
  let x = Math.random() * ws.reduce((a, b) => a + b, 0);
  let tier = tiers[0];
  for (let i = 0; i < tiers.length; i++) { x -= ws[i]; if (x <= 0) { tier = tiers[i]; break; } }
  const opts = pool.filter(f => f.r === tier);
  return opts[Math.floor(Math.random() * opts.length)];
}
