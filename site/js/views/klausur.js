// Probeklausur-Simulator: feste und Zufallsklausuren (A Fall · B Wissen · C MC), Gesamttimer, Auswertung je Teil, Note, Verlauf.
import { h, leere, karte, md, inline, status, toast } from '../ui/dom.js';
import { tabs, timer, autosaveEditor } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import * as store from '../store.js';
import { bewerteMC, runde, MC_REGELN, STANDARD_NOTENSCHLUESSEL } from '../grading.js';
import { kernpunktCheck, woerter } from '../textcheck.js';
import { normenCheck } from '../normparser.js';
import { baueZufallsKlausur, klausurErgebnis, maxPunkte } from '../klausur-core.js';
import { frageUI, neueReihenfolgen } from './mc.js';
import { geh } from '../router.js';

const AKTIV = 'klausur:aktiv';

function aktiv() {
  try { const t = store.entwurf(AKTIV); return t ? JSON.parse(t) : null; } catch { return null; }
}
function setzeAktiv(obj) { store.setzeEntwurf(AKTIV, obj ? JSON.stringify(obj) : ''); store.speichereJetzt(); }

async function inhalte() {
  const [feste, f, w, m] = await Promise.all([lade('klausuren.json').catch(() => []), ladeKategorie('faelle'), ladeKategorie('wissen'), ladeKategorie('mc')]);
  return { feste, faelle: f.daten, wissen: w.daten, mc: m.daten };
}

export async function render(main, { pfad }) {
  const daten = await inhalte();
  if (pfad[1]) return sitzung(main, daten, pfad[1], pfad[2] === 'auswertung');
  return uebersicht(main, daten);
}

// ---------- Übersicht ----------
function uebersicht(main, daten) {
  const a = aktiv();
  const versuche = store.get().versuche.klausuren;
  const starte = (def) => {
    const laufend = aktiv();
    if (laufend && !confirm('Eine andere Probeklausur läuft noch. Verwerfen und neu beginnen?')) return;
    if (laufend) verwerfe(laufend);
    verwerfe({ def }); // alte Entwürfe derselben Klausur entfernen
    setzeAktiv({ def, gestartet: new Date().toISOString(), mc: {} });
    geh('#/klausur/' + def.id);
  };
  main.append(
    h('h1', null, 'Probeklausur-Simulator'),
    h('p', { class: 'leise lese' }, '90 Minuten, 80 Punkte: Teil A Fall im Gutachtenstil (48 P.), Teil B vier Wissensfragen (12 P.), Teil C 20 Datenschutz-MC (20 P.). Gesetzestexte sind erlaubt – nutze die Norm-Links. Nur fachlich geprüfte Inhalte.'),
    a ? karte(h('h2', null, 'Laufende Klausur'), h('p', null, a.def.titel, ' · begonnen ', new Date(a.gestartet).toLocaleString('de-DE')),
      h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: '#/klausur/' + a.def.id }, 'Fortsetzen'),
        h('button', { type: 'button', class: 'btn leise', onclick: () => { if (confirm('Laufende Klausur verwerfen? Deine Antworten werden gelöscht.')) { verwerfe(a); setzeAktiv(null); geh('#/klausur'); } } }, 'Verwerfen'))) : null,
    h('h2', null, 'Feste Probeklausuren'),
    h('div', { class: 'raster zwei' }, daten.feste.map(k => {
      const fall = daten.faelle.find(f => f.id === k.teile.A.fall);
      const vs = versuche.filter(v => v.klausurId === k.id);
      const letzter = vs[vs.length - 1];
      return karte(h('h3', null, k.titel), h('p', { class: 'klein leise' }, k.beschreibung || ''),
        h('p', { class: 'klein' }, `⏱ ${k.minuten} min · ${maxPunkte(k)} P. · Fall: ${fall?.titel || k.teile.A.fall}`),
        letzter ? h('p', { class: 'klein' }, status(letzter.bestanden ? 'ok' : 'falsch', `Zuletzt ${String(letzter.punkte).replace('.', ',')}/${letzter.max} P. · Note ${letzter.note}`)) : h('p', { class: 'klein leise' }, 'Noch nicht geschrieben'),
        h('button', { type: 'button', class: 'btn', onclick: () => starte(k) }, 'Starten'));
    })),
    karte(h('h2', null, 'Zufallsklausur'), h('p', { class: 'klein leise' }, 'Neuer Mix aus allen geprüften klausurgroßen Fällen, Wissensfragen und MC-Fragen.'),
      h('button', { type: 'button', class: 'btn sekundaer', onclick: () => {
        try { starte(baueZufallsKlausur(daten)); } catch (e) { toast(e.message); }
      } }, 'Zufallsklausur erstellen')),
    versuche.length ? karte(h('h2', null, 'Verlauf'), h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' },
      h('tr', null, h('th', null, 'Datum'), h('th', null, 'Klausur'), h('th', null, 'A'), h('th', null, 'B'), h('th', null, 'C'), h('th', null, 'Gesamt')),
      versuche.slice(-15).reverse().map(v => h('tr', null, h('td', null, v.datum), h('td', null, v.titel || v.klausurId),
        ['A', 'B', 'C'].map(t => h('td', { class: 'p' }, v.teile?.[t] ? `${String(v.teile[t].punkte).replace('.', ',')}/${v.teile[t].max}` : '–')),
        h('td', { class: 'p' }, `${String(v.punkte).replace('.', ',')}/${v.max} · ${v.note}`)))))) : null
  );
}

