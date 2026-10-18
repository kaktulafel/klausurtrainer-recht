// Datenschutz-MC: Üben (sofortiges Feedback), Prüfung (Timer, Auswertung am Ende), Nur Fehler, Heute fällig, Themenfilter.
import { h, leere, karte, status, inline, toast } from '../ui/dom.js';
import { timer, ungeprueftBadge } from '../ui/widgets.js';
import { lade, ladeKategorie, nurGeprueft } from '../data.js';
import * as store from '../store.js';
import { bewerteMC, mische, note, runde, MC_REGELN, STANDARD_NOTENSCHLUESSEL } from '../grading.js';
import { heute, istFaellig } from '../srs.js';

const MODI = { ueben: 'Üben (sofortiges Feedback)', pruefung: 'Prüfung (Timer, Auswertung am Ende)', fehler: 'Nur Fehler (zuletzt falsch/teilweise)', faellig: 'Heute fällig (Wiederholung)' };

export async function render(main, { query }) {
  const [{ daten }, themenDatei] = await Promise.all([ladeKategorie('mc'), lade('themen.json')]);
  const themen = themenDatei.themen.filter(t => t.bereich === 'datenschutz');
  if (query.start) return session(main, daten, themen, query);
  return setup(main, daten, themen, query);
}

function setup(main, daten, themen, query) {
  const srs = store.get().srs;
  const zaehl = (th) => daten.filter(q => q.thema === th.id).length;
  const fehlerAnz = daten.filter(q => ['falsch', 'teilweise'].includes(srs['mc:' + q.id]?.letzte)).length;
  const faelligAnz = daten.filter(q => istFaellig(srs['mc:' + q.id], heute())).length;
  const modus = h('select', { id: 'mc-modus' }, Object.entries(MODI).map(([k, v]) => h('option', { value: k, selected: k === (query.modus || 'ueben') }, v)));
  const anzahl = h('select', { id: 'mc-anzahl' }, [10, 20, 30, 50, 999].map(n => h('option', { value: String(n), selected: n === 20 }, n === 999 ? 'Alle' : String(n))));
  const regel = h('select', { id: 'mc-regel' }, Object.entries(MC_REGELN).map(([k, v]) => h('option', { value: k, selected: k === store.einstellungen().mcRegel }, v)));
  const boxen = themen.map(t => h('input', { type: 'checkbox', value: t.id, checked: !query.thema || query.thema === t.id, id: 'th-' + t.id }));
  main.append(
    h('h1', null, 'Datenschutz – Multiple Choice'),
    h('p', { class: 'leise' }, `${daten.length} Fragen · ${fehlerAnz} zuletzt falsch/teilweise · ${faelligAnz} heute fällig.`),
    karte(
      h('label', { for: 'mc-modus' }, 'Modus'), modus,
      h('label', { for: 'mc-anzahl' }, 'Anzahl Fragen'), anzahl,
      h('label', { for: 'mc-regel' }, 'Bewertungsregel (Mehrfachauswahl)'), regel,
      h('p', { class: 'klein leise' }, 'Single Choice: nur die richtige Antwort zählt. Standardregel siehe Einstellungen.'),
      h('fieldset', null, h('legend', null, 'Themen'),
        h('div', { class: 'btn-reihe' },
          h('button', { type: 'button', class: 'btn klein leise', onclick: () => boxen.forEach(b => { b.checked = true; }) }, 'Alle'),
          h('button', { type: 'button', class: 'btn klein leise', onclick: () => boxen.forEach(b => { b.checked = false; }) }, 'Keine')),
        themen.map((t, i) => h('label', { class: 'check', for: 'th-' + t.id }, boxen[i], h('span', null, t.titel, ' ', h('span', { class: 'badge' + (t.gewicht === 'A' ? ' a' : '') }, t.gewicht), ' ', h('span', { class: 'leise klein' }, `(${zaehl(t)})`))))),
      h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
        const th = boxen.filter(b => b.checked).map(b => b.value);
        if (!th.length) { toast('Bitte mindestens ein Thema wählen.'); return; }
        location.hash = `#/mc?start=1&modus=${modus.value}&n=${anzahl.value}&regel=${regel.value}&themen=${th.join(',')}`;
      } }, 'Starten'))));
}

