// Spaced Repetition (Leitner mit 6 Fächern, „SM-2-light“) – rein, ohne DOM.
// Datum immer als ISO-Tag "YYYY-MM-DD" (lokale Zeit), damit Tests deterministisch sind.

export const INTERVALLE = [0, 1, 2, 4, 7, 14, 30]; // Tage je Fach (Index = Fach)
export const MAX_FACH = INTERVALLE.length - 1;

export function heute(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), t = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${t}`;
}

export function addTage(isoTag, tage) {
  const [y, m, d] = isoTag.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + tage));
  return dt.toISOString().slice(0, 10);
}

export function tageZwischen(von, bis) {
  const a = Date.UTC(...von.split('-').map((x, i) => i === 1 ? x - 1 : +x));
  const b = Date.UTC(...bis.split('-').map((x, i) => i === 1 ? x - 1 : +x));
  return Math.round((b - a) / 86400000);
}

export function neueKarte() {
  return { fach: 0, faellig: null, anzahl: 0, richtig: 0, teilweise: 0, falsch: 0, zuletzt: null };
}

/**
 * Wendet eine Bewertung an und liefert den neuen Kartenzustand (immutabel).
 * richtig → ein Fach höher; teilweise → Fach bleibt (min. 1), morgen wieder; falsch → Fach 1, heute erneut fällig.
 */
export function bewerte(karte, bewertung, tag) {
  const k = { ...neueKarte(), ...(karte || {}) };
  k.anzahl++;
  k.zuletzt = tag;
  k.letzte = bewertung;
  if (bewertung === 'richtig') {
    k.richtig++;
    k.fach = Math.min(MAX_FACH, k.fach + 1);
    k.faellig = addTage(tag, INTERVALLE[k.fach]);
  } else if (bewertung === 'teilweise') {
    k.teilweise++;
    k.fach = Math.max(1, k.fach);
    k.faellig = addTage(tag, 1);
  } else {
    k.falsch++;
    k.fach = 1;
    k.faellig = tag;
  }
  return k;
}

/** Ist eine Karte am Tag fällig? Neue (nie gesehene) Karten gelten nicht als fällig. */
export function istFaellig(karte, tag) {
  return !!(karte && karte.faellig && karte.faellig <= tag);
}

/** Liefert fällige IDs, sortiert nach Fälligkeit (älteste zuerst) und niedrigem Fach. */
export function faelligeIds(karten, tag) {
  return Object.entries(karten || {})
    .filter(([, k]) => istFaellig(k, tag))
    .sort(([, a], [, b]) => (a.faellig < b.faellig ? -1 : a.faellig > b.faellig ? 1 : a.fach - b.fach))
    .map(([id]) => id);
}

/** Trefferquote (0..1) – teilweise zählt halb. null, wenn noch nie geübt. */
export function quote(karte) {
  if (!karte || !karte.anzahl) return null;
  return (karte.richtig + 0.5 * (karte.teilweise || 0)) / karte.anzahl;
}
