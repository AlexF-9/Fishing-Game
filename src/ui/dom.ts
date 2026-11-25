export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const show = (id: string) => $(id).classList.add('show');
export const hide = (id: string) => $(id).classList.remove('show');
export const isShown = (id: string) => $(id).classList.contains('show');
export const overlayOpen = () => !!document.querySelector('.overlay.show');
