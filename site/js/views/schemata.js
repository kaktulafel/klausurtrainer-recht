import { h, karte } from '../ui/dom.js';
export function render(main) {
  main.append(karte(h('h1', null, 'Im Aufbau'), h('p', null, 'Dieser Bereich wird gerade erstellt.')));
}
