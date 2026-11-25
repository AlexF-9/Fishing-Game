import { fishPortrait } from '../art/portraits';
import { FISH } from '../data/fish';
import { RAR } from '../data/rarities';
import { save } from '../state/save';
import { $ } from './dom';

export function buildBook(): void {
  const grid = $('bookGrid');
  grid.innerHTML = '';
  const caught = FISH.filter(f => save.book[f.id]).length;
  $('bookCount').textContent = `Descobriste ${caught} de ${FISH.length} peixes.`;
  for (const zone of ['lago', 'mar'] as const) {
    grid.insertAdjacentHTML('beforeend',
      `<h3 class="zoneTitle">${zone === 'lago' ? '🏞️ Lago' : '🌊 Mar Profundo' + (save.upg.barco ? '' : ' (precisas de barco)')}</h3>`);
    for (const f of FISH.filter(x => x.zone === zone)) {
      const b = save.book[f.id], rr = RAR[f.r];
      const cell = document.createElement('div');
      cell.className = 'fishCell';
      cell.dataset.fish = f.id;
      cell.style.borderColor = b ? rr.color : '#e6e0d6';
      cell.appendChild(fishPortrait(f, !b));
      cell.insertAdjacentHTML('beforeend', b
        ? `<b>${f.name}</b><small style="color:${rr.color};font-weight:700">${rr.name}</small><small>Apanhados: ${b.n} · Recorde: ${b.best} kg</small>`
        : `<b>???</b><small style="color:${rr.color};font-weight:700">${rr.name}</small><small>${f.night ? '🌙 Só aparece à noite' : 'Ainda por descobrir'}</small>`);
      grid.appendChild(cell);
    }
  }
}
