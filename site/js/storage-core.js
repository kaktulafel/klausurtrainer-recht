// Lernstand: Schema, Migrationen, Validierung, Export/Import – rein, ohne DOM/localStorage.

export const SCHEMA = 4;
export const KLAUSURTERMIN = '2026-11-09'; // Nachklausur; in den Einstellungen änderbar
// MC-Fragen, die im November 2026 inhaltlich neu gefasst wurden: alter Lernfortschritt passt nicht mehr.
export const MC_NEU_GEFASST = ["ds-mc-019","ds-mc-062","ds-mc-077","ds-mc-001","ds-mc-002","ds-mc-003","ds-mc-004","ds-mc-006","ds-mc-012","ds-mc-015","ds-mc-016","ds-mc-018","ds-mc-021","ds-mc-024","ds-mc-030","ds-mc-031","ds-mc-032","ds-mc-035","ds-mc-039","ds-mc-042","ds-mc-046","ds-mc-051","ds-mc-054","ds-mc-055","ds-mc-056","ds-mc-058","ds-mc-061","ds-mc-063","ds-mc-065","ds-mc-067","ds-mc-068","ds-mc-069","ds-mc-070","ds-mc-071","ds-mc-072","ds-mc-073","ds-mc-074","ds-mc-078","ds-mc-084","ds-mc-085","ds-mc-087","ds-mc-089","ds-mc-090","ds-mc-094","ds-mc-095","ds-mc-097","ds-mc-101","ds-mc-102","ds-mc-106","ds-mc-110","ds-mc-111","ds-mc-114","ds-mc-115","ds-mc-117","ds-mc-120","ds-mc-122","ds-mc-125","ds-mc-127","ds-mc-128","ds-mc-133","ds-mc-136","ds-mc-140"];
export const PREFIX = 'nk-recht:';
export const STATE_KEY = PREFIX + 'state';
export const BACKUP_KEY = PREFIX + 'backup';
export const KEY_KEY = PREFIX + 'ki-key'; // API-Key – nie im Export!

export function standardEinstellungen() {
  return {
    klausurdatum: KLAUSURTERMIN, // "YYYY-MM-DD"
    mcRegel: 'abzug',
    notenschluessel: null,       // null = Standard
    theme: 'system',             // system | hell | dunkel
    kiModell: 'claude-sonnet-5-5',
    kiNurSitzung: false,
    tagesminuten: 60
  };
}

export function leererZustand() {
  return {
    schema: SCHEMA,
    erstellt: new Date().toISOString(),
    einstellungen: standardEinstellungen(),
    srs: {},          // "typ:id" → Karte (siehe srs.js)
    entwuerfe: {},    // Schlüssel → { text, aktualisiert }
    versuche: { faelle: [], klausuren: [], mc: [] },
    serie: []         // ISO-Tage mit Lernaktivität
  };
}

const MIGRATIONEN = {
  // v1 (frühe Entwicklungsversion): { version: 1, einstellungen, karten, entwuerfe, verlauf }
  1: (alt) => {
    const neu = leererZustand();
    neu.einstellungen = { ...neu.einstellungen, ...(isObj(alt.einstellungen) ? alt.einstellungen : {}) };
    neu.srs = isObj(alt.karten) ? alt.karten : {};
    neu.entwuerfe = isObj(alt.entwuerfe) ? alt.entwuerfe : {};
    if (Array.isArray(alt.verlauf)) neu.versuche.faelle = alt.verlauf.filter(isObj);
    neu.schema = 2;
    return neu;
  },
  2: (alt) => {
    const srs = { ...(isObj(alt.srs) ? alt.srs : {}) };
    for (const id of MC_NEU_GEFASST) delete srs['mc:' + id];
    return { ...alt, srs, schema: 3 };
  },
  // Klausurtermin steht fest: nur ein leeres Datum füllen, ein selbst gesetztes bleibt
  3: (alt) => ({ ...alt, einstellungen: { ...(isObj(alt.einstellungen) ? alt.einstellungen : {}), klausurdatum: alt.einstellungen?.klausurdatum || KLAUSURTERMIN }, schema: 4 })
};

function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

/**
 * Lädt einen gespeicherten Rohstring robust.
 * @returns {{zustand:object, status:'neu'|'ok'|'migriert'|'repariert'|'defekt', backup?:string, meldung?:string}}
 */
