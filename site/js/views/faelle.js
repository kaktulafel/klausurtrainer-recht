// Gutachten-Trainer: Fallliste, Sachverhalt, geführter Modus, Klausurmodus, Skizzen-Sprint, Lösung, Bewertung.
import { h, leere, md, karte, status, toast, inline } from '../ui/dom.js';
import { tabs, timer, sortierListe, autosaveEditor, gestufteTipps, kiPanel, themenBadges, ungeprueftBadge } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import * as store from '../store.js';
import { normenCheck } from '../normparser.js';
import { begriffCheck, stilHinweise, woerter } from '../textcheck.js';
import { note, runde, STANDARD_NOTENSCHLUESSEL } from '../grading.js';
import { baueFallRequest, normalisiereKorrektur } from '../ai.js';
import { geh } from '../router.js';

const GERUEST = `A. Anspruch … gegen … auf … aus § … BGB
… könnte gegen … einen Anspruch auf … aus § … BGB haben.
Dies setzt voraus, dass …

I. [Tatbestandsmerkmal 1]
Unter … versteht man … .
Vorliegend … . Somit … .

II. [Tatbestandsmerkmal 2]
Fraglich ist, ob … .

III. Ergebnis
Somit hat … gegen … einen/keinen Anspruch auf … aus § … BGB.
`;
const BAUSTEINE = [
  '… könnte gegen … einen Anspruch auf … aus § … BGB haben.',
  'Dies setzt voraus, dass …',
  'Fraglich ist, ob …',
  'Unter … versteht man …',
  'Vorliegend …',
  'Somit …',
  'Folglich …',
  'Im Ergebnis …',
  '… könnte die … durch Anfechtung gemäß § 142 Abs. 1 BGB rückwirkend beseitigt haben.',
  'Dies ist hier unproblematisch der Fall.'
];

let themenMap = null;
async function themen() {
  if (!themenMap) { const t = await lade('themen.json'); themenMap = new Map(t.themen.map(x => [x.id, x])); }
  return themenMap;
}

export async function render(main, { pfad, query }) {
  const tm = await themen();
  if (pfad[1]) return renderFall(main, pfad[1], query, tm);
  const { daten } = await ladeKategorie('faelle');
  const filter = query.thema || '';
  const versuche = store.get().versuche.faelle;
  const liste = daten.filter(f => !filter || f.themen.includes(filter)).sort((a, b) => a.id.localeCompare(b.id));
  const auswahl = h('select', { 'aria-label': 'Nach Thema filtern', onchange: (e) => geh('#/faelle' + (e.target.value ? '?thema=' + e.target.value : '')) },
    h('option', { value: '' }, 'Alle Themen'),
    [...tm.values()].filter(t => t.bereich === 'recht' && daten.some(f => f.themen.includes(t.id))).map(t => h('option', { value: t.id, selected: t.id === filter }, t.titel)));
  main.append(
    h('h1', null, 'Gutachten-Trainer'),
    h('p', { class: 'leise' }, `${daten.length} Fälle · klausurgroß (≥ 60 min) und Kurzfälle. Modi: geführt, Klausurmodus mit Timer, Skizzen-Sprint.`),
    h('div', { class: 'suchfeld' }, auswahl),
    h('div', { class: 'raster zwei' }, liste.map(f => {
      const vs = versuche.filter(v => v.fallId === f.id);
      const letzter = vs[vs.length - 1];
      return h('a', { class: 'karte kachel', href: '#/faelle/' + f.id },
        h('div', { class: 'zeile zwischen' }, h('span', { class: 'badge' }, f.minuten >= 60 ? 'Klausurfall' : 'Kurzfall'), ungeprueftBadge(f)),
        h('h3', null, f.titel),
        h('p', { class: 'klein leise' }, f.kurz || ''),
        h('p', { class: 'klein' }, `⏱ ${f.minuten} min · ${f.punkte} P. · Schwierigkeit ${'●'.repeat(f.schwierigkeit)}${'○'.repeat(3 - f.schwierigkeit)}`),
        letzter ? h('p', { class: 'klein' }, status(letzter.punkte / letzter.max >= 0.5 ? 'ok' : 'falsch', `Zuletzt ${letzter.punkte}/${letzter.max} P. (Note ${letzter.note})`)) : h('p', { class: 'klein leise' }, 'Noch nicht bearbeitet'),
        themenBadges(f.themen, tm));
    }))
  );
}

