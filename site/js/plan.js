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

/**
 * Tagesplan aus Klausurdatum, offenen Inhalten und Ergebnissen.
 * @returns {{tageBis:number|null, phase:string, ziele:Array<{art:string, text:string, anzahl?:number, link?:string}>}}
 */
export function tagesplan({ heute, klausurdatum, faellig = 0, ungeseheneMC = 0, ungeseheneWissen = 0, ungeseheneNormkarten = 0, faelleOffen = [], schwach = [], tagesminuten = 60 }) {
  const ziele = [];
  const tageBis = klausurdatum ? tageZwischen(heute, klausurdatum) : null;
  if (tageBis !== null && tageBis < 0) {
    return { tageBis, phase: 'vorbei', ziele: [{ art: 'info', text: 'Das Klausurdatum liegt in der Vergangenheit – bitte in den Einstellungen aktualisieren.' }] };
  }
  if (tageBis !== null && tageBis <= 2) {
    ziele.push({ art: 'wiederholung', text: `Alle fälligen Karten wiederholen (${faellig})`, anzahl: faellig, link: '#/wiederholen' });
    if (tageBis >= 1) ziele.push({ art: 'klausur', text: 'Eine komplette Probeklausur unter Zeitdruck schreiben (90 min)', link: '#/klausur' });
    ziele.push({ art: 'schemata', text: 'Schemata Anfechtung, Stellvertretung, § 179, Minderjährigenrecht durchgehen', link: '#/schemata' });
    ziele.push({ art: 'taktik', text: 'Klausurtaktik und Gutachtenstil-Bausteine lesen', link: '#/schwachstellen/taktik' });
    return { tageBis, phase: tageBis === 0 ? 'klausurtag' : 'endspurt', ziele };
  }
  const lerntage = tageBis === null ? 14 : Math.max(1, tageBis - 2);
  const faktor = Math.max(0.5, Math.min(2, tagesminuten / 60));
  const neuMC = Math.min(30, Math.ceil((ungeseheneMC / lerntage) * 1.0) || 0);
  const neuW = Math.min(12, Math.ceil(ungeseheneWissen / lerntage) || 0);
  const neuN = Math.min(20, Math.ceil(ungeseheneNormkarten / lerntage) || 0);
  if (faellig) ziele.push({ art: 'wiederholung', text: `${faellig} fällige Karten wiederholen`, anzahl: faellig, link: '#/wiederholen' });
  if (faelleOffen.length) ziele.push({ art: 'fall', text: `Fall lösen: ${faelleOffen[0].titel}`, link: `#/faelle/${faelleOffen[0].id}` });
  if (schwach.length) ziele.push({ art: 'drill', text: `Schwachstellen-Drill: ${schwach[0].titel}`, link: '#/schwachstellen' });
  if (neuW) ziele.push({ art: 'wissen', text: `${Math.round(neuW * faktor) || 1} neue Wissensfragen`, anzahl: neuW, link: '#/wissen' });
  if (neuMC) ziele.push({ art: 'mc', text: `${Math.round(neuMC * faktor) || 1} neue Datenschutz-Fragen`, anzahl: neuMC, link: '#/mc' });
  if (neuN) ziele.push({ art: 'normen', text: `${Math.round(neuN * faktor) || 1} neue Normkarten`, anzahl: neuN, link: '#/normen/karten' });
  if (tageBis !== null && tageBis <= 7 && tageBis % 3 === 0) ziele.push({ art: 'klausur', text: 'Probeklausur-Simulation (Zwischenstand)', link: '#/klausur' });
  return { tageBis, phase: tageBis === null ? 'ohne-datum' : 'aufbau', ziele };
}