function schluessel(def) {
  return { A: `klausur:${def.id}:A`, B: (wid) => `klausur:${def.id}:B:${wid}`, timer: `klausur:${def.id}` };
}

function verwerfe(a) {
  const s = schluessel(a.def);
  store.update(z => {
    for (const k of Object.keys(z.entwuerfe)) if (k.startsWith(`klausur:${a.def.id}:`) || k === 'timer:' + s.timer) delete z.entwuerfe[k];
  });
}

// ---------- Sitzung ----------
async function sitzung(main, daten, id, auswertung) {
  let a = aktiv();
  if (!a || a.def.id !== id) {
    const fest = daten.feste.find(k => k.id === id);
    if (!fest) { main.append(karte(h('h1', null, 'Keine laufende Klausur'), h('p', null, 'Starte eine Klausur aus der Übersicht.'), h('a', { class: 'btn', href: '#/klausur' }, 'Zur Übersicht'))); return; }
    a = { def: fest, gestartet: new Date().toISOString(), mc: {} };
    setzeAktiv(a);
  }
  const def = a.def;
  let fall;
  try { fall = await lade(`faelle/${def.teile.A.fall}.json`); }
  catch { main.append(karte(h('h1', null, 'Fall nicht gefunden'), h('a', { class: 'btn', href: '#/klausur' }, 'Zur Übersicht'))); return; }
  const wissen = def.teile.B.wissen.map(w => daten.wissen.find(x => x.id === w)).filter(Boolean);
  const mc = def.teile.C.mc.map(m => daten.mc.find(x => x.id === m)).filter(Boolean);
  if (auswertung) return renderAuswertung(main, a, fall, wissen, mc);

  const s = schluessel(def);
  const aufraeumen = [];
  const abgeben = () => {
    aufraeumen.forEach(f => { try { f(); } catch { /* ignore */ } });
    a.abgegeben = new Date().toISOString();
    setzeAktiv(a);
    geh(`#/klausur/${def.id}/auswertung`);
  };
  const t = timer(s.timer, def.minuten, { onAblauf: () => { toast('Die Bearbeitungszeit ist abgelaufen – bitte jetzt abgeben.', 6000); } });
  if (!store.entwurf('timer:' + s.timer)) t.starte();
  aufraeumen.push(() => t.stop());

  const zeitplan = h('p', { class: 'klein leise' }, `Empfohlen: A ${def.teile.A.empfohleneMinuten} min · B ${def.teile.B.empfohleneMinuten} min · C ${def.teile.C.empfohleneMinuten} min`);
  main.append(
    h('p', { class: 'klein' }, h('a', { href: '#/klausur' }, '← Übersicht')),
    h('h1', null, def.titel),
    karte(h('div', { class: 'zeile zwischen' }, t.element, h('button', { type: 'button', class: 'btn', onclick: () => { if (confirm('Klausur jetzt abgeben? Danach kannst du nichts mehr ändern.')) abgeben(); } }, 'Abgeben')), zeitplan)
  );

  const teilA = (c) => {
    const ed = autosaveEditor(s.A, { klasse: 'editor', label: 'Deine Falllösung (Teil A)', platzhalter: 'Gutachten zu Teil A …' });
    aufraeumen.push(ed.stop);
    c.append(karte(h('h2', null, `${def.teile.A.titel} (${def.teile.A.punkte} P.)`),
      h('div', { class: 'lese sachverhalt' }, fall.sachverhalt.map(p => h('p', null, inline(p)))),
      h('h3', null, 'Fallfrage(n)'), h('div', { class: 'lese' }, fall.fallfragen.map(p => h('p', null, h('strong', null, inline(p)))))),
      karte(ed.textarea, ed.info));
  };
  const teilB = (c) => {
    c.append(h('h2', null, `${def.teile.B.titel} (je ${def.teile.B.punkteJe} P.)`));
    wissen.forEach((w, i) => {
      const ed = autosaveEditor(s.B(w.id), { label: `Antwort zu Frage ${i + 1}`, zeilen: 6 });
      aufraeumen.push(ed.stop);
      c.append(karte(h('h3', { class: 'lese' }, `${i + 1}. `, inline(w.frage)), ed.textarea, ed.info));
    });
  };
  const teilC = (c) => {
    neueReihenfolgen();
    const uis = [];
    const sichere = () => { a.mc = Object.fromEntries(uis.map(({ q, ui }) => [q.id, ui.auswahl()])); setzeAktiv(a); };
    const box = h('div');
    mc.forEach((q, i) => {
      const ui = frageUI(q, a.mc[q.id]);
      uis.push({ q, ui });
      box.append(karte(h('p', { class: 'klein leise' }, `Frage ${i + 1} von ${mc.length}`), h('h3', { class: 'lese' }, inline(q.frage)), ui.element));
    });
    box.addEventListener('change', sichere);
    box.addEventListener('click', (e) => { if (e.target.closest('button')) setTimeout(sichere, 0); });
    aufraeumen.push(sichere);
    c.append(h('h2', null, `${def.teile.C.titel} (je ${def.teile.C.punkteJe} P.)`),
      h('p', { class: 'klein leise' }, `Bewertungsregel: ${MC_REGELN[store.einstellungen().mcRegel] || ''} (änderbar in den Einstellungen).`), box);
  };
  const reiter = tabs([
    { id: 'A', label: 'Teil A', render: teilA },
    { id: 'B', label: 'Teil B', render: teilB },
    { id: 'C', label: 'Teil C', render: teilC }
  ], 'A', () => { /* Entwürfe werden beim Wechsel über blur/Intervall gesichert */ });
  main.append(reiter.element,
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => { if (confirm('Klausur jetzt abgeben?')) abgeben(); } }, 'Abgeben & auswerten')));
  return () => aufraeumen.forEach(f => { try { f(); } catch { /* ignore */ } });
}