async function renderFall(main, id, query, tm) {
  let fall;
  try { fall = await lade(`faelle/${id}.json`); }
  catch { main.append(karte(h('h1', null, 'Fall nicht gefunden'), h('a', { class: 'btn', href: '#/faelle' }, 'Zur Fallliste'))); return; }
  const aufraeumen = [];
  main.append(
    h('p', { class: 'klein' }, h('a', { href: '#/faelle' }, '← Alle Fälle')),
    h('h1', null, fall.titel, ' ', ungeprueftBadge(fall)),
    h('p', { class: 'leise' }, `⏱ ${fall.minuten} min · ${fall.punkte} Punkte (davon Gutachtenstil ${fall.gutachtenstil.reduce((s, g) => s + g.punkte, 0)}) · `, themenBadges(fall.themen, tm))
  );
  const t = tabs([
    { id: 'sachverhalt', label: 'Sachverhalt', render: (c) => renderSachverhalt(c, fall) },
    { id: 'gefuehrt', label: 'Geführt', render: (c) => renderGefuehrt(c, fall) },
    { id: 'klausur', label: 'Klausurmodus', render: (c) => aufraeumen.push(renderKlausur(c, fall, () => t.wechsle('bewertung'))) },
    { id: 'skizze', label: 'Skizzen-Sprint', render: (c) => aufraeumen.push(renderSkizze(c, fall)) },
    { id: 'bewertung', label: 'Bewertung', render: (c) => renderBewertung(c, fall) },
    { id: 'loesung', label: 'Lösung', render: (c) => renderLoesung(c, fall) },
  ], query.modus, (tid) => { history.replaceState(null, '', `#/faelle/${fall.id}?modus=${tid}`); while (aufraeumen.length) { try { aufraeumen.pop()?.(); } catch { /* ignore */ } } });
  main.append(t.element);
  return () => { while (aufraeumen.length) { try { aufraeumen.pop()?.(); } catch { /* ignore */ } } };
}

function sachverhaltKarte(fall) {
  return karte(
    h('h2', null, 'Sachverhalt'),
    h('div', { class: 'lese sachverhalt' }, fall.sachverhalt.map(p => h('p', null, inline(p)))),
    h('h3', null, 'Fallfrage(n)'),
    h('div', { class: 'lese' }, fall.fallfragen.map(p => h('p', null, h('strong', null, inline(p)))))
  );
}

function renderSachverhalt(c, fall) {
  c.append(sachverhaltKarte(fall),
    h('div', { class: 'btn-reihe' },
      h('a', { class: 'btn', href: `#/faelle/${fall.id}?modus=klausur` }, 'Im Klausurmodus lösen'),
      h('a', { class: 'btn sekundaer', href: `#/faelle/${fall.id}?modus=gefuehrt` }, 'Geführt lösen'),
      h('button', { type: 'button', class: 'btn leise', onclick: () => window.print() }, 'Drucken')));
}

