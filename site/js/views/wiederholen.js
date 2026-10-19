// Heute fällig: Spaced Repetition über alle Kartentypen. MC, Wissensfragen und Normkarten direkt hier,
// übrige Typen (Schemata, Drills, Skizzen, Zitierübungen) per Link in ihren Trainer.
import { h, leere, karte, md, inline, status, toast } from '../ui/dom.js';
import { selbstbewertung } from '../ui/widgets.js';
import * as store from '../store.js';
import { alleInhalte } from '../inhalte.js';
import { bewerteMC } from '../grading.js';
import { heute, faelligeIds } from '../srs.js';
import { frageUI, neueReihenfolgen } from './mc.js';

const TYPNAME = { mc: 'Datenschutz-MC', wissen: 'Wissensfrage', nk: 'Normkarte', zitat: 'Zitierübung', schema: 'Schema', 'schema-luecke': 'Lückenschema', 'schema-fall': 'Fall-Einstieg', skizze: 'Skizzen-Sprint', drill: 'Drill' };

function link(typ, id) {
  switch (typ) {
    case 'zitat': return '#/normen/zitieren';
    case 'schema': return `#/schemata/${id}?modus=puzzle`;
    case 'schema-luecke': return `#/schemata/${id}?modus=luecken`;
    case 'schema-fall': return `#/faelle/${id}?modus=gefuehrt`;
    case 'skizze': return `#/faelle/${id}?modus=skizze`;
    case 'drill': return `#/schwachstellen/${id}`;
    default: return null;
  }
}

