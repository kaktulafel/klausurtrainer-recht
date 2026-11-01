// Fälle kompakt: alle Fälle mit Sachverhalt in Stichpunkten und Stichpunktlösung (Ansprüche, Tatbestandsmerkmale,
// Fakten, Ergebnis) bzw. als reine Gliederung, Index nach Anspruchsgrundlage und alle Schemata auf einer Seite.
import { h, karte, inline } from '../ui/dom.js';
import { themenBadges, ungeprueftBadge } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import { gruppiereAnsprueche, schemaFuer, fallPasst } from '../kompakt.js';

const ANSICHTEN = [['', 'Fälle'], ['pfade', 'Prüfungspfade'], ['ansprueche', 'Nach Anspruchsgrundlage'], ['schemata', 'Schemata kompakt']];

export async function render(main, { pfad, query }) {
  const ansicht = ANSICHTEN.some(([k]) => k === (pfad[1] || '')) ? (pfad[1] || '') : '';
  const [{ daten }, t, schemata] = await Promise.all([ladeKategorie('faelle'), lade('themen.json'), lade('schemata.json')]);
  const tm = new Map(t.themen.map(x => [x.id, x]));
  const faelle = [...daten].sort((a, b) => a.id.localeCompare(b.id));
  main.append(
    h('h1', null, 'Fälle kompakt'),
    h('p', { class: 'leise lese' }, 'Alle Fälle in Kurzform: der Sachverhalt in Stichpunkten und die Stichpunktlösung im Gutachtenstil – Obersatz (OS), Voraussetzungen, Definition und Subsumtion mit den Fakten aus dem Fall, Ergebnis (Erg.). Umschaltbar auf die reine Gliederung. Zum Wiederholen vor der Klausur und zum Ausdrucken.'),
    h('div', { class: 'btn-reihe' }, ANSICHTEN.map(([k, v]) => h('a', { class: 'btn klein ' + (k === ansicht ? '' : 'leise'), href: '#/uebersicht' + (k ? '/' + k : ''), 'aria-current': k === ansicht ? 'page' : null }, v))));
  if (ansicht === 'ansprueche') return ansprueche(main, faelle, schemata);
  if (ansicht === 'schemata') return schemataKompakt(main, schemata);
  if (ansicht === 'pfade') return pruefpfade(main, await lade('pruefpfade.json'), query.pfad);
  return fallListe(main, faelle, tm, query.fall);
}

function fallListe(main, faelle, tm, sprungZiel) {
  const themen = [...tm.values()].filter(x => faelle.some(f => f.themen.includes(x.id)));
  const suche = h('input', { type: 'search', placeholder: 'Suchen, z. B. „§ 179“ oder „Taschengeld“', 'aria-label': 'Fälle durchsuchen' });
  const thema = h('select', { 'aria-label': 'Nach Thema filtern' }, h('option', { value: '' }, 'Alle Themen'), themen.map(x => h('option', { value: x.id }, x.titel)));
  const anzahl = h('p', { class: 'klein leise', 'aria-live': 'polite' });
  const liste = h('div', { class: 'ue-faelle' });
  const umschalter = h('div', { class: 'btn-reihe nicht-drucken', role: 'group', 'aria-label': 'Darstellung' },
    [['stichpunkte', 'Stichpunktlösung (Gutachtenstil)'], ['gliederung', 'Nur Gliederung']].map(([k, label], i) =>
      h('button', { type: 'button', class: 'btn klein ' + (i ? 'leise' : ''), 'aria-pressed': String(!i), onclick: (e) => {
        liste.classList.toggle('nur-gliederung', k === 'gliederung');
        for (const b of umschalter.querySelectorAll('button')) { const an = b === e.currentTarget; b.setAttribute('aria-pressed', String(an)); b.classList.toggle('leise', !an); }
      } }, label)));
  const karten = faelle.map(f => ({ f, el: fallKarte(f, tm) }));
  const filtern = () => {
    let n = 0;
    for (const { f, el } of karten) {
      const sichtbar = (!thema.value || f.themen.includes(thema.value)) && fallPasst(f, suche.value);
      el.hidden = !sichtbar;
      if (sichtbar) n++;
    }
    anzahl.textContent = `${n} von ${faelle.length} Fällen`;
  };
  suche.addEventListener('input', filtern);
  thema.addEventListener('change', filtern);
  liste.append(...karten.map(k => k.el));
  main.append(h('div', { class: 'suchfeld' }, suche, thema), umschalter, anzahl,
    h('nav', { class: 'ue-inhalt nicht-drucken', 'aria-label': 'Fälle' }, h('ol', null, faelle.map(f => h('li', null, h('a', { href: '#/uebersicht', onclick: (e) => springe(e, f.id) }, `${nummer(f)} ${f.titel}`))))),
    liste,
    druckKnopf());
  filtern();
  if (sprungZiel) requestAnimationFrame(() => springe(null, sprungZiel));
}

