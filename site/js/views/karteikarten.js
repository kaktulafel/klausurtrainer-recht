// Karteikarten: alles Rechtswissen als Frage und Antwort, mit Selbstbewertung und Spaced Repetition.
import { h, leere, karte, md, inline, status } from '../ui/dom.js';
import { selbstbewertung, ungeprueftBadge, themenWahl } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import * as store from '../store.js';
import { mische } from '../grading.js';
import { heute } from '../srs.js';
import { schemaKarten, stapelAuswaehlen } from '../karteikarten.js';

const MODI = { alle: 'Neue und schwache Karten zuerst', faellig: 'Heute fällig', schwach: 'Nur zuletzt nicht gewusst' };
const TYP = { definition: 'Definition', merkmale: 'Merkmale', schema: 'Schema', abgrenzung: 'Abgrenzung', rechtsfolge: 'Rechtsfolge', falle: 'Falle', merksatz: 'Merksatz' };

export async function render(main, { query }) {
  const [{ daten }, t, schemata] = await Promise.all([ladeKategorie('karteikarten'), lade('themen.json'), lade('schemata.json')]);
  const themen = t.themen.filter(x => x.bereich === 'recht');
  const karten = [...daten, ...schemaKarten(schemata, new Set(themen.map(x => x.id)))];
  return query.start ? session(main, karten, themen, query) : setup(main, karten, themen);
}

function setup(main, karten, themen) {
  const srs = store.get().srs;
  const gesehen = karten.filter(k => srs['karte:' + k.id]).length;
  const modus = h('select', { id: 'kk-modus' }, Object.entries(MODI).map(([k, v]) => h('option', { value: k }, v)));
  const anzahl = h('select', { id: 'kk-anzahl' }, [10, 20, 40, 999].map(n => h('option', { value: String(n), selected: n === 20 }, n === 999 ? 'Alle' : String(n))));
  const boxen = themen.map(t => h('input', { type: 'checkbox', value: t.id, checked: true, id: 'kk-' + t.id }));
  const zaehl = (id) => karten.filter(k => k.thema === id).length;
  main.append(
    h('h1', null, 'Karteikarten Recht'),
    h('p', { class: 'leise klein' }, `${karten.length} Karten zu allen Rechtsthemen: Definitionen, Merkmale, Schemata, Abgrenzungen, Rechtsfolgen und typische Fallen. ${gesehen} schon geübt.`),
    karte(
      h('label', { for: 'kk-modus' }, 'Modus'), modus,
      h('label', { for: 'kk-anzahl' }, 'Anzahl Karten'), anzahl,
      themenWahl(boxen, themen.map((t, i) => h('label', { class: 'check', for: 'kk-' + t.id }, boxen[i], h('span', null, `${t.titel} (${zaehl(t.id)})`)))),
      h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
        const th = boxen.filter(b => b.checked).map(b => b.value);
        location.hash = `#/karteikarten?start=1&modus=${modus.value}&n=${anzahl.value}&themen=${th.join(',')}`;
      } }, 'Starten'))));
}

function session(main, karten, themen, query) {
  const stapel = stapelAuswaehlen(karten, store.get().srs, {
    themen: (query.themen || '').split(',').filter(Boolean), modus: query.modus, n: parseInt(query.n || '20', 10), heute: heute(), mische
  });
  const titel = new Map(themen.map(t => [t.id, t.titel]));
  const buehne = h('div');
  main.append(h('h1', { class: 'leiser' }, 'Karteikarten Recht'), buehne);
  const stand = { richtig: 0, teilweise: 0, falsch: 0 };
  let i = 0, tastatur = null;
  const zeige = () => {
    document.removeEventListener('keydown', tastatur);
    if (i >= stapel.length) {
      leere(buehne).append(karte(
        h('p', { class: 'gross' }, stapel.length ? 'Runde geschafft ✓' : 'Keine Karten für diese Auswahl.'),
        stapel.length ? h('p', null, status('richtig', `${stand.richtig} gewusst`), ' ', status('teilweise', `${stand.teilweise} teilweise`), ' ', status('falsch', `${stand.falsch} nicht gewusst`)) : null,
        h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: '#/karteikarten' }, 'Neue Runde'), h('a', { class: 'btn sekundaer', href: '#/cheatsheets' }, 'Cheatsheets'))));
      return;
    }
    const k = stapel[i];
    const rueck = md(k.hinten, { lese: true });
    rueck.hidden = true;
    const bew = selbstbewertung((art) => { store.srsBewertung('karte:' + k.id, art); stand[art]++; i++; zeige(); });
    bew.hidden = true;
    const knopf = h('button', { type: 'button', class: 'btn' }, 'Umdrehen', h('span', { class: 'nur-tastatur' }, '(Leertaste)'));
    const drehen = () => { rueck.hidden = false; bew.hidden = false; knopf.hidden = true; bew.querySelector('button')?.focus(); };
    knopf.addEventListener('click', drehen);
    const blatt = karte(
      h('p', { class: 'kk-art' }, TYP[k.typ] || ''),
      h('h2', { class: 'kk-vorne' }, inline(k.vorne)),
      rueck);
    blatt.classList.add('kk-karte');
    const balken = h('div', { class: 'fortschritt', role: 'progressbar', 'aria-label': 'Fortschritt der Runde', 'aria-valuemin': '0', 'aria-valuemax': String(stapel.length), 'aria-valuenow': String(i) }, h('div'));
    balken.firstChild.style.width = `${Math.round((i / stapel.length) * 100)}%`;
    leere(buehne).append(
      h('div', { class: 'kk-kopf' }, h('span', { class: 'badge thema' }, titel.get(k.thema) || k.thema), h('span', null, ungeprueftBadge(k), ' ', `${i + 1} von ${stapel.length}`)),
      balken, blatt,
      h('div', { class: 'daumen' }, knopf, bew));
    knopf.focus();
    tastatur = (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === ' ' && rueck.hidden) { e.preventDefault(); drehen(); }
      else if (!bew.hidden && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); bew.querySelectorAll('button')[+e.key - 1].click(); }
    };
    document.addEventListener('keydown', tastatur);
  };
  zeige();
  return () => document.removeEventListener('keydown', tastatur);
}
