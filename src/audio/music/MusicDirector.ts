import { darkness } from '../../state/formulas';
import { save } from '../../state/save';
import { fishing } from '../../systems/FishingController';
import { overlayOpen } from '../../ui/dom';
import { ensureAudio, getBuses } from '../mixer';
import { Deck } from './Deck';
import { STYLES, type StyleId } from './styles';

/**
 * Diretor musical: lê o estado do jogo e decide o que toca e quando muda.
 *
 * - Zona (Lago/Mar): troca no compasso seguinte, com 1 compasso de transição.
 * - Dia/Noite: o filtro geral vai fechando com o escurecer; quando a noite passa de metade,
 *   troca de ambiente na frase seguinte (4 compassos), com 2 compassos de transição.
 * - Minijogo: camada rítmica que entra no tempo seguinte e sai ao longo de um compasso.
 * - Loja/Livro abertos: a música fica abafada, sem parar.
 */
export class MusicDirector {
  private decks: Deck[] = [];
  private current: Deck | null = null;
  private timer = 0;
  private lastZone = save.zone;
  /** Para testes e afinação: força um ambiente (null = automático). */
  forced: StyleId | null = null;

  /** Ambiente que devia estar a tocar agora. */
  target(): StyleId {
    if (this.forced) return this.forced;
    const night = darkness() > 0.5;
    return save.zone === 'mar' ? (night ? 'marNoite' : 'marDia') : night ? 'lagoNoite' : 'lagoDia';
  }

  get state(): { style: StyleId | null; decks: number; reel: boolean } {
    return { style: this.current?.style.id ?? null, decks: this.decks.length, reel: this.current?.reelOn ?? false };
  }

  /** Arranca depois da primeira interação (política de autoplay). */
  start(): void {
    if (this.timer) return;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const b = getBuses();
    if (!b || b.ac.state !== 'running') return;
    const ac = b.ac, now = ac.currentTime;

    // música desligada: deixa os decks acabar e não cria novos
    if (!save.music) {
      if (this.current) { this.current.fadeOut(now, 1); this.current = null; }
    } else if (!this.current) {
      this.current = new Deck(ac, b.music, STYLES[this.target()], now + 0.1, 2);
      this.decks.push(this.current);
    } else {
      const want = this.target();
      if (want !== this.current.style.id && this.current.stopAt === null) {
        const zoneChange = save.zone !== this.lastZone;
        const old = this.current;
        const at = old.nextBoundary(zoneChange ? 1 : 4);
        const fadeBars = zoneChange ? 1 : 2;
        const next = new Deck(ac, b.music, STYLES[want], at, fadeBars * (60 / STYLES[want].bpm) * 4);
        old.fadeOut(at, fadeBars * old.barDur);
        this.decks.push(next);
        this.current = next;
      }
    }
    this.lastZone = save.zone;

    // camada do minijogo
    const r = fishing.reel;
    const reeling = fishing.phase === 'reeling' && !!r;
    this.current?.setReel(reeling, r ? r.hits / r.need : 0);
    for (const d of this.decks) if (d !== this.current && d.reelOn) d.setReel(false, 0);

    // filtro geral: escurece com a noite e abafa com janelas abertas
    const cutoff = overlayOpen() ? 900 : 9000 - darkness() * 4500;
    b.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.4);

    this.decks = this.decks.filter(d => {
      const alive = d.schedule(now + 0.2);
      if (!alive) d.dispose();
      return alive;
    });
  }
}

export const music = new MusicDirector();

/** Liga a música (chamado ao desbloquear o áudio). */
export function startMusic(): void {
  ensureAudio();
  music.start();
}
