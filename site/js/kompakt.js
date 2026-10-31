// Fälle kompakt: Ansprüche aus den Lösungsskizzen herauslösen und nach Anspruchsgrundlage gruppieren (ohne DOM).
import { parseNormen } from './normparser.js';

const ANSPRUCH = /Anspruch\s+(\S+)\s+gegen\s+(\S+)\b.*?\baus\s+((?:§§?|Art\.)\s.*?\b(?:BGB|StVG|EFZG|DSGVO|BDSG))/;

/** Liest „A. Anspruch V gegen K auf … aus § 433 Abs. 2 BGB“ → { wer, gegen, grundlage } oder null. */
export function anspruchAus(text) {
  const m = String(text ?? '').match(ANSPRUCH);
  if (!m) return null;
  return { wer: m[1], gegen: m[2], grundlage: m[3].replace(/\s+Nr\.\s*\d+/g, '').trim() };
}

// Reine Gliederungsüberschriften ohne Prüfungsgegenstand („Frage 1“, „Teil 1“).
export const NUR_UEBERSCHRIFT = /^(?:Frage|Teil)\s+\d+$/;

/** Prüfungsgegenstand ohne Gliederungszeichen: „B. Anspruch …“ → „Anspruch …“. */
export function ohneGliederung(text) {
  return String(text ?? '').replace(/^(?:[A-Z]|[IVX]+|\d+)\.\s+/, '');
}

function ersteNr(grundlage) {
  const n = parseNormen(grundlage)[0];
  return n ? parseFloat(n.nr) || 0 : 0;
}

/**
 * Alle Prüfungen der obersten Ebene aus den Skizzen: Ansprüche gruppiert nach Anspruchsgrundlage
 * (aufsteigend nach Paragraph), übrige Prüfungen (Gestaltungsrechte, Wirksamkeit …) separat.
 */
export function gruppiereAnsprueche(faelle) {
  const gruppen = new Map();
  const sonstige = [];
  for (const f of faelle) {
    for (const z of f.skizze || []) {
      if (z.ebene !== 1) continue;
      const a = anspruchAus(z.text);
      const eintrag = { fallId: f.id, fallTitel: f.titel, text: ohneGliederung(z.text) };
      if (!a) { if (!NUR_UEBERSCHRIFT.test(eintrag.text)) sonstige.push(eintrag); continue; }
      if (!gruppen.has(a.grundlage)) gruppen.set(a.grundlage, { grundlage: a.grundlage, eintraege: [] });
      gruppen.get(a.grundlage).eintraege.push({ ...eintrag, wer: a.wer, gegen: a.gegen });
    }
  }
  const liste = [...gruppen.values()].sort((x, y) => ersteNr(x.grundlage) - ersteNr(y.grundlage) || x.grundlage.localeCompare(y.grundlage, 'de'));
  return { gruppen: liste, sonstige };
}

// Anspruchsgrundlage → passendes Prüfungsschema (nur eindeutige Zuordnungen).
const SCHEMA_ZU = [
  [/^§ 433 Abs\. 2 BGB$/, 'schema-kaufpreis'],
  [/^§ 179 /, 'schema-179'],
  [/^§ 122 /, 'schema-anfechtung'],
  [/^§ 812 /, 'schema-812'],
  [/^§ 823 /, 'schema-823'],
  [/^§ 355 /, 'schema-widerruf'],
  [/^§§ 280 Abs\. 1, 311 Abs\. 2, 241 Abs\. 2 BGB$/, 'schema-cic']
];
export function schemaFuer(grundlage) {
  const t = SCHEMA_ZU.find(([re]) => re.test(grundlage));
  return t ? t[1] : null;
}
export const SCHEMA_IDS = SCHEMA_ZU.map(([, id]) => id);

/** Volltextsuche über Titel, Kurzbeschreibung, Fallfragen und Skizze (Groß-/Kleinschreibung egal, alle Wörter). */
export function fallPasst(fall, suche) {
  const woerter = String(suche ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!woerter.length) return true;
  const text = [fall.id, fall.titel, fall.kurz, ...(fall.fallfragen || []), ...(fall.skizze || []).map(z => z.text)].join(' ').toLowerCase();
  return woerter.every(w => text.includes(w));
}
