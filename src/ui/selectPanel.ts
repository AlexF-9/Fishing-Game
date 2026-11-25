import { animalPortrait } from '../art/portraits';
import { sfx, audioInit } from '../audio/sfx';
import { ANIMALS, ANIMAL_IDS } from '../data/animals';
import { notifyState } from '../state/events';
import { persist, save } from '../state/save';
import { $, hide } from './dom';

export function buildSelect(): void {
  const box = $('animals');
  box.innerHTML = '';
  for (const k of ANIMAL_IDS) {
    const a = ANIMALS[k];
    const el = document.createElement('div');
    el.className = 'animal' + (save.animal === k ? ' sel' : '');
    el.dataset.animal = k;
    el.appendChild(animalPortrait(k));
    el.insertAdjacentHTML('beforeend', `<b>${a.emoji} ${a.name}</b><small>${a.perk}</small>`);
    el.onclick = () => {
      audioInit();
      save.animal = k;
      persist(); notifyState();
      hide('ovSelect');
      sfx.buy();
    };
    box.appendChild(el);
  }
  $('bSelClose').style.display = save.animal ? '' : 'none';
}
