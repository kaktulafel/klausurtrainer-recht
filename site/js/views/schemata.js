// Prüfungsschemata: aufklappbar, druckbar; Übungen Schema-Puzzle (Reihenfolge) und Lückenschema (welche Norm wofür).
import { h, leere, karte, md, inline, status, toast } from '../ui/dom.js';
import { sortierListe, ungeprueftBadge } from '../ui/widgets.js';
import { lade } from '../data.js';
import * as store from '../store.js';
import { mische } from '../grading.js';
import { vergleicheZitat } from '../normparser.js';

export async function render(main, { pfad, query }) {
  const schemata = await lade('schemata.json');
  if (!pfad[1]) {
    const srs = store.get().srs;
    main.append(h('h1', null, 'Prüfungsschemata'),
      h('p', { class: 'leise lese' }, 'Aufklappbar mit Normen und typischen Problemen. Je Schema: Schema-Puzzle (Reihenfolge) und Lückenschema (welche Norm wofür).'),
      h('div', { class: 'raster zwei' }, schemata.map(s => {
        const k = srs['schema:' + s.id];
        return h('a', { class: 'karte kachel', href: '#/schemata/' + s.id }, h('h3', null, s.titel, ' ', ungeprueftBadge(s)),
          h('p', { class: 'klein leise' }, `${s.knoten.length} Hauptpunkte`), k ? h('p', { class: 'klein' }, status(k.letzte === 'richtig' ? 'ok' : 'teil', `Puzzle zuletzt: ${k.letzte}`)) : null);
      })));
    return;
  }
  const s = schemata.find(x => x.id === pfad[1]);
  if (!s) { main.append(karte(h('h1', null, 'Schema nicht gefunden'), h('a', { href: '#/schemata' }, 'Zur Übersicht'))); return; }
  const modus = query.modus || 'ansehen';
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/schemata' }, '← Alle Schemata')), h('h1', null, s.titel, ' ', ungeprueftBadge(s)),
    h('div', { class: 'btn-reihe nicht-drucken' },
      ...[['ansehen', 'Schema'], ['puzzle', 'Schema-Puzzle'], ['luecken', 'Lückenschema']].map(([k, v]) => h('a', { class: 'btn klein ' + (k === modus ? '' : 'leise'), href: `#/schemata/${s.id}?modus=${k}`, 'aria-current': k === modus ? 'page' : null }, v))));
  if (modus === 'puzzle') return puzzle(main, s);
  if (modus === 'luecken') return luecken(main, s);
  main.append(karte(s.einleitung ? md(s.einleitung, { lese: true }) : null, baum(s.knoten, 0)),
    h('div', { class: 'btn-reihe nicht-drucken' },
      h('button', { type: 'button', class: 'btn leise', onclick: () => main.querySelectorAll('details').forEach(d => { d.open = true; }) }, 'Alles aufklappen'),
      h('button', { type: 'button', class: 'btn leise', onclick: () => { main.querySelectorAll('details').forEach(d => { d.open = true; }); window.print(); } }, 'Drucken')));
}

function baum(knoten, tiefe) {
  return h('div', null, knoten.map((k, i) => {
    const kopf = [tiefe === 0 ? `${i + 1}. ` : '', inline(k.text), k.norm ? [' – ', inline(k.norm)] : null];
    const inhalt = [k.hinweis ? h('span', { class: 'hinweis-text' }, inline(k.hinweis)) : null, k.kinder ? baum(k.kinder, tiefe + 1) : null];
    if (!k.hinweis && !k.kinder) return h('div', { class: 'knoten-blatt' }, ...kopf);
    return h('details', { class: 'knoten', open: tiefe === 0 }, h('summary', null, ...kopf), ...inhalt);
  }));
}

function puzzle(main, s) {
  const richtig = s.knoten.map(k => k.text);
  let gemischt = mische(richtig);
  if (gemischt.every((x, i) => x === richtig[i])) gemischt = [...gemischt.slice(1), gemischt[0]];
  const sl = sortierListe(gemischt, 'Prüfungspunkte in Reihenfolge');
  const ziel = h('div', { 'aria-live': 'polite' });
  main.append(karte(h('p', null, 'Bringe die Hauptpunkte in die richtige Prüfungsreihenfolge.'), sl.element,
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
      sl.markiere(richtig);
      const anz = sl.reihenfolge().filter((x, i) => x === richtig[i]).length;
      const art = anz === richtig.length ? 'richtig' : anz >= richtig.length / 2 ? 'teilweise' : 'falsch';
      store.srsBewertung('schema:' + s.id, art);
      leere(ziel).append(h('p', null, status(art, `${anz} von ${richtig.length} an der richtigen Stelle`)), art !== 'richtig' ? h('details', null, h('summary', null, 'Richtige Reihenfolge'), h('ol', null, richtig.map(r => h('li', null, inline(r))))) : null);
    } }, 'Prüfen'), h('a', { class: 'btn leise', href: `#/schemata/${s.id}?modus=puzzle&r=${Date.now()}` }, 'Neu mischen')), ziel));
}

function luecken(main, s) {
  const mitNorm = [];
  const sammle = (kn) => { for (const k of kn) { if (k.norm) mitNorm.push(k); if (k.kinder) sammle(k.kinder); } };
  sammle(s.knoten);
  if (!mitNorm.length) { main.append(karte(h('p', null, 'Dieses Schema enthält keine Normen für ein Lückenschema – nutze das Puzzle.'))); return; }
  const felder = mitNorm.map((k, i) => ({ k, inp: h('input', { type: 'text', id: `l-${i}`, placeholder: '§ … / Art. …', 'aria-label': `Norm für: ${k.text}` }), aus: h('span', { 'aria-live': 'polite' }) }));
  const ziel = h('div');
  main.append(karte(h('p', null, 'Welche Norm gehört zu welchem Prüfungspunkt? Mit Absatz/Satz/Alternative, soweit angegeben.'),
    h('div', { class: 'stapel' }, felder.map(f => h('div', null, h('label', { for: f.inp.id }, inline(f.k.text)), f.inp, f.aus))),
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
      let ok = 0;
      for (const f of felder) {
        const v = vergleicheZitat(f.k.norm, f.inp.value || '');
        if (v.ok) ok++;
        f.aus.replaceChildren(status(v.art, v.ok ? 'richtig' : 'Lösung: '), v.ok ? '' : inline(f.k.norm));
      }
      const art = ok === felder.length ? 'richtig' : ok >= felder.length / 2 ? 'teilweise' : 'falsch';
      store.srsBewertung('schema-luecke:' + s.id, art);
      leere(ziel).append(h('p', null, status(art, `${ok} von ${felder.length} Normen richtig`)));
      toast(`${ok}/${felder.length} richtig`);
    } }, 'Prüfen')), ziel));
}
