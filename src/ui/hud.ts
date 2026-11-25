import { ANIMALS } from '../data/animals';
import { bucketTotal, cap, isNight } from '../state/formulas';
import { save } from '../state/save';
import { $ } from './dom';
import { applyVolumes } from '../audio/mixer';

// Os textos dentro de <span class="lbl"> escondem-se em ecrãs estreitos (fica só o ícone);
// os de <span class="menu-lbl"> só aparecem dentro do menu ⚙️ do telemóvel.
const lbl = (s: string) => `<span class="lbl">${s}</span>`;
const menuLbl = (s: string) => `<span class="menu-lbl">${s}</span>`;

export function updHud(): void {
  const a = save.animal ? ANIMALS[save.animal] : null;
  $('hAnimal').innerHTML = a ? `${a.emoji}${lbl(' ' + a.name)}` : '🐾 ?';
  $('hAnimal').title = a ? a.perk : '';
  $('hCoins').textContent = `🪙 ${save.coins}`;
  $('hBucket').textContent = `🪣 ${save.bucket.length}/${cap()}`;
  $('hZone').textContent = save.zone === 'mar' ? '🌊 Mar' : '🏞️ Lago';
  const total = bucketTotal();
  const sell = $<HTMLButtonElement>('bSell');
  sell.innerHTML = `💰${lbl(' Vender')}${total ? ` +${total}` : ''}`;
  sell.disabled = !save.bucket.length;
  $('bZone').style.display = save.upg.barco ? '' : 'none';
  $('bZone').innerHTML = save.zone === 'mar' ? `🏞️${lbl(' Ir ao Lago')}` : `⛵${lbl(' Ir ao Mar')}`;
  $('bZone').setAttribute('aria-label', save.zone === 'mar' ? 'Ir ao Lago' : 'Ir ao Mar');
  $('bMute').innerHTML = `${save.mute ? '🔇' : '🔊'}${menuLbl(save.mute ? ' Som desligado' : ' Som ligado')}`;
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
