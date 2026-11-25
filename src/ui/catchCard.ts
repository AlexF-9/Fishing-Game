import { CARD_H, CARD_W, catchArt } from '../art/portraits';
import { RAR } from '../data/rarities';
import type { Landed } from '../systems/FishingController';
import { fishing } from '../systems/FishingController';
import { $, hide, show } from './dom';

export function showCatch({ fish: f, kg, val, isNew, record }: Landed): void {
  const rr = RAR[f.r];
  $('catchRar').textContent = rr.name;
  $('catchRar').style.color = rr.color;
  $('catchName').textContent = f.name;
  $('catchBadges').innerHTML =
    (isNew ? '<span class="badge">NOVO!</span>' : '') + (record ? '<span class="badge">🏆 RECORDE</span>' : '');
  $('catchInfo').innerHTML = `⚖️ <b>${kg} kg</b> &nbsp;·&nbsp; 🪙 <b>${val}</b> moedas`;
  $('catchCard').style.boxShadow = `0 0 0 4px ${rr.color}, 0 12px 30px rgba(0,0,0,.45)`;

  const cv = $<HTMLCanvasElement>('catchCv');
  cv.width = CARD_W; cv.height = CARD_H;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, CARD_W, CARD_H);
  c.drawImage(catchArt(f).flush(), 0, 0);
  cv.dataset.fish = f.id;
  show('ovCatch');
}

export function closeCatch(): void {
  hide('ovCatch');
  fishing.closeResult();
}
