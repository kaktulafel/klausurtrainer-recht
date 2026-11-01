// Lernplan & Schwachstellen (rein, ohne DOM).
import { tageZwischen, quote } from './srs.js';

const GEWICHT = { A: 3, B: 2, C: 1 };

/**
 * Statistik je Thema aus SRS-Karten und Fallversuchen.
 * @param {Array} themen  aus themen.json
 * @param {Record<string,object>} srs   "typ:id" → Karte
 * @param {Record<string,string>} itemThema  "typ:id" → themaId
 * @param {Array} fallVersuche  [{themen:[...], punkte, max, datum}]
 */
export function themenStatistik(themen, srs, itemThema, fallVersuche = []) {
  const st = {};
  for (const t of themen) st[t.id] = { id: t.id, titel: t.titel, gewicht: t.gewicht, bereich: t.bereich, anzahl: 0, punkte: 0, zuletzt: null, items: 0, geuebt: 0 };
  for (const [key, thema] of Object.entries(itemThema || {})) {
    if (!st[thema]) continue;
    st[thema].items++;
    const k = srs?.[key];
    if (k && k.anzahl) {
      st[thema].geuebt++;
      st[thema].anzahl += k.anzahl;
      st[thema].punkte += k.richtig + 0.5 * (k.teilweise || 0);
      if (!st[thema].zuletzt || k.zuletzt > st[thema].zuletzt) st[thema].zuletzt = k.zuletzt;
    }
  }
  for (const v of fallVersuche) {
    if (!v || !(v.max > 0)) continue;
    for (const th of v.themen || []) {
      if (!st[th]) continue;
      st[th].anzahl += 1;
      st[th].punkte += v.punkte / v.max;
      if (!st[th].zuletzt || v.datum > st[th].zuletzt) st[th].zuletzt = v.datum;
    }
  }
  for (const s of Object.values(st)) {
    s.quote = s.anzahl ? s.punkte / s.anzahl : null;
    s.ampel = s.quote === null ? 'grau' : s.quote >= 0.8 ? 'gruen' : s.quote >= 0.55 ? 'gelb' : 'rot';
  }
  return st;
}

/** Priorität: hohes Gewicht und schlechte (oder fehlende) Quote zuerst. */
export function schwachstellen(statistik, n = 5) {
  return Object.values(statistik)
    .map(s => ({ ...s, prio: GEWICHT[s.gewicht] * (s.quote === null ? 0.9 : 1 - s.quote) + (s.quote === null ? 0 : 0.01 * Math.min(s.anzahl, 10)) }))
    .sort((a, b) => b.prio - a.prio)
    .slice(0, n);
}

// Geschätzter Zeitbedarf in Minuten je Einheit
const MINUTEN = { wiederholung: 1, karte: 1, wissen: 3, mc: 1.5, normkarte: 0.5, drill: 15, klausur: 120, skizze: 10 };

/** Verteilt das Fall-Budget auf offene Fälle in Prioritätsreihenfolge; mindestens einer, wenn er noch passt. */
function faelleFuerBudget(faelle, budget, rest) {
  const wahl = [];
  let genutzt = 0;
  // Klausurgroße Fälle zuerst: Sie entsprechen Teil A und passen später nicht mehr in einen Resttag.
  const reihenfolge = [...faelle].sort((a, b) => ((b.minuten || 30) >= 60) - ((a.minuten || 30) >= 60));
  for (const f of reihenfolge) {
    const m = f.minuten || 30;
    if (genutzt + m > budget && wahl.length) continue;
    if (m > rest) continue;
    wahl.push(f);
    genutzt += m;
    if (genutzt >= budget) break;
  }
  return { wahl, genutzt };
}

/**
 * Tagesplan aus Klausurdatum, offenen Inhalten, Ergebnissen und der täglichen Lernzeit.
 * Jedes Ziel nennt seine geschätzte Dauer; die Summe bleibt im Rahmen von tagesminuten.
 * @returns {{tageBis:number|null, phase:string, minuten:number, ziele:Array<{art:string, text:string, anzahl?:number, minuten?:number, link?:string}>}}
 */
