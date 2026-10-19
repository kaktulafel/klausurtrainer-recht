// Statistik: Trefferquote, Anzahl Übungen und zuletzt geübt je Thema; Verlauf von Fällen, Klausuren und MC-Prüfungen.
import { h, karte } from '../ui/dom.js';
import * as store from '../store.js';
import { alleInhalte } from '../inhalte.js';
import { themenStatistik, schwachstellen } from '../plan.js';
import { serieLaenge } from '../storage-core.js';
import { heute, addTage } from '../srs.js';

const AMPEL = { gruen: '🟢', gelb: '🟡', rot: '🔴', grau: '⚪' };
const pz = (q) => (q === null ? '–' : `${Math.round(q * 100)} %`);
const datum = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '–');

export async function render(main) {
  const inh = await alleInhalte();
  const z = store.get();
  const st = themenStatistik(inh.themen, z.srs, inh.itemThema, z.versuche.faelle);
  const karten = Object.values(z.srs);
  const geuebt = karten.filter(k => k.anzahl).length;
  const uebungen = karten.reduce((s, k) => s + (k.anzahl || 0), 0);
  const gesamtQuote = uebungen ? karten.reduce((s, k) => s + k.richtig + 0.5 * (k.teilweise || 0), 0) / uebungen : null;
  const faecher = [0, 0, 0, 0, 0, 0, 0];
  for (const k of karten) faecher[Math.min(6, k.fach || 0)]++;

  const tabelle = (bereich) => {
    const zeilen = Object.values(st).filter(s => s.bereich === bereich).sort((a, b) => (a.gewicht > b.gewicht ? 1 : a.gewicht < b.gewicht ? -1 : (a.quote ?? -1) - (b.quote ?? -1)));
    return h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' },
      h('tr', null, h('th', null, 'Thema'), h('th', null, 'Quote'), h('th', null, 'Zuletzt')),
      zeilen.map(s => h('tr', null,
        h('td', null, h('span', { 'aria-hidden': 'true' }, AMPEL[s.ampel] + ' '), s.titel, ' ', h('span', { class: 'badge' + (s.gewicht === 'A' ? ' a' : '') }, s.gewicht),
          h('br'), h('span', { class: 'klein leise' }, `${s.anzahl} Übungen · ${s.geuebt}/${s.items} Inhalte geübt`)),
        h('td', { class: 'p' }, pz(s.quote)), h('td', { class: 'p' }, datum(s.zuletzt))))));
  };

  const schwach = schwachstellen(st, 5);
  const vf = z.versuche.faelle.slice(-10).reverse();
  const vk = z.versuche.klausuren.slice(-10).reverse();
  const vm = z.versuche.mc.slice(-10).reverse();
  const fallTitel = new Map(inh.faelle.map(f => [f.id, f.titel]));

  main.append(
    h('h1', null, 'Statistik'),
    h('div', { class: 'raster drei' },
      karte(h('p', { class: 'klein leise' }, 'Gesamtquote'), h('p', { class: 'gross' }, pz(gesamtQuote)), h('p', { class: 'klein' }, `${uebungen} Übungen · ${geuebt} Inhalte`)),
      karte(h('p', { class: 'klein leise' }, 'Lernserie'), h('p', { class: 'gross' }, `${serieLaenge(z.serie, heute(), addTage)} Tage`), h('p', { class: 'klein' }, `${z.serie.length} Lerntage insgesamt`)),
      karte(h('p', { class: 'klein leise' }, 'Leitner-Fächer'), h('p', { class: 'klein' }, faecher.map((n, i) => `${i}: ${n}`).join(' · ')), h('p', { class: 'klein leise' }, 'Fach 0 = neu/falsch, 6 = sicher'))),
    karte(h('h2', null, 'Größte Baustellen'), h('p', { class: 'klein leise' }, 'Gewichtet nach Klausurrelevanz (A > B > C) und Quote.'),
      h('ol', null, schwach.map(s => h('li', null, s.titel, ' ', h('span', { class: 'klein leise' }, `(${s.gewicht}, ${s.quote === null ? 'noch nicht geübt' : pz(s.quote)})`)))),
      h('a', { class: 'btn klein', href: '#/schwachstellen' }, 'Zu den Drills')),
    karte(h('h2', null, 'Recht (BGB)'), tabelle('recht')),
    karte(h('h2', null, 'Datenschutz'), tabelle('datenschutz')),
    karte(h('h2', null, 'Letzte Probeklausuren'), vk.length ? h('ul', { class: 'themenliste' }, vk.map(v => h('li', null, `${datum(v.datum)}: ${v.titel || v.klausurId} – ${String(v.punkte).replace('.', ',')}/${v.max} P. · Note ${v.note}`))) : h('p', { class: 'leise' }, 'Noch keine.'),
      h('a', { class: 'btn klein', href: '#/klausur' }, 'Probeklausur schreiben')),
    karte(h('h2', null, 'Letzte Fallbewertungen'), vf.length ? h('ul', { class: 'themenliste' }, vf.map(v => h('li', null, `${datum(v.datum)}: ${fallTitel.get(v.fallId) || v.fallId} – ${String(v.punkte).replace('.', ',')}/${v.max} P. · Note ${v.note}`))) : h('p', { class: 'leise' }, 'Noch keine.')),
    karte(h('h2', null, 'Letzte MC-Prüfungen'), vm.length ? h('ul', { class: 'themenliste' }, vm.map(v => h('li', null, `${datum(v.datum)}: ${String(v.punkte).replace('.', ',')}/${v.max} P. · Note ${v.note}`))) : h('p', { class: 'leise' }, 'Noch keine.'))
  );
}
