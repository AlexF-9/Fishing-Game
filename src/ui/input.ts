import { W } from '../config';
import { audioInit, sfx } from '../audio/sfx';
import { bus, float, notifyState } from '../state/events';
import { bucketTotal } from '../state/formulas';
import { persist, resetSave, save } from '../state/save';
import { fishing } from '../systems/FishingController';
import { buildBook } from './book';
import { closeCatch, showCatch } from './catchCard';
import { $, hide, isShown, overlayOpen, show } from './dom';
import { updHud } from './hud';
import { buildSelect } from './selectPanel';
import { buildShop } from './shop';
import { initTouch } from './touch';

function sell(): void {
  if (!save.bucket.length) return;
  const total = bucketTotal();
  save.coins += total;
  save.bucket = [];
  persist(); notifyState(); sfx.coin();
  float(`+${total} moedas`, W / 2 + 20, 100, '#ffd23f');
}

function toggleZone(): void {
  if (!save.upg.barco) return;
  if (!['idle', 'charging'].includes(fishing.phase) || overlayOpen()) return;
  fishing.resetPhase();
  save.zone = save.zone === 'mar' ? 'lago' : 'mar';
  persist(); notifyState();
  float(save.zone === 'mar' ? 'Bem-vindo ao Mar Profundo!' : 'De volta ao Lago', W / 2, 100, '#ffffff');
}

/** Liga HUD, overlays, teclado e ponteiro ao controlador de pesca. */
export function initUI(): void {
  fishing.isPaused = overlayOpen;
  bus.on('state', updHud);

  // sons e cartão a partir dos eventos do controlador
  const ev = fishing.events;
  ev.on('cast', sfx.cast);
  ev.on('splash', sfx.splash);
  ev.on('bite', sfx.bite);
  ev.on('hookBottom', sfx.bottom);
  ev.on('hit', sfx.hit);
  ev.on('miss', sfx.miss);
  ev.on('blocked', sfx.miss);
  ev.on('lose', sfx.lose);
  // o cartão aparece depois de o peixe saltar da água (~0,65 s)
  ev.on('landed', info => { sfx.catch(); window.setTimeout(() => showCatch(info), 650); });

  $('bSell').onclick = () => { audioInit(); sell(); };
  $('bShop').onclick = () => { audioInit(); buildShop(); show('ovShop'); };
  $('bBook').onclick = () => { buildBook(); show('ovBook'); };
  $('bZone').onclick = () => { audioInit(); toggleZone(); };
  $('bAnimal').onclick = () => { if (fishing.phase === 'result') return; buildSelect(); show('ovSelect'); };
  $('bMute').onclick = () => { audioInit(); save.mute = !save.mute; persist(); updHud(); };
  $('bMusic').onclick = () => { audioInit(); save.music = !save.music; persist(); updHud(); };
  $('bSelClose').onclick = () => hide('ovSelect');
  $('bCatchOk').onclick = closeCatch;

  let resetArmed = false;
  let resetTimer = 0;
  const bReset = $('bReset');
  bReset.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      bReset.textContent = 'Tens a certeza? Carrega outra vez';
      resetTimer = window.setTimeout(() => { resetArmed = false; bReset.textContent = 'Recomeçar do zero'; }, 3000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    bReset.textContent = 'Recomeçar do zero';
    resetSave();
    fishing.resetPhase();
    updHud();
    buildSelect();
  };

  document.querySelectorAll<HTMLElement>('[data-close]').forEach(b => {
    b.onclick = () => b.closest('.overlay')!.classList.remove('show');
  });
  // abrir uma janela interrompe o lançamento
  for (const id of ['bShop', 'bBook', 'bAnimal']) $(id).addEventListener('click', () => fishing.cancelCharge());

  // qualquer primeira interação (clique ou tecla) desbloqueia o áudio e arranca a música
  window.addEventListener('pointerdown', audioInit, { capture: true });
  window.addEventListener('keydown', audioInit, { capture: true });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      if (isShown('ovCatch')) { closeCatch(); return; }
      audioInit();
      fishing.press();
    } else if (e.key === 'Escape') {
      if (isShown('ovCatch')) closeCatch();
      hide('ovShop'); hide('ovBook');
      if (save.animal) hide('ovSelect');
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); fishing.release(); }
  });
  // carregar no ecrã de jogo (o canvas do Phaser) — as janelas ficam por cima
  $('stage').addEventListener('pointerdown', e => {
    if (!(e.target instanceof HTMLCanvasElement)) return;
    e.preventDefault();
    audioInit();
    fishing.press();
  });
  window.addEventListener('pointerup', () => fishing.release());
  window.addEventListener('blur', () => fishing.release());

  // evita que o Espaço "carregue" no último botão focado
  document.querySelectorAll('button').forEach(b => {
    b.addEventListener('keydown', e => { if (e.code === 'Space') e.preventDefault(); });
    b.addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); });
  });

  initTouch();
  updHud();
  if (!save.animal) { buildSelect(); show('ovSelect'); }
}