export async function render(main, { query }) {
  const inh = await alleInhalte();
  const nach = { mc: new Map(inh.mc.map(x => [x.id, x])), wissen: new Map(inh.wissen.map(x => [x.id, x])), nk: new Map(inh.normkarten.map(x => [x.id, x])) };
  const titel = (typ, id) => ({
    schema: inh.schemata.find(s => s.id === id)?.titel, 'schema-luecke': inh.schemata.find(s => s.id === id)?.titel,
    drill: inh.drills.find(d => d.id === id)?.titel, skizze: inh.faelle.find(f => f.id === id)?.titel, 'schema-fall': inh.faelle.find(f => f.id === id)?.titel,
    zitat: inh.normkarten.find(k => k.id === id)?.problem
  })[typ] || id;
  const tag = heute();
  const alle = faelligeIds(store.get().srs, tag).map(k => { const i = k.indexOf(':'); return { key: k, typ: k.slice(0, i), id: k.slice(i + 1) }; });
  // Nur Karten, deren Inhalt (noch) existiert
  const gueltig = alle.filter(x => nach[x.typ] ? nach[x.typ].has(x.id) : !!link(x.typ, x.id));
  const direkt = gueltig.filter(x => nach[x.typ]);
  const extern = gueltig.filter(x => !nach[x.typ]);

  main.append(h('h1', null, 'Heute fällig'));
  if (!gueltig.length) {
    main.append(karte(h('p', { class: 'gross' }, 'Nichts fällig ✓'), h('p', null, 'Neue Karten werden fällig, sobald du sie einmal geübt hast. Starte z. B. mit Wissensfragen oder Datenschutz-MC.'),
      h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: '#/wissen' }, 'Wissensfragen'), h('a', { class: 'btn sekundaer', href: '#/mc' }, 'Datenschutz-MC'), h('a', { class: 'btn sekundaer', href: '#/normen/karten' }, 'Normkarten'))));
    return;
  }
  const zaehl = {};
  for (const x of gueltig) zaehl[x.typ] = (zaehl[x.typ] || 0) + 1;
  main.append(h('p', { class: 'leise' }, `${gueltig.length} fällig: `, Object.entries(zaehl).map(([t, n]) => `${TYPNAME[t] || t} ${n}`).join(' · ')));

  if (extern.length) {
    main.append(karte(h('h2', null, 'In den Trainern wiederholen'),
      h('ul', { class: 'themenliste' }, extern.map(x => h('li', null, h('span', { class: 'badge' }, TYPNAME[x.typ] || x.typ), ' ', h('a', { href: link(x.typ, x.id) }, inline(titel(x.typ, x.id))))))));
  }
  if (!direkt.length) return;

  const stapel = query.alle ? direkt : direkt.slice(0, 30);
  let i = 0, tastatur = null;
  const buehne = h('div');
  main.append(h('h2', null, 'Direkt wiederholen'), direkt.length > stapel.length ? h('p', { class: 'klein leise' }, `Die ersten ${stapel.length} von ${direkt.length} (älteste zuerst).`) : null, buehne);
  neueReihenfolgen();

  const weiter = () => { i++; zeige(); };
  const zeige = () => {
    document.removeEventListener('keydown', tastatur);
    tastatur = null;
    if (i >= stapel.length) {
      leere(buehne).append(karte(h('p', { class: 'gross' }, 'Runde geschafft ✓'), h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: '#/' }, 'Zum Dashboard'), h('button', { type: 'button', class: 'btn sekundaer', onclick: () => location.reload() }, 'Neu laden'))));
      return;
    }
    const x = stapel[i];
    const obj = nach[x.typ].get(x.id);
    const kopf = h('div', { class: 'zeile zwischen' }, h('span', { class: 'badge' }, TYPNAME[x.typ]), h('span', { class: 'klein leise' }, `${i + 1} von ${stapel.length}`));
    const ziel = h('div', { 'aria-live': 'polite' });
    const bewerten = (art) => { store.srsBewertung(x.key, art); weiter(); };
    let inhalt;
    if (x.typ === 'mc') {
      const ui = frageUI(obj);
      const knopf = h('button', { type: 'button', class: 'btn' }, 'Antwort prüfen');
      knopf.addEventListener('click', () => {
        if (knopf.dataset.fertig) { weiter(); return; }
        const e = bewerteMC(obj, ui.auswahl(), store.einstellungen().mcRegel);
        store.srsBewertung(x.key, e.status);
        ui.zeigeLoesung();
        ziel.append(h('p', null, status(e.status, e.status === 'richtig' ? 'Richtig' : e.status === 'teilweise' ? 'Teilweise' : 'Falsch')));
        knopf.dataset.fertig = '1'; knopf.textContent = 'Weiter'; knopf.focus();
      });
      inhalt = [h('h3', { class: 'lese' }, inline(obj.frage)), ui.element, ziel, h('div', { class: 'btn-reihe' }, knopf)];
      tastatur = (e) => { if (e.target.matches('input[type=text], textarea, select')) return; if (/^[1-9]$/.test(e.key)) { ui.taste(+e.key - 1); e.preventDefault(); } };
    } else {
      const vorne = x.typ === 'wissen' ? h('h3', { class: 'lese' }, inline(obj.frage)) : h('p', { class: 'lese' }, inline(obj.problem));
      const rueck = x.typ === 'wissen' ? md(obj.antwort, { lese: true }) : h('div', null, h('p', { class: 'gross' }, inline(obj.norm)), h('p', { class: 'klein' }, inline(obj.erklaerung)));
      const bew = selbstbewertung(bewerten);
      bew.hidden = true; rueck.hidden = true;
      const knopf = h('button', { type: 'button', class: 'btn' }, 'Aufdecken (Leertaste)');
      const decke = () => { rueck.hidden = false; bew.hidden = false; knopf.hidden = true; bew.querySelector('button')?.focus(); };
      knopf.addEventListener('click', decke);
      inhalt = [vorne, h('div', { class: 'btn-reihe' }, knopf), rueck, bew];
      tastatur = (e) => {
        if (e.target.matches('input, textarea, select')) return;
        if (e.key === ' ' && rueck.hidden) { e.preventDefault(); decke(); }
        else if (['1', '2', '3'].includes(e.key) && !bew.hidden) { e.preventDefault(); bew.querySelectorAll('button')[+e.key - 1].click(); }
      };
    }
    leere(buehne).append(karte(kopf, ...inhalt, h('p', { class: 'klein' }, h('button', { type: 'button', class: 'btn klein leise', onclick: () => { toast('Übersprungen'); weiter(); } }, 'Überspringen'))));
    if (tastatur) document.addEventListener('keydown', tastatur);
  };
  zeige();
  return () => document.removeEventListener('keydown', tastatur);
}