export function tagesplan({ heute, klausurdatum, faellig = 0, ungeseheneMC = 0, ungeseheneWissen = 0, ungeseheneNormkarten = 0, ungeseheneKarten = 0, faelleOffen = [], faelleAlle = [], schwach = [], tagesminuten = 60 }) {
  const ziele = [];
  const summe = () => Math.round(ziele.reduce((n, z) => n + (z.minuten || 0), 0));
  const tageBis = klausurdatum ? tageZwischen(heute, klausurdatum) : null;
  if (tageBis !== null && tageBis < 0) {
    return { tageBis, phase: 'vorbei', minuten: 0, ziele: [{ art: 'info', text: 'Das Klausurdatum liegt in der Vergangenheit – bitte in den Einstellungen aktualisieren.' }] };
  }
  let rest = tagesminuten;
  const buche = (ziel) => { ziele.push(ziel); rest = Math.max(0, rest - (ziel.minuten || 0)); };
  const wiederholen = (anteil) => {
    if (!faellig) return;
    const n = Math.min(faellig, Math.floor((rest * anteil) / MINUTEN.wiederholung));
    buche({ art: 'wiederholung', text: n < faellig ? `${n} von ${faellig} fälligen Karten wiederholen` : `${faellig} fällige Karten wiederholen`, anzahl: faellig, minuten: n * MINUTEN.wiederholung, link: '#/wiederholen' });
  };

  if (tageBis !== null && tageBis <= 2) {
    if (tageBis === 0) {
      wiederholen(1);
      ziele.push({ art: 'schemata', text: 'Schemata Anfechtung, Stellvertretung, § 179, Minderjährigenrecht durchgehen', link: '#/cheatsheets/schemata' });
      ziele.push({ art: 'taktik', text: 'Klausurtaktik und Gutachtenstil-Bausteine lesen', link: '#/schwachstellen/taktik' });
      return { tageBis, phase: 'klausurtag', minuten: summe(), ziele };
    }
    buche({ art: 'klausur', text: 'Komplette Probeklausur unter Zeitdruck schreiben und danach auswerten', minuten: MINUTEN.klausur, link: '#/klausur' });
    wiederholen(0.5);
    buche({ art: 'schemata', text: 'Schemata Anfechtung, Stellvertretung, § 179, Minderjährigenrecht durchgehen', minuten: Math.min(30, rest), link: '#/cheatsheets/schemata' });
    const quelle = faelleOffen.length ? faelleOffen : faelleAlle;
    const nSprint = Math.min(quelle.length, Math.floor(Math.max(0, rest - 15) / MINUTEN.skizze));
    const start = tageBis === 1 ? nSprint : 0;
    for (const f of quelle.slice(start, start + nSprint)) buche({ art: 'skizze', text: `Skizzen-Sprint: ${f.titel}`, minuten: MINUTEN.skizze, link: `#/faelle/${f.id}?modus=skizze` });
    buche({ art: 'taktik', text: 'Klausurtaktik und Gutachtenstil-Bausteine lesen', minuten: Math.min(15, rest), link: '#/schwachstellen/taktik' });
    return { tageBis, phase: 'endspurt', minuten: summe(), ziele };
  }

  const lerntage = tageBis === null ? 14 : Math.max(1, tageBis - 2);
  if (tageBis === 3) buche({ art: 'klausur', text: 'Probeklausur-Simulation mit Auswertung (Zwischenstand)', minuten: MINUTEN.klausur, link: '#/klausur' });
  wiederholen(0.25);

  // Fälle zuerst: Sie bringen die meisten Punkte. Offene Fälle sollen vor dem Endspurt durch sein.
  const offenMinuten = faelleOffen.reduce((n, f) => n + (f.minuten || 30), 0);
  const fallBudget = Math.min(rest * 0.7, Math.max(rest * 0.5, offenMinuten / lerntage));
  const { wahl } = faelleFuerBudget(faelleOffen, fallBudget, rest);
  for (const f of wahl) buche({ art: 'fall', text: `Fall lösen: ${f.titel}`, minuten: f.minuten || 30, link: `#/faelle/${f.id}` });

  const neu = (anzahlGesamt, deckel = Infinity) => Math.min(deckel, Math.ceil(anzahlGesamt / lerntage) || 0);
  if (schwach.length && rest >= MINUTEN.drill) buche({ art: 'drill', text: `Schwachstellen-Drill: ${schwach[0].titel}`, minuten: MINUTEN.drill, link: '#/schwachstellen' });
  // Die Restzeit wird nach Anteilen geteilt, damit kein Klausurteil leer ausgeht. Normkarten nur mit übriger Zeit: Normen darf man nachschlagen.
  const posten = [
    { art: 'karten', anzahl: neu(ungeseheneKarten), min: MINUTEN.karte, anteil: 0.4, text: 'neue Karteikarten Recht', link: '#/karteikarten' },
    { art: 'mc', anzahl: neu(ungeseheneMC), min: MINUTEN.mc, anteil: 0.35, text: 'neue Datenschutz-Fragen', link: '#/mc' },
    { art: 'wissen', anzahl: neu(ungeseheneWissen), min: MINUTEN.wissen, anteil: 0.25, text: 'neue Wissensfragen', link: '#/wissen' },
    { art: 'normen', anzahl: neu(ungeseheneNormkarten), min: MINUTEN.normkarte, anteil: 0, text: 'neue Normkarten', link: '#/normen/karten' }
  ];
  const verfuegbar = rest;
  let frei = rest;
  for (const x of posten) { x.n = Math.min(x.anzahl, Math.floor((verfuegbar * x.anteil) / x.min)); frei -= x.n * x.min; }
  for (const x of posten) { const dazu = Math.min(x.anzahl - x.n, Math.floor(frei / x.min)); x.n += dazu; frei -= dazu * x.min; }
  for (const x of posten) if (x.n >= 1) buche({ art: x.art, text: `${x.n} ${x.text}`, anzahl: x.anzahl, minuten: x.n * x.min, link: x.link });
  // Bleibt Zeit, werden schon bearbeitete Fälle als Skizzen-Sprint vertieft.
  const nSprint = Math.floor(rest / MINUTEN.skizze);
  if (nSprint >= 2) {
    const quelle = faelleAlle.filter(f => !wahl.includes(f)).slice(0, nSprint);
    if (quelle.length) buche({ art: 'skizze', text: `Skizzen-Sprint zu ${quelle.length} ${quelle.length === 1 ? 'Fall' : 'Fällen'}: ${quelle[0].titel}${quelle.length > 1 ? ' u. a.' : ''}`, minuten: quelle.length * MINUTEN.skizze, link: `#/faelle/${quelle[0].id}?modus=skizze` });
  }
  return { tageBis, phase: tageBis === null ? 'ohne-datum' : 'aufbau', minuten: summe(), ziele };
}