function auswahlFragen(daten, query) {
  const themen = (query.themen || '').split(',').filter(Boolean);
  const srs = store.get().srs;
  let pool = daten.filter(q => !themen.length || themen.includes(q.thema));
  if (query.modus === 'pruefung') pool = nurGeprueft(pool).length >= 5 ? nurGeprueft(pool) : pool;
  if (query.modus === 'fehler') pool = pool.filter(q => ['falsch', 'teilweise'].includes(srs['mc:' + q.id]?.letzte));
  if (query.modus === 'faellig') pool = pool.filter(q => istFaellig(srs['mc:' + q.id], heute()));
  if (query.ids) { const ids = query.ids.split(','); pool = daten.filter(q => ids.includes(q.id)); }
  const n = parseInt(query.n || '20', 10);
  // Bevorzugt: nie gesehene und schwache Fragen zuerst, dann gemischt
  const gewichtet = mische(pool).sort((a, b) => (srs['mc:' + a.id]?.fach ?? -1) - (srs['mc:' + b.id]?.fach ?? -1));
  return mische(gewichtet.slice(0, n));
}

function session(main, daten, themen, query) {
  reihenfolgen.clear(); // Optionen bei jedem Durchgang neu mischen
  const fragen = auswahlFragen(daten, query);
  const pruefung = query.modus === 'pruefung';
  const regel = query.regel || store.einstellungen().mcRegel;
  if (!fragen.length) {
    main.append(karte(h('h1', null, 'Keine Fragen'), h('p', null, query.modus === 'fehler' ? 'Keine Fehler gespeichert – stark!' : query.modus === 'faellig' ? 'Heute ist nichts fällig.' : 'Für diese Auswahl gibt es keine Fragen.'), h('a', { class: 'btn', href: '#/mc' }, 'Zurück')));
    return;
  }
  const antworten = new Map(); // id → {auswahl, ergebnis}
  let i = 0;
  const kopf = h('div', { class: 'zeile zwischen' });
  const fortschritt = h('div', { class: 'fortschritt', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(fragen.length) }, h('div'));
  const buehne = h('div');
  const t = pruefung ? timer('mc-pruefung-' + (query.themen || '') + fragen.length, fragen.length, { onAblauf: () => abgeben() }) : null;
  if (t) { store.setzeEntwurf('timer:mc-pruefung-' + (query.themen || '') + fragen.length, ''); t.starte(); }
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/mc' }, '← Einstellungen')), kopf, fortschritt, buehne);
  let tastatur;

  const zeige = () => {
    const q = fragen[i];
    leere(kopf).append(h('strong', null, `Frage ${i + 1} von ${fragen.length}`), t ? t.element : h('span', { class: 'leise klein' }, MODI[query.modus] || ''));
    fortschritt.firstChild.style.width = `${Math.round((i / fragen.length) * 100)}%`;
    fortschritt.setAttribute('aria-valuenow', String(i));
    const ui = frageUI(q, antworten.get(q.id)?.auswahl);
    const feedback = h('div', { 'aria-live': 'polite' });
    const pruefen = h('button', { type: 'button', class: 'btn' }, pruefung ? (i < fragen.length - 1 ? 'Weiter' : 'Abgeben') : 'Antwort prüfen');
    const zurueck = h('button', { type: 'button', class: 'btn leise', disabled: i === 0, onclick: () => { speichern(); i--; zeige(); } }, 'Zurück');
    const speichern = () => { antworten.set(q.id, { auswahl: ui.auswahl() }); };
    let beantwortet = !pruefung && antworten.get(q.id)?.ergebnis;
    pruefen.addEventListener('click', () => {
      if (pruefung) { speichern(); if (i < fragen.length - 1) { i++; zeige(); } else abgeben(); return; }
      if (beantwortet) { if (i < fragen.length - 1) { i++; zeige(); } else ende(); return; }
      const auswahl = ui.auswahl();
      const erg = bewerteMC(q, auswahl, regel);
      antworten.set(q.id, { auswahl, ergebnis: erg });
      store.srsBewertung('mc:' + q.id, erg.status);
      ui.zeigeLoesung();
      leere(feedback).append(h('p', null, status(erg.status, erg.status === 'richtig' ? 'Richtig' : erg.status === 'teilweise' ? `Teilweise (${String(erg.punkte).replace('.', ',')} P.)` : 'Falsch')));
      beantwortet = true;
      pruefen.textContent = i < fragen.length - 1 ? 'Nächste Frage' : 'Auswertung';
      pruefen.focus();
    });
    leere(buehne).append(karte(
      h('div', { class: 'zeile zwischen' }, h('span', { class: 'badge' }, themen.find(x => x.id === q.thema)?.titel || q.thema), h('span', null, ungeprueftBadge(q), ' ', h('span', { class: 'badge' }, 'Schwierigkeit ' + '●'.repeat(q.schwierigkeit)))),
      h('h2', { class: 'lese' }, inline(q.frage)),
      ui.element, feedback,
      h('div', { class: 'btn-reihe' }, zurueck, pruefen),
      h('p', { class: 'klein leise' }, 'Tasten: 1–6 Antwort wählen · Enter prüfen/weiter')));
    if (beantwortet) { ui.zeigeLoesung(); pruefen.textContent = i < fragen.length - 1 ? 'Nächste Frage' : 'Auswertung'; }
    document.removeEventListener('keydown', tastatur);
    tastatur = (e) => {
      if (e.target.matches('input[type=text], textarea, select')) return;
      if (/^[1-9]$/.test(e.key)) { ui.taste(parseInt(e.key, 10) - 1); e.preventDefault(); }
      if (e.key === 'Enter' && !e.target.matches('button, a')) { pruefen.click(); e.preventDefault(); }
    };
    document.addEventListener('keydown', tastatur);
  };

  const abgeben = () => {
    t && t.stop();
    let punkte = 0;
    for (const q of fragen) {
      const a = antworten.get(q.id) || { auswahl: q.typ === 'zuordnung' ? {} : [] };
      a.ergebnis = bewerteMC(q, a.auswahl, regel);
      antworten.set(q.id, a);
      punkte += a.ergebnis.punkte;
      store.srsBewertung('mc:' + q.id, a.ergebnis.status);
    }
    const n = note(punkte, fragen.length, store.einstellungen().notenschluessel || STANDARD_NOTENSCHLUESSEL);
    store.versuch('mc', { art: 'pruefung', punkte: runde(punkte), max: fragen.length, note: n.note, regel, themen: (query.themen || '').split(',') });
    ende(true);
  };

  const ende = (warPruefung) => {
    document.removeEventListener('keydown', tastatur);
    const ergebnisse = fragen.map(q => ({ q, e: antworten.get(q.id)?.ergebnis || bewerteMC(q, [], regel) }));
    const punkte = runde(ergebnisse.reduce((s, x) => s + x.e.punkte, 0));
    const n = note(punkte, fragen.length, store.einstellungen().notenschluessel || STANDARD_NOTENSCHLUESSEL);
    fortschritt.firstChild.style.width = '100%';
    leere(kopf).append(h('strong', null, 'Auswertung'));
    const falsche = ergebnisse.filter(x => x.e.status !== 'richtig').map(x => x.q.id);
    leere(buehne).append(
      karte(h('p', { class: 'gross' }, `${String(punkte).replace('.', ',')} / ${fragen.length} P.`), h('p', null, `${n.prozent} % · Note ${n.note} · Regel: ${MC_REGELN[regel]}`),
        h('p', null, status('richtig', `${ergebnisse.filter(x => x.e.status === 'richtig').length} richtig`), ' ', status('teilweise', `${ergebnisse.filter(x => x.e.status === 'teilweise').length} teilweise`), ' ', status('falsch', `${ergebnisse.filter(x => x.e.status === 'falsch').length} falsch`)),
        h('div', { class: 'btn-reihe' },
          falsche.length ? h('a', { class: 'btn', href: `#/mc?start=1&modus=ueben&ids=${falsche.join(',')}&n=999&regel=${regel}` }, 'Fehler wiederholen') : null,
          h('a', { class: 'btn sekundaer', href: '#/mc' }, 'Neue Runde'))),
      warPruefung ? karte(h('h2', null, 'Alle Fragen mit Lösung'), ergebnisse.map(({ q }) => {
        const ui = frageUI(q, antworten.get(q.id)?.auswahl, true);
        ui.zeigeLoesung();
        const e = antworten.get(q.id).ergebnis;
        return h('div', null, h('hr'), h('p', null, status(e.status, e.status), ' ', h('strong', null, inline(q.frage))), ui.element);
      })) : null);
  };

  zeige();
  return () => { document.removeEventListener('keydown', tastatur); t && t.stop(); };
}

