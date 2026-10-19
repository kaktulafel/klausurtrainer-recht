// Wissensfragen: Antwort tippen (oder denken) → Musterantwort + Kernpunkt-Check → Selbstbewertung → SRS; optional KI-Check.
import { h, leere, karte, md, inline, status, toast } from '../ui/dom.js';
import { selbstbewertung, autosaveEditor, kiPanel, ungeprueftBadge } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import * as store from '../store.js';
import { kernpunktCheck, woerter } from '../textcheck.js';
import { normenCheck } from '../normparser.js';
import { mische } from '../grading.js';
import { heute, istFaellig } from '../srs.js';
import { baueWissenRequest, normalisiereWissen } from '../ai.js';

export async function render(main, { pfad, query }) {
  const [{ daten }, th] = await Promise.all([ladeKategorie('wissen'), lade('themen.json')]);
  const themen = th.themen.filter(t => daten.some(w => w.thema === t.id));
  if (pfad[1]) {
    const w = daten.find(x => x.id === pfad[1]);
    if (!w) { main.append(karte(h('h1', null, 'Frage nicht gefunden'), h('a', { href: '#/wissen' }, 'Zur Übersicht'))); return; }
    return einzel(main, [w], 0, themen, true);
  }
  if (query.start) {
    const srs = store.get().srs;
    let liste = daten.filter(w => !query.thema || w.thema === query.thema);
    if (query.modus === 'faellig') liste = liste.filter(w => istFaellig(srs['wissen:' + w.id], heute()));
    else if (query.modus === 'neu') liste = liste.filter(w => !srs['wissen:' + w.id]);
    else if (query.modus === 'fehler') liste = liste.filter(w => ['falsch', 'teilweise'].includes(srs['wissen:' + w.id]?.letzte));
    liste = mische(liste).slice(0, parseInt(query.n || '10', 10));
    if (!liste.length) { main.append(karte(h('h1', null, 'Keine Fragen'), h('p', null, 'Für diese Auswahl ist nichts offen.'), h('a', { class: 'btn', href: '#/wissen' }, 'Zurück'))); return; }
    return einzel(main, liste, 0, themen, false);
  }
  // Übersicht
  const srs = store.get().srs;
  const anz = (fn) => daten.filter(fn).length;
  const sel = h('select', { id: 'w-thema' }, h('option', { value: '' }, 'Alle Themen'), themen.map(t => h('option', { value: t.id }, t.titel)));
  const modus = h('select', { id: 'w-modus' }, [['mix', 'Gemischt'], ['neu', 'Nur neue'], ['faellig', 'Heute fällig'], ['fehler', 'Nur Fehler']].map(([k, v]) => h('option', { value: k }, v)));
  const n = h('select', { id: 'w-n' }, [5, 10, 20, 999].map(x => h('option', { value: String(x), selected: x === 10 }, x === 999 ? 'Alle' : String(x))));
  main.append(
    h('h1', null, 'Wissensfragen'),
    h('p', { class: 'leise' }, `${daten.length} Fragen im Klausurstil · ${anz(w => !srs['wissen:' + w.id])} neu · ${anz(w => istFaellig(srs['wissen:' + w.id], heute()))} fällig.`),
    karte(h('label', { for: 'w-thema' }, 'Thema'), sel, h('label', { for: 'w-modus' }, 'Auswahl'), modus, h('label', { for: 'w-n' }, 'Anzahl'), n,
      h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => { location.hash = `#/wissen?start=1&thema=${sel.value}&modus=${modus.value}&n=${n.value}`; } }, 'Starten'))),
    h('h2', null, 'Alle Fragen'),
    themen.map(t => h('details', { class: 'karte' }, h('summary', null, t.titel, ' ', h('span', { class: 'leise klein' }, `(${anz(w => w.thema === t.id)})`)),
      h('ul', null, daten.filter(w => w.thema === t.id).map(w => {
        const k = srs['wissen:' + w.id];
        return h('li', null, h('a', { href: '#/wissen/' + w.id }, w.frage), ' ', w.klausurantwort ? h('span', { class: 'badge a' }, 'Klausurantwort') : null, ' ', k ? status(k.letzte === 'richtig' ? 'ok' : k.letzte === 'teilweise' ? 'teil' : 'falsch', k.letzte) : null);
      }))))
  );
}