// ---------- Geführter Modus ----------
function renderGefuehrt(c, fall) {
  const g = fall.gefuehrt;
  const schritt = (nr, titel, ...inhalt) => karte(h('h2', null, `Schritt ${nr}: ${titel}`), ...inhalt);
  c.append(h('details', null, h('summary', null, 'Sachverhalt anzeigen'), sachverhaltKarte(fall)));

  // 1: Anspruchsgrundlagen
  const ziel1 = h('div', { 'aria-live': 'polite' });
  const boxen = g.anspruchsgrundlagen.map((a, i) => ({ a, cb: h('input', { type: 'checkbox', id: `agl-${i}` }) }));
  c.append(schritt(1, 'Wer will was von wem woraus?', h('p', null, g.einstieg),
    h('div', null, boxen.map(({ a, cb }, i) => h('label', { class: 'check', for: `agl-${i}` }, cb, h('span', null, inline(a.text))))),
    h('button', { type: 'button', class: 'btn', onclick: () => {
      leere(ziel1);
      let alle = true;
      for (const { a, cb } of boxen) {
        const gewaehlt = cb.checked;
        const ok = gewaehlt === a.richtig;
        if (!ok) alle = false;
        if (gewaehlt || a.richtig) ziel1.append(h('p', null, status(ok ? 'ok' : 'falsch', ok ? (gewaehlt ? 'Richtig gewählt' : 'Richtig weggelassen') : (gewaehlt ? 'Nicht passend' : 'Fehlt')), ' ', inline(a.text), h('br'), h('span', { class: 'hinweis-text' }, inline(a.feedback))));
      }
      ziel1.prepend(h('p', null, alle ? status('ok', 'Alle Prüfungen richtig erkannt') : status('teil', 'Noch nicht ganz – lies die Hinweise')));
    } }, 'Prüfen'), ziel1));

  // 2: Obersatz
  const ed = autosaveEditor(`fall:${fall.id}:obersatz`, { label: 'Obersatz', platzhalter: '… könnte gegen … einen Anspruch auf … aus § … haben.', zeilen: 3 });
  ed.textarea.classList.add('kurz');
  ed.textarea.style.minHeight = '96px';
  const ziel2 = h('div');
  c.append(schritt(2, 'Obersatz', h('p', null, g.obersatzAufgabe), ed.textarea, ed.info,
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
      leere(ziel2);
      const txt = ed.wert();
      const hinweise = [];
      if (!/k(ö|oe)nnte/i.test(txt)) hinweise.push(['teil', 'Konjunktiv fehlt („könnte … haben“).']);
      if (!/§|Art\./.test(txt)) hinweise.push(['falsch', 'Keine Anspruchsgrundlage (Norm) genannt.']);
      if (!/gegen/i.test(txt)) hinweise.push(['teil', '„gegen wen?“ fehlt.']);
      if (!hinweise.length) hinweise.push(['ok', 'Form stimmt: Konjunktiv, Anspruchsgegner, Norm.']);
      ziel2.append(...hinweise.map(([a, t]) => h('p', null, status(a, t))), h('p', null, h('strong', null, 'Muster: '), inline(g.obersatzMuster)));
    } }, 'Mit Muster vergleichen')), ziel2));

  // 3: Reihenfolge
  const gemischt = mischeStabil(g.reihenfolge, fall.id);
  const sl = sortierListe(gemischt, g.reihenfolgeTitel);
  const ziel3 = h('p', { 'aria-live': 'polite' });
  c.append(schritt(3, 'Prüfungsreihenfolge', h('p', null, g.reihenfolgeTitel), sl.element,
    h('button', { type: 'button', class: 'btn', onclick: () => {
      sl.markiere(g.reihenfolge);
      const ok = sl.reihenfolge().every((x, i) => x === g.reihenfolge[i]);
      ziel3.replaceChildren(ok ? status('ok', 'Perfekte Reihenfolge') : status('teil', 'Noch nicht richtig – rot markierte Punkte stehen falsch.'));
      store.srsBewertung('schema-fall:' + fall.id, ok ? 'richtig' : 'falsch');
    } }, 'Reihenfolge prüfen'), ziel3));

  // 4: Definition + Subsumtion je Punkt
  g.punkte.forEach((p, i) => {
    const e = autosaveEditor(`fall:${fall.id}:punkt:${i}`, { label: p.titel, platzhalter: 'Definition → Subsumtion → Zwischenergebnis', zeilen: 6 });
    e.textarea.style.minHeight = '150px';
    const ziel = h('div');
    c.append(schritt(4 + i, p.titel, h('p', null, inline(p.aufgabe)), gestufteTipps(p.tipps), e.textarea, e.info,
      h('button', { type: 'button', class: 'btn sekundaer', onclick: () => {
        leere(ziel).append(h('h3', null, 'Muster'), md(p.muster, { lese: true }));
        const nc = normenCheck(fall.erwarteteNormen.filter(n => p.muster.includes(n.replace(/ BGB$/, ''))), e.wert());
        if (nc.ergebnisse.length) ziel.append(h('p', { class: 'klein' }, 'Normen aus dem Muster: ', ...nc.ergebnisse.map(r => [status(r.status === 'ok' ? 'ok' : r.status === 'teil' ? 'teil' : 'fehlt', r.zitat), ' '])));
      } }, 'Mit Muster vergleichen'), ziel));
  });
  c.append(karte(h('h2', null, 'Ergebnis'), h('p', null, 'Formuliere zum Schluss für jede Prüfung einen Ergebnissatz („Somit hat … keinen Anspruch …“). Danach: komplette Lösung im Klausurmodus schreiben und bewerten.'),
    h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: `#/faelle/${fall.id}?modus=klausur` }, 'Weiter zum Klausurmodus'), h('a', { class: 'btn sekundaer', href: `#/faelle/${fall.id}?modus=loesung` }, 'Musterlösung ansehen'))));
}