/** Baut die UI einer Frage. Optionen werden pro Aufruf gemischt (Reihenfolge bleibt innerhalb der Sitzung stabil). */
const reihenfolgen = new Map();
function frageUI(q, vorauswahl, gesperrt = false) {
  if (q.typ === 'zuordnung') return zuordnungUI(q, vorauswahl || {}, gesperrt);
  if (!reihenfolgen.has(q.id)) reihenfolgen.set(q.id, q.typ === 'aussagen' ? q.optionen : mische(q.optionen));
  const opts = reihenfolgen.get(q.id);
  const gewaehlt = new Set(vorauswahl || []);
  if (q.typ === 'aussagen') {
    const werte = new Map(); // id → true/false/undefined
    for (const o of opts) if (vorauswahl) werte.set(o.id, gewaehlt.has(o.id));
    const zeilen = opts.map((o, idx) => {
      const r = h('button', { type: 'button', 'aria-pressed': String(werte.get(o.id) === true), disabled: gesperrt }, 'Richtig');
      const f = h('button', { type: 'button', 'aria-pressed': String(werte.get(o.id) === false), disabled: gesperrt }, 'Falsch');
      const setze = (v) => { werte.set(o.id, v); r.setAttribute('aria-pressed', String(v === true)); f.setAttribute('aria-pressed', String(v === false)); };
      r.addEventListener('click', () => setze(true)); f.addEventListener('click', () => setze(false));
      const erkl = h('div', { class: 'erklaerung', hidden: true }, inline(o.erklaerung));
      const zeile = h('li', { class: 'aussage', role: 'group', 'aria-label': `Aussage ${idx + 1}` }, h('span', null, h('span', { class: 'nr' }, `${idx + 1}. `), inline(o.text), erkl), h('span', { class: 'rf' }, r, f));
      return { o, zeile, erkl, setze, umschalten: () => setze(werte.get(o.id) === true ? false : true) };
    });
    return {
      element: h('ol', { class: 'optionen' }, zeilen.map(z => z.zeile)),
      auswahl: () => opts.filter(o => werte.get(o.id) === true).map(o => o.id),
      taste: (n) => zeilen[n] && !gesperrt && zeilen[n].umschalten(),
      zeigeLoesung: () => zeilen.forEach(z => {
        const markiertRichtig = werte.get(z.o.id) === true;
        const ok = markiertRichtig === z.o.korrekt && werte.has(z.o.id);
        z.zeile.classList.add(ok ? 'ok' : 'falsch');
        z.erkl.hidden = false;
        z.erkl.prepend(status(ok ? 'ok' : 'falsch', z.o.korrekt ? 'Aussage ist richtig' : 'Aussage ist falsch'), ' ');
        z.zeile.querySelectorAll('button').forEach(b => { b.disabled = true; });
      })
    };
  }
  const typ = q.typ === 'single' ? 'radio' : 'checkbox';
  const name = 'q-' + q.id + (gesperrt ? '-r' : '');
  const zeilen = opts.map((o, idx) => {
    const inp = h('input', { type: typ, name, value: o.id, checked: gewaehlt.has(o.id), disabled: gesperrt, id: `${name}-${o.id}` });
    const erkl = h('div', { class: 'erklaerung', hidden: true }, inline(o.erklaerung));
    const label = h('label', { class: 'option', for: `${name}-${o.id}` }, inp, h('span', { class: 'nr', 'aria-hidden': 'true' }, `${idx + 1}`), h('span', null, inline(o.text), erkl));
    return { o, inp, label, erkl };
  });
  return {
    element: h('div', null, q.typ !== 'single' ? h('p', { class: 'klein leise' }, 'Mehrere Antworten können richtig sein.') : null, h('div', { class: 'optionen', role: q.typ === 'single' ? 'radiogroup' : 'group' }, zeilen.map(z => z.label))),
    auswahl: () => zeilen.filter(z => z.inp.checked).map(z => z.o.id),
    taste: (n) => { const z = zeilen[n]; if (!z || z.inp.disabled) return; z.inp.checked = typ === 'radio' ? true : !z.inp.checked; },
    zeigeLoesung: () => zeilen.forEach(z => {
      z.inp.disabled = true;
      const an = z.inp.checked;
      if (z.o.korrekt && an) z.label.classList.add('ok');
      else if (!z.o.korrekt && an) z.label.classList.add('falsch');
      else if (z.o.korrekt && !an) z.label.classList.add('verpasst');
      z.erkl.hidden = false;
      z.erkl.prepend(status(z.o.korrekt ? 'ok' : 'falsch', z.o.korrekt ? 'richtig' : 'falsch'), ' ');
    })
  };
}

