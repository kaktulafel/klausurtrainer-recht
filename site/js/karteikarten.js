// Karteikarten und Cheatsheets: reine Logik ohne DOM.

/** Oberste Ebene eines Schemas als Textzeilen: „Punkt (Norm): Unterpunkt, Unterpunkt“. */
export function schemaPunkte(schema) {
  const mitNorm = (k) => k.text + (k.norm && !k.text.includes(k.norm) ? ` (${k.norm})` : '');
  return schema.knoten.map(k => mitNorm(k) + (k.kinder?.length ? ': ' + k.kinder.map(mitNorm).join('; ') : ''));
}

/** Volltextsuche im Cheatsheet: alle Wörter müssen im Eintrag vorkommen. */
export function eintragPasst(e, suche) {
  const woerter = String(suche ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!woerter.length) return true;
  const text = [e.titel, e.norm, e.text, e.hinweis, ...(e.punkte || [])].filter(Boolean).join(' ').toLowerCase();
  return woerter.every(w => text.includes(w));
}

/** Kartenstapel: nach Thema filtern; Modus faellig/schwach; sonst unbekannte und schwache Karten zuerst. */
export function stapelAuswaehlen(karten, srs, { themen = [], modus = 'alle', n = 20, heute = '', mische = (x) => x } = {}) {
  const fach = (k) => srs['karte:' + k.id]?.fach ?? -1;
  let pool = karten.filter(k => !themen.length || themen.includes(k.thema));
  if (modus === 'faellig') pool = pool.filter(k => { const f = srs['karte:' + k.id]?.faellig; return f && f <= heute; });
  if (modus === 'schwach') pool = pool.filter(k => ['falsch', 'teilweise'].includes(srs['karte:' + k.id]?.letzte));
  return mische(mische(pool).sort((a, b) => fach(a) - fach(b)).slice(0, n));
}