function mischeStabil(arr, seed) {
  let s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.every((x, i) => x === arr[i]) && a.length > 1) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

// ---------- Klausurmodus ----------
function renderKlausur(c, fall, zurBewertung) {
  const ed = autosaveEditor(`fall:${fall.id}:klausur`, { klasse: 'editor', label: 'Deine Falllösung', platzhalter: 'Schreibe hier dein Gutachten …' });
  const tm = timer(`fall:${fall.id}`, fall.minuten);
  c.append(
    h('details', { open: true }, h('summary', null, 'Sachverhalt'), sachverhaltKarte(fall)),
    karte(
      h('div', { class: 'zeile zwischen' }, tm.element, ed.info),
      h('div', { class: 'btn-reihe' },
        h('button', { type: 'button', class: 'btn leise klein', onclick: () => ed.einfuegen(GERUEST) }, '＋ Gerüst einfügen'),
        h('details', null, h('summary', { class: 'btn leise klein' }, 'Formulierungsbausteine'),
          h('div', { class: 'bausteine' }, BAUSTEINE.map(b => h('button', { type: 'button', class: 'btn klein leise', onclick: () => ed.einfuegen(b + ' ') }, b))))),
      ed.textarea,
      h('div', { class: 'btn-reihe' },
        h('button', { type: 'button', class: 'btn', onclick: () => { ed.sichern(); if (woerter(ed.wert()) < 20) { toast('Bitte erst eine Lösung schreiben.'); return; } zurBewertung(); } }, 'Abgeben & bewerten'),
        h('button', { type: 'button', class: 'btn leise', onclick: () => { if (confirm('Text wirklich löschen?')) { ed.textarea.value = ''; ed.textarea.dispatchEvent(new Event('input')); ed.sichern(); } } }, 'Text löschen')))
  );
  return () => { tm.stop(); ed.stop(); };
}