function fallKarte(f, tm) {
  return h('section', { class: 'karte ue-fall', id: 'ue-' + f.id },
    h('h2', null, `${nummer(f)} · ${f.titel} `, ungeprueftBadge(f)),
    h('p', { class: 'klein leise' }, `${f.minuten} min · ${f.punkte} P. · `, themenBadges(f.themen, tm)),
    f.kurz ? h('p', { class: 'ue-kurz' }, inline(f.kurz)) : null,
    f.kurzSachverhalt?.length ? h('div', { class: 'ue-sp' }, h('p', { class: 'ue-label' }, 'Sachverhalt in Stichpunkten'), h('ul', { class: 'ue-sv' }, f.kurzSachverhalt.map(s => h('li', null, inline(s))))) : null,
    h('details', null, h('summary', null, 'Fallfragen'), h('ul', null, f.fallfragen.map(q => h('li', null, inline(q))))),
    f.stichpunkte?.length ? h('div', { class: 'ue-sp' }, h('p', { class: 'ue-label' }, 'Stichpunktlösung im Gutachtenstil'), gliederung(f.stichpunkte)) : null,
    h('div', { class: f.stichpunkte?.length ? 'ue-sk' : null }, h('p', { class: 'ue-label' }, 'Gliederung'), gliederung(f.skizze)),
    h('p', { class: 'klein nicht-drucken' }, h('a', { href: '#/faelle/' + f.id }, 'Fall bearbeiten →')));
}

function gliederung(skizze) {
  return h('div', { class: 'ue-gliederung' }, skizze.map(z =>
    h(z.ebene === 1 ? 'h3' : 'p', { class: `ue-z ue-e${Math.min(z.ebene, 3)}` }, inline(z.text))));
}

function ansprueche(main, faelle, schemata) {
  const { gruppen, sonstige } = gruppiereAnsprueche(faelle);
  const titel = new Map(schemata.map(s => [s.id, s.titel]));
  const n = gruppen.reduce((s, g) => s + g.eintraege.length, 0);
  main.append(
    h('p', { class: 'leise lese' }, `${n} Ansprüche aus ${faelle.length} Fällen, sortiert nach Anspruchsgrundlage. Dazu weitere Prüfungen ohne eigenen Anspruch (Anfechtung, Wirksamkeit, Vertragsschluss).`),
    ...gruppen.map(g => {
      const sid = schemaFuer(g.grundlage);
      return karte(h('h2', null, inline(g.grundlage)),
        sid && titel.has(sid) ? h('p', { class: 'klein' }, 'Schema: ', h('a', { href: '#/schemata/' + sid }, titel.get(sid))) : null,
        eintragsListe(g.eintraege));
    }),
    sonstige.length ? karte(h('h2', null, 'Weitere Prüfungen'), eintragsListe(sonstige)) : null,
    druckKnopf());
}

function eintragsListe(eintraege) {
  return h('ul', { class: 'ue-liste' }, eintraege.map(e => h('li', null,
    h('a', { href: '#/uebersicht?fall=' + e.fallId }, nummer({ id: e.fallId })), ' ', inline(e.text),
    h('span', { class: 'klein leise' }, ` (${e.fallTitel})`),
    e.ergebnis ? h('span', { class: 'ue-erg' }, inline(e.ergebnis)) : null)));
}

function schemataKompakt(main, schemata) {
  main.append(
    h('p', { class: 'leise lese' }, 'Alle Prüfungsschemata mit ihren Prüfungspunkten und Normen auf einer Seite, ohne Erläuterungen. Ausführlich mit Hinweisen und Übungen unter „Prüfungsschemata“.'),
    ...schemata.map(s => karte(h('h2', null, s.titel, ' ', ungeprueftBadge(s)), punkte(s.knoten),
      h('p', { class: 'klein nicht-drucken' }, h('a', { href: '#/schemata/' + s.id }, 'Ausführlich →')))),
    druckKnopf());
}