// ---------- Auswertung ----------
function punkteAuswahl(max, label, onchange, schritt = 0.5) {
  const sel = h('select', { 'aria-label': label, onchange: (e) => onchange(parseFloat(e.target.value)) });
  for (let p = 0; p <= max + 1e-9; p += schritt) sel.append(h('option', { value: String(p) }, String(runde(p)).replace('.', ',')));
  return sel;
}

function renderAuswertung(main, a, fall, wissen, mc) {
  const def = a.def;
  const s = schluessel(def);
  const regel = store.einstellungen().mcRegel;
  const nschl = store.einstellungen().notenschluessel || STANDARD_NOTENSCHLUESSEL;
  const vergabeA = {}, vergabeB = {};
  // C automatisch
  const cErg = mc.map(q => ({ q, e: bewerteMC(q, a.mc[q.id] || (q.typ === 'zuordnung' ? {} : []), regel, def.teile.C.punkteJe) }));
  const cPunkte = runde(cErg.reduce((x, y) => x + y.e.punkte, 0));
  const summe = h('p', { class: 'gross', 'aria-live': 'polite' });
  const teilAnz = { A: h('strong'), B: h('strong') };
  const rechne = () => {
    const pa = runde([...fall.raster, ...fall.gutachtenstil].reduce((x, r) => x + (vergabeA[r.id] || 0), 0));
    const pb = runde(wissen.reduce((x, w) => x + (vergabeB[w.id] || 0), 0));
    const e = klausurErgebnis(def, { A: pa, B: pb, C: cPunkte }, nschl);
    teilAnz.A.textContent = `${String(pa).replace('.', ',')} / ${e.teile.A.max} P.`;
    teilAnz.B.textContent = `${String(pb).replace('.', ',')} / ${e.teile.B.max} P.`;
    summe.textContent = `${String(e.punkte).replace('.', ',')} / ${e.max} P. · ${e.prozent} % · Note ${e.note}`;
    return e;
  };

  // Teil A
  const textA = store.entwurf(s.A);
  const ncA = normenCheck(fall.erwarteteNormen, textA);
  const zeileA = (r) => h('tr', null, h('td', null, inline(r.kriterium)), h('td', { class: 'p' }, punkteAuswahl(r.punkte, `Punkte für ${r.kriterium}`, (v) => { vergabeA[r.id] = v; rechne(); }), ` / ${r.punkte}`));
  const karteA = karte(h('h2', null, def.teile.A.titel, ' – ', teilAnz.A),
    h('details', null, h('summary', null, 'Deine Lösung'), h('div', { class: 'lese' }, textA ? md(textA) : h('p', { class: 'leise' }, '–'))),
    h('details', null, h('summary', null, 'Musterlösung'), fall.musterloesung.map(x => h('div', null, h('h3', null, x.titel), md(x.text, { lese: true })))),
    h('p', { class: 'klein' }, 'Normen-Check: ', ncA.ergebnisse.map(r => [status(r.status === 'ok' ? 'ok' : r.status === 'teil' ? 'teil' : 'fehlt', r.zitat), ' '])),
    h('p', { class: 'klein leise' }, 'Vergib die Punkte ehrlich anhand der Musterlösung (halbe Punkte möglich). Für eine KI-Korrektur öffne den Fall im Gutachten-Trainer.'),
    h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' }, fall.raster.map(zeileA),
      h('tr', null, h('th', { colspan: '2' }, 'Gutachtenstil')), fall.gutachtenstil.map(zeileA))));

  // Teil B
  const karteB = karte(h('h2', null, def.teile.B.titel, ' – ', teilAnz.B),
    wissen.map((w, i) => {
      const text = store.entwurf(s.B(w.id));
      const kc = woerter(text) >= 3 ? kernpunktCheck(w.kernpunkte, text, w.stichwoerter) : null;
      return h('div', null, h('hr'), h('h3', { class: 'lese' }, `${i + 1}. `, inline(w.frage)),
        h('p', { class: 'klein leise' }, 'Deine Antwort:'), h('div', { class: 'lese' }, text ? md(text) : h('p', { class: 'leise' }, '–')),
        h('details', null, h('summary', null, 'Musterantwort'), md(w.antwort, { lese: true })),
        kc ? h('ul', { class: 'themenliste klein' }, kc.map(k => h('li', null, status(k.getroffen ? 'ok' : 'fehlt', k.getroffen ? 'drin' : 'fehlt?'), ' ', inline(k.kernpunkt)))) : null,
        h('p', null, h('label', null, 'Punkte: ', punkteAuswahl(def.teile.B.punkteJe, `Punkte für Frage ${i + 1}`, (v) => { vergabeB[w.id] = v; rechne(); }), ` / ${def.teile.B.punkteJe}`)));
    }));

  // Teil C
  neueReihenfolgen();
  const karteC = karte(h('h2', null, def.teile.C.titel, ' – ', h('strong', null, `${String(cPunkte).replace('.', ',')} / ${mc.length * def.teile.C.punkteJe} P.`)),
    h('p', { class: 'klein leise' }, `Automatisch bewertet · Regel: ${MC_REGELN[regel] || regel}`),
    h('details', null, h('summary', null, 'Alle Fragen mit Lösung'), cErg.map(({ q, e }) => {
      const ui = frageUI(q, a.mc[q.id] || [], true);
      ui.zeigeLoesung();
      return h('div', null, h('hr'), h('p', null, status(e.status, e.status), ' ', h('strong', null, inline(q.frage))), ui.element);
    })));

  const speichern = h('button', { type: 'button', class: 'btn', onclick: () => {
    const e = rechne();
    store.versuch('klausuren', { klausurId: def.id, titel: def.titel, punkte: e.punkte, max: e.max, note: e.note, bestanden: e.bestanden, teile: e.teile, themen: fall.themen });
    store.versuch('faelle', { fallId: fall.id, themen: fall.themen, punkte: e.teile.A.punkte, max: e.teile.A.max, note: klausurErgebnis({ teile: { A: { punkte: e.teile.A.max }, B: { wissen: [], punkteJe: 0 }, C: { mc: [], punkteJe: 0 } } }, { A: e.teile.A.punkte }, nschl).note, modus: 'klausur' });
    for (const { q, e: r } of cErg) store.srsBewertung('mc:' + q.id, r.status);
    for (const w of wissen) { const p = vergabeB[w.id] || 0; store.srsBewertung('wissen:' + w.id, p >= def.teile.B.punkteJe - 0.5 ? 'richtig' : p >= 1 ? 'teilweise' : 'falsch'); }
    verwerfe(a);
    setzeAktiv(null);
    toast(`Gespeichert: ${String(e.punkte).replace('.', ',')}/${e.max} P. · Note ${e.note}`);
    geh('#/klausur');
  } }, 'Ergebnis speichern & Klausur abschließen');

  main.append(h('p', { class: 'klein' }, h('a', { href: '#/klausur' }, '← Übersicht')),
    h('h1', null, 'Auswertung: ', def.titel),
    karte(summe, h('p', { class: 'klein leise' }, 'Teil C ist automatisch bewertet. Vergib für A und B deine Punkte – die Summe aktualisiert sich sofort.'), speichern),
    karteC, karteB, karteA,
    h('div', { class: 'btn-reihe' }, speichern.cloneNode(true)));
  // geklonter Knopf braucht eigenen Handler
  main.lastChild.firstChild.addEventListener('click', () => speichern.click());
  rechne();
}