// ---------- Skizzen-Sprint ----------
function renderSkizze(c, fall) {
  const ed = autosaveEditor(`fall:${fall.id}:skizze`, { label: 'Lösungsskizze', platzhalter: 'A. Anspruch … aus § …\n  I. …\n  II. …', zeilen: 12 });
  const tm = timer(`skizze:${fall.id}`, 10);
  const ziel = h('div');
  c.append(
    h('details', { open: true }, h('summary', null, 'Sachverhalt'), sachverhaltKarte(fall)),
    karte(h('p', null, 'Nur die Gliederung mit Normen – in 10 Minuten. Danach mit der Musterskizze vergleichen.'), tm.element, ed.textarea, ed.info,
      h('button', { type: 'button', class: 'btn', onclick: () => {
        ed.sichern();
        leere(ziel);
        const nc = normenCheck(fall.erwarteteNormen, ed.wert());
        ziel.append(karte(h('h2', null, 'Musterskizze'), skizzeListe(fall)),
          karte(h('h2', null, 'Normen-Check deiner Skizze'), normenCheckListe(nc)));
        const quote = nc.ergebnisse.filter(r => r.status !== 'fehlt').length / Math.max(1, nc.ergebnisse.length);
        store.srsBewertung('skizze:' + fall.id, quote >= 0.8 ? 'richtig' : quote >= 0.5 ? 'teilweise' : 'falsch');
      } }, 'Vergleichen')), ziel);
  return () => { tm.stop(); ed.stop(); };
}

function skizzeListe(fall) {
  return h('div', { class: 'lese' }, fall.skizze.map(s => h('p', { class: s.ebene > 1 ? 'klein' : '' }, ' '.repeat((s.ebene - 1) * 4), inline(s.text))));
}

function normenCheckListe(nc) {
  return h('div', null,
    h('ul', { class: 'themenliste' }, nc.ergebnisse.map(r => h('li', null, status(r.status === 'ok' ? 'ok' : r.status === 'teil' ? 'teil' : 'fehlt', r.status === 'ok' ? 'genannt' : r.status === 'teil' ? 'ungenau' : 'fehlt'), ' ', inline(r.zitat), r.status === 'teil' ? h('span', { class: 'klein leise' }, ` (du: ${r.gefunden.join(', ')})`) : null))),
    nc.zusatz.length ? h('p', { class: 'klein' }, status('zusatz', 'zusätzlich (prüfen)'), ' ', inline(nc.zusatz.join(', '))) : null);
}