function zuordnungUI(q, vorauswahl, gesperrt) {
  if (!reihenfolgen.has(q.id)) reihenfolgen.set(q.id, mische(q.paare));
  const paare = reihenfolgen.get(q.id);
  const zeilen = paare.map((p, idx) => {
    const sel = h('select', { 'aria-label': `Zuordnung für: ${p.text}`, disabled: gesperrt },
      h('option', { value: '' }, '– wählen –'), q.ziele.map(z => h('option', { value: z.id, selected: vorauswahl[p.id] === z.id }, z.text)));
    const erkl = h('div', { class: 'erklaerung', hidden: true });
    const zeile = h('li', { class: 'aussage' }, h('span', null, h('span', { class: 'nr' }, `${idx + 1}. `), inline(p.text), erkl), sel);
    return { p, sel, erkl, zeile };
  });
  return {
    element: h('ol', { class: 'optionen' }, zeilen.map(z => z.zeile)),
    auswahl: () => Object.fromEntries(zeilen.map(z => [z.p.id, z.sel.value])),
    taste: (n) => zeilen[n]?.sel.focus(),
    zeigeLoesung: () => zeilen.forEach(z => {
      z.sel.disabled = true;
      const ok = z.sel.value === z.p.loesung;
      z.zeile.classList.add(ok ? 'ok' : 'falsch');
      z.erkl.hidden = false;
      z.erkl.append(status(ok ? 'ok' : 'falsch', ok ? 'richtig' : 'Lösung: ' + q.ziele.find(x => x.id === z.p.loesung).text), ' ', inline(z.p.erklaerung));
    })
  };
}
