import { h, karte } from '../ui/dom.js';
export function render(main) {
  main.append(karte(h('h1', null, 'Seite nicht gefunden'), h('p', null, 'Diese Adresse gibt es in der App nicht.'), h('a', { class: 'btn', href: '#/' }, 'Zur Startseite')));
}