// ---------- Bewertung ----------
function renderBewertung(c, fall) {
  const text = store.entwurf(`fall:${fall.id}:klausur`);
  if (woerter(text) < 20) {
    c.append(karte(h('p', null, 'Noch keine Lösung im Klausurmodus geschrieben. Du kannst das Raster trotzdem für eine handschriftliche Lösung nutzen.'), h('a', { class: 'btn', href: `#/faelle/${fall.id}?modus=klausur` }, 'Zum Klausurmodus')));
  }
  // Vergleichsansicht
  const meinText = karte(h('h2', null, 'Deine Lösung'), h('div', { class: 'lese' }, text ? md(text) : h('p', { class: 'leise' }, '–')));
  const muster = karte(h('h2', null, 'Musterlösung'), fall.musterloesung.map(a => h('div', null, h('h3', null, a.titel), md(a.text, { lese: true }))));
  const vergleich = h('div', { class: 'vergleich nebeneinander' }, meinText, muster);
  const umschalter = h('div', { class: 'btn-reihe nicht-drucken' },
    h('button', { type: 'button', class: 'btn klein leise', onclick: () => { meinText.hidden = false; muster.hidden = true; } }, 'Nur meine'),
    h('button', { type: 'button', class: 'btn klein leise', onclick: () => { meinText.hidden = true; muster.hidden = false; } }, 'Nur Muster'),
    h('button', { type: 'button', class: 'btn klein leise', onclick: () => { meinText.hidden = false; muster.hidden = false; } }, 'Beide'));
  if (window.innerWidth < 900) muster.hidden = true;

  // Automatische Checks
  const nc = normenCheck(fall.erwarteteNormen, text);
  const bc = begriffCheck(fall.schluesselbegriffe, text);
  const sh = stilHinweise(text);
  const checks = karte(h('h2', null, 'Automatische Checks'),
    h('h3', null, 'Normen-Check'), normenCheckListe(nc),
    h('h3', null, 'Schlüsselbegriffe'), h('p', null, bc.map(b => [status(b.gefunden ? 'ok' : 'fehlt', b.begriff), ' '])),
    h('h3', null, 'Gutachtenstil-Hinweise ', h('span', { class: 'badge' }, 'Heuristik – nur Hinweis')),
    h('ul', { class: 'themenliste' }, sh.map(x => h('li', null, status(x.art === 'ok' ? 'ok' : x.art === 'warnung' ? 'falsch' : 'teil', x.art === 'ok' ? 'ok' : x.art === 'warnung' ? 'Warnung' : 'Hinweis'), ' ', x.text))));

  // Punkteraster
  const vergeben = {};
  const summe = h('p', { class: 'gross', 'aria-live': 'polite' });
  const aktualisiere = () => {
    const inhalt = fall.raster.reduce((s, r) => s + (vergeben[r.id] || 0), 0);
    const stil = fall.gutachtenstil.reduce((s, g) => s + (vergeben[g.id] || 0), 0);
    const ges = runde(inhalt + stil);
    const n = note(ges, fall.punkte, store.einstellungen().notenschluessel || STANDARD_NOTENSCHLUESSEL);
    summe.textContent = `${ges} / ${fall.punkte} P. · ${n.prozent} % · Note ${n.note}`;
    return { ges, stil: runde(stil), inhalt: runde(inhalt), n };
  };
  const zeile = (r) => {
    const sel = h('select', { 'aria-label': `Punkte für ${r.kriterium}`, onchange: (e) => { vergeben[r.id] = parseFloat(e.target.value); aktualisiere(); } });
    for (let p = 0; p <= r.punkte + 1e-9; p += 0.5) sel.append(h('option', { value: String(p) }, String(p).replace('.', ',')));
    vergeben[r.id] = 0;
    return h('tr', null, h('td', null, inline(r.kriterium)), h('td', { class: 'p' }, sel, ` / ${r.punkte}`));
  };
  const abschnitte = fall.musterloesung.map(a => a.id);
  const raster = karte(h('h2', null, 'Punkteraster zum Abhaken'),
    h('p', { class: 'klein leise' }, 'Vergleiche ehrlich mit der Musterlösung. Halbe Punkte möglich.'),
    h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' },
      abschnitte.map(aid => [h('tr', null, h('th', { colspan: '2' }, fall.musterloesung.find(a => a.id === aid).titel)), fall.raster.filter(r => r.abschnitt === aid).map(zeile)]),
      h('tr', null, h('th', { colspan: '2' }, 'Gutachtenstil (eigener Punkteblock)')), fall.gutachtenstil.map(zeile))),
    summe,
    h('button', { type: 'button', class: 'btn', onclick: () => {
      const { ges, stil, n } = aktualisiere();
      store.versuch('faelle', { fallId: fall.id, themen: fall.themen, punkte: ges, max: fall.punkte, stil, note: n.note, modus: 'selbst' });
      toast(`Gespeichert: ${ges}/${fall.punkte} P. (Note ${n.note})`);
    } }, 'Bewertung speichern'));
  aktualisiere();

  const ki = kiPanel({
    baueRequest: (key, modell) => baueFallRequest({ apiKey: key, modell, fall, text: store.entwurf(`fall:${fall.id}:klausur`) }),
    normalisiere: (obj) => normalisiereKorrektur(obj, fall),
    render: (ziel, e) => renderKi(ziel, e, fall)
  });

  // Verlauf
  const vs = store.get().versuche.faelle.filter(v => v.fallId === fall.id);
  const verlauf = vs.length ? karte(h('h2', null, 'Verlauf'), h('ul', { class: 'themenliste' }, vs.slice(-10).reverse().map(v => h('li', null, `${v.datum}: ${v.punkte}/${v.max} P. (Stil ${v.stil ?? '–'}) · Note ${v.note} · ${v.modus === 'ki' ? 'KI' : 'Selbstbewertung'}`)))) : null;

  c.append(umschalter, vergleich, checks, raster, ki, verlauf);
}

