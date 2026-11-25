import { W } from '../config';
import { sfx } from '../audio/sfx';
import { UPG } from '../data/upgrades';
import { float, notifyState } from '../state/events';
import { upgCost } from '../state/formulas';
import { persist, save } from '../state/save';
import { $ } from './dom';

export function buildShop(): void {
  $('shopCoins').textContent = `Tens 🪙 ${save.coins} moedas.`;
  const list = $('shopList');
  list.innerHTML = '';
  for (const u of UPG) {
    const l = save.upg[u.id], maxed = l >= u.max, cost = upgCost(u, l);
    const row = document.createElement('div');
    row.className = 'shopRow';
    row.dataset.upg = u.id;
    row.innerHTML = `<div class="ic">${u.icon}</div>
      <div><div class="nm">${u.name} <span class="dots">${'●'.repeat(l)}${'○'.repeat(u.max - l)}</span></div>
      <div class="ef">${maxed ? u.fx(l) + ' (máximo)' : `${u.fx(l)} → <b>${u.fx(l + 1)}</b>`}</div></div>`;
    const b = document.createElement('button');
    b.textContent = maxed ? 'Máx.' : `🪙 ${cost}`;
    b.disabled = maxed || save.coins < cost;
    b.onclick = () => {
      if (save.coins < cost || maxed) return;
      save.coins -= cost;
      save.upg[u.id]++;
      persist(); sfx.buy(); notifyState(); buildShop();
      if (u.id === 'barco') float('Barco comprado! Usa o botão "Ir ao Mar"', W / 2, 100, '#ffd23f');
    };
    row.appendChild(b);
    list.appendChild(row);
  }
}