function einzel(main, liste, i, themen, einzelansicht) {
  let tastatur;
  const buehne = h('div');
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/wissen' }, '← Wissensfragen')), buehne);
  const zeige = () => {
    document.removeEventListener('keydown', tastatur);
    if (i >= liste.length) { leere(buehne).append(karte(h('h2', null, 'Runde beendet ✓'), h('a', { class: 'btn', href: '#/wissen' }, 'Zur Übersicht'))); return; }
    const w = liste[i];
    const ed = autosaveEditor('wissen:' + w.id, { label: 'Deine Antwort', platzhalter: 'Antwort stichpunktartig oder ausformuliert – oder nur im Kopf beantworten und direkt aufdecken.', zeilen: 6 });
    ed.textarea.style.minHeight = '140px';
    const loesung = h('div', { hidden: true });
    const aufdecken = h('button', { type: 'button', class: 'btn' }, 'Musterantwort zeigen');
    aufdecken.addEventListener('click', () => {
      ed.sichern();
      aufdecken.hidden = true;
      const text = ed.wert();
      const teile = [h('h3', null, 'Musterantwort'), md(w.antwort, { lese: true })];
      if (woerter(text) >= 3) {
        const kc = kernpunktCheck(w.kernpunkte, text, w.stichwoerter);
        const getroffen = kc.filter(k => k.getroffen).length;
        teile.push(h('h3', null, 'Kernpunkt-Check ', h('span', { class: 'badge' }, 'automatisch – nur Hinweis')),
          h('p', null, `${getroffen} von ${kc.length} Kernpunkten erkannt.`),
          h('ul', { class: 'themenliste' }, kc.map(k => h('li', null, status(k.getroffen ? 'ok' : 'fehlt', k.getroffen ? 'drin' : 'fehlt?'), ' ', inline(k.kernpunkt)))));
        if (w.normen.length) {
          const nc = normenCheck(w.normen, text);
          teile.push(h('p', { class: 'klein' }, 'Normen: ', nc.ergebnisse.map(r => [status(r.status === 'ok' ? 'ok' : r.status === 'teil' ? 'teil' : 'fehlt', r.zitat), ' '])));
        }
      } else {
        teile.push(h('h3', null, 'Kernpunkte'), h('ul', null, w.kernpunkte.map(k => h('li', null, inline(k)))));
      }
      teile.push(h('h3', null, 'Wie gut war deine Antwort?'), selbstbewertung((art) => { store.srsBewertung('wissen:' + w.id, art); if (einzelansicht) { toast('Gespeichert'); location.hash = '#/wissen'; } else { i++; zeige(); } }));
      const ki = kiPanel({
        titel: 'KI-Check (optional)',
        baueRequest: (key, modell) => baueWissenRequest({ apiKey: key, modell, frage: w, text: ed.wert() }),
        normalisiere: (obj) => normalisiereWissen(obj, w),
        render: (ziel, e) => ziel.append(h('p', null, `${e.erfuellt} von ${e.gesamt} Kernpunkten erfüllt (KI-Einschätzung).`), h('ul', { class: 'themenliste' }, e.kernpunkte.map(k => h('li', null, status(k.erfuellt ? 'ok' : 'fehlt', k.erfuellt ? 'erfüllt' : 'fehlt'), ' ', k.text, k.begruendung ? h('span', { class: 'hinweis-text' }, k.begruendung) : null))), e.feedback ? h('p', null, e.feedback) : null)
      });
      if (ki && woerter(text) >= 3) teile.push(ki);
      loesung.append(...teile);
      loesung.hidden = false;
      document.addEventListener('keydown', tastatur);
    });
    tastatur = (e) => {
      if (e.target.matches('input, textarea, select')) return;
      const b = loesung.querySelectorAll('[role=group] button');
      if (['1', '2', '3'].includes(e.key) && b.length) { e.preventDefault(); b[+e.key - 1].click(); }
    };
    leere(buehne).append(karte(
      h('div', { class: 'zeile zwischen' }, h('span', { class: 'badge' }, themen.find(t => t.id === w.thema)?.titel || w.thema), h('span', null, liste.length > 1 ? `Frage ${i + 1} von ${liste.length} ` : '', ungeprueftBadge(w))),
      h('h2', { class: 'lese' }, inline(w.frage)),
      ed.textarea, ed.info, h('div', { class: 'btn-reihe' }, aufdecken), loesung));
  };
  zeige();
  return () => document.removeEventListener('keydown', tastatur);
}
