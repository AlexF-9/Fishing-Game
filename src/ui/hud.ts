import { ANIMALS } from '../data/animals';
import { bucketTotal, cap, isNight } from '../state/formulas';
import { save } from '../state/save';
import { $ } from './dom';
import { applyVolumes } from '../audio/mixer';

export function updHud(): void {
  const a = save.animal ? ANIMALS[save.animal] : null;
  $('hAnimal').textContent = a ? `${a.emoji} ${a.name}` : '🐾 ?';
  $('hAnimal').title = a ? a.perk : '';
  $('hCoins').textContent = `🪙 ${save.coins}`;
  $('hBucket').textContent = `🪣 ${save.bucket.length}/${cap()}`;
  $('hZone').textContent = save.zone === 'mar' ? '🌊 Mar' : '🏞️ Lago';
  const total = bucketTotal();
  const sell = $<HTMLButtonElement>('bSell');
  sell.textContent = total ? `Vender (+${total} 🪙)` : 'Vender';
  sell.disabled = !save.bucket.length;
  $('bZone').style.display = save.upg.barco ? '' : 'none';
  $('bZone').textContent = save.zone === 'mar' ? '🏞️ Ir ao Lago' : '⛵ Ir ao Mar';
  $('bMute').textContent = save.mute ? '🔇' : '🔊';
  $('bMusic').classList.toggle('off', !save.music || save.mute);
  $('bMusic').title = save.music ? 'Música: ligada' : 'Música: desligada';
  applyVolumes();
  updTime(true);
}

let lastTimeIcon = '';
/** Atualiza o indicador Dia/Noite só quando muda. */
export function updTime(force = false): void {
  const ic = isNight() ? '🌙 Noite' : '☀️ Dia';
  if (force || ic !== lastTimeIcon) { $('hTime').textContent = ic; lastTimeIcon = ic; }
}