export function ladeZustand(roh) {
  if (roh === null || roh === undefined || roh === '') return { zustand: leererZustand(), status: 'neu' };
  let daten;
  try { daten = JSON.parse(roh); }
  catch { return { zustand: leererZustand(), status: 'defekt', backup: roh, meldung: 'Gespeicherter Lernstand war nicht lesbar und wurde als Backup gesichert.' }; }
  if (!isObj(daten)) return { zustand: leererZustand(), status: 'defekt', backup: roh, meldung: 'Gespeicherter Lernstand hatte ein unbekanntes Format und wurde als Backup gesichert.' };
  let version = daten.schema ?? daten.version;
  if (typeof version !== 'number') return { zustand: leererZustand(), status: 'defekt', backup: roh, meldung: 'Lernstand ohne Versionsangabe – als Backup gesichert.' };
  if (version > SCHEMA) return { zustand: leererZustand(), status: 'defekt', backup: roh, meldung: 'Lernstand stammt aus einer neueren App-Version – als Backup gesichert. Bitte Seite neu laden.' };
  let status = 'ok';
  try {
    while (version < SCHEMA) {
      const m = MIGRATIONEN[version];
      if (!m) throw new Error('Keine Migration für Version ' + version);
      daten = m(daten);
      version = daten.schema;
      status = 'migriert';
    }
  } catch (e) {
    return { zustand: leererZustand(), status: 'defekt', backup: roh, meldung: 'Migration fehlgeschlagen – Lernstand als Backup gesichert.' };
  }
  const { zustand, repariert } = repariere(daten);
  return { zustand, status: repariert && status === 'ok' ? 'repariert' : status };
}

/** Ergänzt fehlende/kaputte Teilbereiche, ohne vorhandene gültige Daten zu verwerfen. */
export function repariere(d) {
  const basis = leererZustand();
  let repariert = false;
  const z = { ...basis, ...d, schema: SCHEMA };
  if (!isObj(z.einstellungen)) { z.einstellungen = basis.einstellungen; repariert = true; }
  else z.einstellungen = { ...basis.einstellungen, ...z.einstellungen };
  if (!isObj(z.srs)) { z.srs = {}; repariert = true; }
  else {
    for (const [k, v] of Object.entries(z.srs)) {
      if (!isObj(v) || typeof v.anzahl !== 'number') { delete z.srs[k]; repariert = true; }
    }
  }
  if (!isObj(z.entwuerfe)) { z.entwuerfe = {}; repariert = true; }
  if (!isObj(z.versuche)) { z.versuche = basis.versuche; repariert = true; }
  for (const t of ['faelle', 'klausuren', 'mc']) {
    if (!Array.isArray(z.versuche[t])) { z.versuche[t] = []; repariert = true; }
  }
  if (!Array.isArray(z.serie)) { z.serie = []; repariert = true; }
  return { zustand: z, repariert };
}

/** Export als JSON-Text (ohne API-Key, der liegt separat). */
export function exportiere(zustand) {
  return JSON.stringify({ app: 'nk-recht', exportiert: new Date().toISOString(), ...zustand });
}

/** Import: akzeptiert Export-JSON (auch mit Leerraum/Zeilenumbrüchen). Wirft verständliche Fehler. */
export function importiere(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Kein Text zum Importieren.');
  let d;
  try { d = JSON.parse(text.trim()); } catch { throw new Error('Der Text ist kein gültiger Lernstand-Export (JSON fehlerhaft).'); }
  if (!isObj(d) || (d.app && d.app !== 'nk-recht')) throw new Error('Das ist kein Export dieser App.');
  delete d.app; delete d.exportiert;
  if (JSON.stringify(d).includes('sk-ant-')) throw new Error('Der Import enthält einen API-Key – abgebrochen.');
  const r = ladeZustand(JSON.stringify(d));
  if (r.status === 'defekt') throw new Error(r.meldung || 'Lernstand nicht lesbar.');
  return r.zustand;
}

/** Fügt einen Tag zur Lernserie hinzu und berechnet die aktuelle Serie (in Tagen). */
export function markiereLerntag(serie, tag) {
  const s = new Set(serie || []);
  s.add(tag);
  return [...s].sort().slice(-400);
}

export function serieLaenge(serie, tag, addTage) {
  const s = new Set(serie || []);
  let n = 0, t = tag;
  if (!s.has(t)) t = addTage(t, -1); // heute noch nicht gelernt: Serie bis gestern zählt
  while (s.has(t)) { n++; t = addTage(t, -1); }
  return n;
}
