// Bewertungslogik (rein, ohne DOM): MC-Regeln, Notenschlüssel, Rasterpunkte.

export const MC_REGELN = {
  'abzug': 'Teilpunkte mit Abzug (min. 0 je Frage)',
  'alles-oder-nichts': 'Alles oder nichts',
  'teilpunkte': 'Teilpunkte ohne Abzug',
  'minuspunkte': 'Minuspunkte: jedes falsche Kreuz −1 Option (min. 0 je Frage)'
};

export const STANDARD_MC_REGEL = 'abzug';

/**
 * Bewertet eine Multiple-Choice-Frage.
 * @param {{typ:string, optionen:Array<{id:string, korrekt:boolean}>, aussagen?:Array<{korrekt:boolean}>}} frage
 * @param {Set<string>|string[]} auswahl  gewählte Options-IDs (bei 'aussagen': IDs der als "richtig" markierten Aussagen;
 *        bei 'zuordnung': Objekt {aussageId: optionId})
 * @param {string} regel
 * @param {number} maxPunkte
 * @returns {{punkte:number, max:number, status:'richtig'|'teilweise'|'falsch', richtigeTreffer:number, falscheTreffer:number}}
 */
export function bewerteMC(frage, auswahl, regel = STANDARD_MC_REGEL, maxPunkte = 1) {
  if (frage.typ === 'zuordnung') return bewerteZuordnung(frage, auswahl || {}, regel, maxPunkte);
  const gewaehlt = auswahl instanceof Set ? auswahl : new Set(auswahl || []);
  const optionen = frage.optionen || [];
  const n = optionen.length || 1;
  let korrektEntschieden = 0; // richtig gekreuzt oder richtig weggelassen
  let richtigeTreffer = 0, falscheTreffer = 0, verpassteRichtige = 0;
  for (const o of optionen) {
    const an = gewaehlt.has(o.id);
    if (an && o.korrekt) { richtigeTreffer++; korrektEntschieden++; }
    else if (!an && !o.korrekt) korrektEntschieden++;
    else if (an && !o.korrekt) falscheTreffer++;
    else verpassteRichtige++;
  }
  const allesRichtig = falscheTreffer === 0 && verpassteRichtige === 0;
  let anteil;
  if (frage.typ === 'single') {
    // Single Choice: genau eine Antwort; nur die richtige zählt.
    anteil = allesRichtig && richtigeTreffer === 1 ? 1 : 0;
  } else {
    switch (regel) {
      case 'alles-oder-nichts': anteil = allesRichtig ? 1 : 0; break;
      case 'teilpunkte': anteil = korrektEntschieden / n; break;
      case 'minuspunkte': {
        const anzRichtig = optionen.filter(o => o.korrekt).length || 1;
        anteil = Math.max(0, (richtigeTreffer - falscheTreffer) / anzRichtig);
        break;
      }
      case 'abzug':
      default:
        anteil = Math.max(0, (korrektEntschieden - (n - korrektEntschieden)) / n);
    }
  }
  const punkte = runde(anteil * maxPunkte);
  return { punkte, max: maxPunkte, status: statusAus(punkte, maxPunkte), richtigeTreffer, falscheTreffer };
}

function bewerteZuordnung(frage, zuordnung, regel, maxPunkte) {
  const paare = frage.paare || [];
  const n = paare.length || 1;
  let richtig = 0, falsch = 0;
  for (const p of paare) {
    const v = zuordnung[p.id];
    if (v === undefined || v === null || v === '') continue;
    if (v === p.loesung) richtig++; else falsch++;
  }
  let anteil;
  if (regel === 'alles-oder-nichts') anteil = richtig === n ? 1 : 0;
  else if (regel === 'teilpunkte') anteil = richtig / n;
  else anteil = Math.max(0, (richtig - falsch) / n);
  const punkte = runde(anteil * maxPunkte);
  return { punkte, max: maxPunkte, status: statusAus(punkte, maxPunkte), richtigeTreffer: richtig, falscheTreffer: falsch };
}

export function statusAus(punkte, max) {
  if (max <= 0) return 'falsch';
  if (punkte >= max - 1e-9) return 'richtig';
  if (punkte > 1e-9) return 'teilweise';
  return 'falsch';
}

export function runde(x, stellen = 2) {
  const f = 10 ** stellen;
  return Math.round(x * f + Number.EPSILON) / f;
}

export const STANDARD_NOTENSCHLUESSEL = [
  { ab: 95, note: '1,0' }, { ab: 90, note: '1,3' }, { ab: 85, note: '1,7' }, { ab: 80, note: '2,0' },
  { ab: 75, note: '2,3' }, { ab: 70, note: '2,7' }, { ab: 65, note: '3,0' }, { ab: 60, note: '3,3' },
  { ab: 55, note: '3,7' }, { ab: 50, note: '4,0' }, { ab: 0, note: '5,0' }
];

/** Note aus Punkten. Grenzen sind inklusive (≥). Rundungsfehler werden abgefangen. */
export function note(punkte, max, schluessel = STANDARD_NOTENSCHLUESSEL) {
  if (!(max > 0)) return { prozent: 0, note: '5,0', bestanden: false };
  const prozent = runde((Math.max(0, Math.min(punkte, max)) / max) * 100, 4);
  const sortiert = [...schluessel].sort((a, b) => b.ab - a.ab);
  const stufe = sortiert.find(s => prozent + 1e-9 >= s.ab) || sortiert[sortiert.length - 1];
  return { prozent: runde(prozent, 1), note: stufe.note, bestanden: stufe.note !== '5,0' };
}

/** Prüft einen benutzerdefinierten Notenschlüssel (für Einstellungen). */
export function validiereNotenschluessel(s) {
  if (!Array.isArray(s) || !s.length) return false;
  if (!s.some(x => x.ab === 0)) return false;
  return s.every(x => typeof x.ab === 'number' && x.ab >= 0 && x.ab <= 100 && typeof x.note === 'string' && x.note.length);
}

/**
 * Summiert Rasterpunkte (abgehakt) für einen Fall. Begrenzung auf das Maximum je Kriterium.
 * @param {Array<{id:string,punkte:number}>} raster
 * @param {Record<string, number|boolean>} vergeben  id → true (volle Punkte) oder Zahl
 */
export function rasterSumme(raster, vergeben) {
  let summe = 0, max = 0;
  for (const r of raster) {
    max += r.punkte;
    const v = vergeben?.[r.id];
    if (v === true) summe += r.punkte;
    else if (typeof v === 'number' && isFinite(v)) summe += Math.max(0, Math.min(v, r.punkte));
  }
  return { summe: runde(summe), max: runde(max) };
}

/** Mischt ein Array (Fisher-Yates). rnd injizierbar für Tests. */
export function mische(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
