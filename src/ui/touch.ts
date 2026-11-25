import { audioInit } from '../audio/sfx';
import { cap } from '../state/formulas';
import { save } from '../state/save';
import { fishing, type Phase } from '../systems/FishingController';
import { $, isShown } from './dom';
import { closeCatch } from './catchCard';

// Controlos de telemóvel: botão de ação grande para o polegar, menu ⚙️ e vibração.

/** true em ecrãs táteis (telemóvel / tablet). */
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

const vibrate = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };

export function initTouch(): void {
  // ----- botão de ação (faz o mesmo que segurar o Espaço) -----
  const btn = $<HTMLButtonElement>('bAction');
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add('held');
    audioInit();
    if (isShown('ovCatch')) { closeCatch(); return; }
    fishing.press();
  });
  const up = () => { btn.classList.remove('held'); fishing.release(); };
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  $('stage').addEventListener('contextmenu', e => e.preventDefault());

  // ----- menu ⚙️ (Animal, Música, Som) -----
  const more = $('bMore'), menu = $('moreMenu');
  const setOpen = (open: boolean) => { menu.classList.toggle('open', open); more.setAttribute('aria-expanded', String(open)); };
  more.addEventListener('click', e => { e.stopPropagation(); setOpen(!menu.classList.contains('open')); });
  menu.addEventListener('click', e => { if ((e.target as HTMLElement).closest('#bAnimal')) setOpen(false); });
  document.addEventListener('pointerdown', e => {
    if (!menu.classList.contains('open')) return;
    const t = e.target as HTMLElement;
    if (!t.closest('#moreMenu') && !t.closest('#bMore')) setOpen(false);
  });

  // ----- vibração nos momentos importantes (Android; o iOS ignora) -----
  fishing.events.on('bite', () => vibrate([40, 40, 80]));
  fishing.events.on('hit', () => { if (fishing.phase === 'reeling') vibrate(15); });
  fishing.events.on('landed', () => vibrate([30, 60, 30, 60, 120]));
}

let lastKey = '';
/** Atualiza o texto e a cor do botão de ação conforme a fase (chamado a cada frame). */
export function syncAction(phase: Phase): void {
  const full = phase === 'idle' && save.bucket.length >= cap();
  const [label, cls] =
    phase === 'charging' ? ['Larga para lançar!', 'hot'] :
    phase === 'casting' || phase === 'waiting' ? ['Espera pela mordida…', 'wait'] :
    phase === 'bite' ? ['Agora! Toca!', 'hot'] :
    phase === 'reeling' ? ['Toca na zona verde!', 'hot'] :
    phase === 'result' ? ['Muito bem!', 'wait'] :
    full ? ['Balde cheio: vende 💰', 'wait'] :
    ['Segura para lançar', ''];
  const key = label + cls;
  if (key === lastKey) return;
  lastKey = key;
  $('actLabel').textContent = label;
  const b = $('bAction');
  b.classList.toggle('hot', cls === 'hot');
  b.classList.toggle('wait', cls === 'wait');
}