function renderKi(ziel, e, fall) {
  const n = note(e.summe, e.max, store.einstellungen().notenschluessel || STANDARD_NOTENSCHLUESSEL);
  ziel.append(
    h('p', { class: 'gross' }, `${e.summe} / ${e.max} P. · Note ${n.note}`),
    h('p', { class: 'klein leise' }, `Inhalt ${e.summeInhalt} · Gutachtenstil ${e.summeStil} – Summen von der App selbst berechnet.`),
    h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' }, [...e.raster, ...e.stil].map(r => h('tr', null, h('td', null, h('strong', null, r.kriterium), h('br'), h('span', { class: 'klein leise' }, r.begruendung)), h('td', { class: 'p' }, `${r.punkte} / ${r.max}`))))),
    liste('Stärken', e.staerken), liste('Fachliche Fehler', e.fachlicheFehler), liste('Fehlende Prüfungspunkte', e.fehlendePruefungspunkte), liste('Fehlende Normen', e.fehlendeNormen), liste('Tipps', e.tipps),
    e.verbessertePassage.verbessert ? h('div', null, h('h4', null, 'Verbesserte Fassung der schwächsten Passage'), h('p', { class: 'klein leise' }, e.verbessertePassage.original), h('p', null, e.verbessertePassage.verbessert)) : null,
    h('button', { type: 'button', class: 'btn sekundaer', onclick: () => { store.versuch('faelle', { fallId: fall.id, themen: fall.themen, punkte: e.summe, max: e.max, stil: e.summeStil, note: n.note, modus: 'ki' }); toast('KI-Bewertung im Verlauf gespeichert.'); } }, 'KI-Ergebnis speichern'));
}

function liste(titel, arr) {
  if (!arr || !arr.length) return null;
  return h('div', null, h('h4', null, titel), h('ul', null, arr.map(x => h('li', null, x))));
}

// ---------- Lösung ----------
function renderLoesung(c, fall) {
  c.append(
    karte(h('h2', null, 'Lösungsskizze'), skizzeListe(fall)),
    karte(h('h2', null, 'Musterlösung (Gutachtenstil)'), fall.musterloesung.map(a => h('section', null, h('h3', null, a.titel), md(a.text, { lese: true })))),
    karte(h('h2', null, 'Punkteraster'), h('div', { class: 'scroll-x' }, h('table', { class: 'raster-tab' },
      fall.raster.map(r => h('tr', null, h('td', null, `${r.abschnitt} · `, inline(r.kriterium)), h('td', { class: 'p' }, `${r.punkte} P.`))),
      fall.gutachtenstil.map(g => h('tr', null, h('td', null, 'Stil · ', g.kriterium), h('td', { class: 'p' }, `${g.punkte} P.`)))))),
    karte(h('h2', null, 'Typische Fehler'), h('ul', { class: 'lese' }, fall.typischeFehler.map(f => h('li', null, inline(f))))),
    fall.abwandlungen.length ? karte(h('h2', null, 'Abwandlungen'), fall.abwandlungen.map(a => h('details', null, h('summary', null, inline(a.frage)), md(a.kurzloesung, { lese: true })))) : null,
    karte(h('h2', null, 'Erwartete Normen & Begriffe'), h('p', null, inline(fall.erwarteteNormen.join(' · '))), h('p', { class: 'klein leise' }, fall.schluesselbegriffe.map(b => b.split('|')[0]).join(' · '))),
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn leise', onclick: () => { document.querySelectorAll('details').forEach(d => { d.open = true; }); window.print(); } }, 'Drucken'))
  );
}
