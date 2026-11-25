// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

/** Emissor de eventos tipado e minúsculo (sem dependências). */
export class Emitter<E extends Record<string, unknown[]>> {
  private map = new Map<keyof E, Set<AnyFn>>();

  on<K extends keyof E>(ev: K, fn: (...args: E[K]) => void): () => void {
    let set = this.map.get(ev);
    if (!set) this.map.set(ev, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof E>(ev: K, ...args: E[K]): void {
    this.map.get(ev)?.forEach(fn => fn(...args));
  }
}

/** Avisos globais de mudança de estado (o HUD ouve 'state'). */
export const bus = new Emitter<{
  state: [];
  float: [text: string, x: number, y: number, color: string];
}>();

export const notifyState = () => bus.emit('state');
export const float = (text: string, x: number, y: number, color = '#ffffff') => bus.emit('float', text, x, y, color);