function punkte(knoten) {
  return h('ol', { class: 'ue-schema' }, knoten.map(k => h('li', null, inline(k.text), k.norm ? [' – ', inline(k.norm)] : null, k.kinder ? punkte(k.kinder) : null)));
}

// Prüfungspfade: je Anspruchsgrundlage bzw. inzidenter Prüfung ein Schema im Stichpunkt-Gutachtenstil, das alle
// in den Fällen vorkommenden Abzweigungen zeigt (mit Fall- und Pfadverweisen).
function pruefpfade(main, pfade, sprungZiel) {
  const titel = new Map(pfade.map(p => [p.id, p.titel]));
  const link = (id) => h('a', { href: '#/uebersicht/pfade', onclick: (e) => springe(e, id, '#/uebersicht/pfade') }, titel.get(id));
  const wegweiser = (art, ueberschrift) => karte(h('h2', null, ueberschrift),
    h('ul', { class: 'ue-liste' }, pfade.filter(p => p.art === art).map(p => h('li', null, inline(p.ausgangspunkt), ' → ', link(p.id)))));
  main.append(
    h('p', { class: 'leise lese' }, 'Alle Prüfungen aus den 18 Fällen als Schema im Stichpunkt-Gutachtenstil: Ausgangspunkt ist der Obersatz (OS), danach folgen die Voraussetzungen und an jeder Weiche die Pfade, die in den Fällen vorkommen – mit Verweis auf den Fall. „Bausteine“ sind Prüfungen, die innerhalb eines Anspruchs inzident anfallen.'),
    h('nav', { class: 'nicht-drucken', 'aria-label': 'Ausgangspunkte' },
      wegweiser('anspruch', 'Ausgangspunkte: Wer will was? → Anspruch'),
      wegweiser('baustein', 'Bausteine: inzidente Prüfungen')),
    ...pfade.map(p => pfadKarte(p, link)),
    druckKnopf());
  if (sprungZiel) requestAnimationFrame(() => springe(null, sprungZiel, '#/uebersicht/pfade'));
}

function pfadKarte(p, link) {
  const faelle = [...new Set(p.zeilen.flatMap(z => z.faelle || []))].sort();
  return h('section', { class: 'karte ue-fall', id: 'ue-' + p.id },
    h('h2', null, p.titel, ' ', ungeprueftBadge(p)),
    h('p', { class: 'ue-kurz' }, (p.art === 'anspruch' ? 'Ausgangspunkt: ' : 'Baustein: ') + p.ausgangspunkt),
    h('div', { class: 'ue-gliederung' }, p.zeilen.map(z => h('p', { class: `ue-z ue-e${z.ebene}` }, inline(z.text),
      z.verweis ? [' ', h('span', { class: 'ue-ref' }, '→ ', link(z.verweis))] : null,
      z.faelle?.length ? [' ', h('span', { class: 'ue-ref klein' }, fallLinks(z.faelle))] : null))),
    p.weiter?.length ? h('p', { class: 'klein' }, 'Weiter mit: ', p.weiter.map((w, i) => [i ? ' · ' : '', link(w)])) : null,
    h('p', { class: 'klein leise' }, 'Vorkommen: ', fallLinks(faelle)));
}

function fallLinks(ids) {
  return ids.map((id, i) => [i ? ', ' : '', h('a', { href: '#/uebersicht?fall=' + id }, nummer({ id }))]);
}

function nummer(f) { return 'Fall ' + f.id.replace(/^fall-/, ''); }

// Sprung innerhalb der Seite, ohne das Hash-Routing zu verlassen.
function springe(e, zielId, zurueck = '#/uebersicht') {
  if (e) e.preventDefault();
  const ziel = document.getElementById('ue-' + zielId);
  if (ziel) { ziel.hidden = false; ziel.scrollIntoView({ block: 'start' }); ziel.tabIndex = -1; ziel.focus({ preventScroll: true }); }
  else location.hash = zurueck;
}

function druckKnopf() {
  return h('div', { class: 'btn-reihe nicht-drucken' }, h('button', { type: 'button', class: 'btn leise', onclick: () => window.print() }, 'Drucken'));
}
