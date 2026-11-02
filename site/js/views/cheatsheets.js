// Cheatsheets: Anspruchsgrundlagen, Tatbestandsmerkmale, Definitionen, Fristen, Abgrenzungen und alle Schemata kompakt.
import { h, karte, inline } from '../ui/dom.js';
import { ungeprueftBadge } from '../ui/widgets.js';
import { lade } from '../data.js';
import { schemaPunkte, eintragPasst } from '../karteikarten.js';

const SCHEMATA = 'schemata';

export async function render(main, { pfad }) {
  const [blaetter, schemata] = await Promise.all([lade('cheatsheets.json'), lade('schemata.json')]);
  const alle = [...blaetter.slice(0, 1), schemaBlatt(schemata), ...blaetter.slice(1)];
  const aktiv = alle.find(b => b.id === pfad[1]) || alle[0];
  const suche = h('input', { type: 'search', placeholder: 'Im Blatt suchen, z. B. § 179', 'aria-label': 'Im Cheatsheet suchen' });
  const anzahl = h('p', { class: 'klein leise', 'aria-live': 'polite' });
  const karten = aktiv.eintraege.map(e => ({ e, el: eintrag(e) }));
  const filtern = () => {
    let n = 0;
    for (const { e, el } of karten) { el.hidden = !eintragPasst(e, suche.value); if (!el.hidden) n++; }
    anzahl.textContent = `${n} von ${karten.length} Einträgen`;
  };
  suche.addEventListener('input', filtern);
  main.append(
    h('h1', { class: 'leiser' }, 'Cheatsheets'),
    h('nav', { class: 'btn-reihe reiter nicht-drucken', 'aria-label': 'Blätter' }, alle.map(b => h('a', { class: 'btn klein ' + (b === aktiv ? '' : 'leise'), href: '#/cheatsheets/' + b.id, 'aria-current': b === aktiv ? 'page' : null }, kurz(b)))),
    h('div', { class: 'suchfeld nicht-drucken' }, suche),
    karte(h('details', { class: 'blatt-info' }, h('summary', null, h('h2', null, aktiv.titel, ' ', aktiv.geprueft === false ? ungeprueftBadge(aktiv) : null)), h('p', { class: 'leise' }, aktiv.einleitung)),
      anzahl,
      h('div', { class: 'cs-raster' }, karten.map(k => k.el))),
    h('div', { class: 'btn-reihe nicht-drucken' }, h('button', { type: 'button', class: 'btn leise', onclick: () => window.print() }, 'Drucken')));
  filtern();
}

const KURZ = { 'cs-ansprueche': 'Ansprüche', [SCHEMATA]: 'Schemata', 'cs-definitionen': 'Definitionen', 'cs-fristen': 'Fristen', 'cs-abgrenzungen': 'Abgrenzungen', 'cs-gutachten': 'Gutachtenstil' };
function kurz(b) { return KURZ[b.id] || b.titel; }

function schemaBlatt(schemata) {
  return {
    id: SCHEMATA, titel: 'Alle Prüfungsschemata',
    einleitung: 'Die Prüfungspunkte aller 19 Schemata in der richtigen Reihenfolge. Ausführlich mit Hinweisen und Übungen unter „Prüfungsschemata“.',
    eintraege: schemata.map(s => ({ titel: s.titel, punkte: schemaPunkte(s), schema: s.id }))
  };
}

function eintrag(e) {
  const links = [
    e.schema ? h('a', { href: '#/schemata/' + e.schema }, 'Schema') : null,
    e.pfad ? h('a', { href: '#/uebersicht/pfade?pfad=' + e.pfad }, 'Prüfungspfad') : null
  ].filter(Boolean);
  return h('article', { class: 'cs-e' },
    h('h3', null, inline(e.titel)),
    e.norm ? h('p', { class: 'cs-norm' }, inline(e.norm)) : null,
    e.text ? h('p', null, inline(e.text)) : null,
    e.punkte ? h('ol', { class: 'cs-punkte' }, e.punkte.map(p => h('li', null, inline(p)))) : null,
    e.hinweis ? h('p', { class: 'klein' }, inline(e.hinweis)) : null,
    links.length ? h('p', { class: 'klein nicht-drucken zeile' }, links) : null);
}
