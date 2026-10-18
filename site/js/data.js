// Datenlader: lädt JSON aus data/ bei Bedarf (relativer Pfad!), mit Cache.
const cache = new Map();

export class DatenFehler extends Error { constructor(m) { super(m); this.name = 'DatenFehler'; } }

export async function lade(pfad) {
  if (cache.has(pfad)) return cache.get(pfad);
  const p = (async () => {
    let res;
    try { res = await fetch('data/' + pfad, { cache: 'no-cache' }); }
    catch { throw new DatenFehler(`Datendatei „${pfad}“ konnte nicht geladen werden (offline und nicht im Cache?).`); }
    if (!res.ok) throw new DatenFehler(`Datendatei „${pfad}“ fehlt (HTTP ${res.status}).`);
    try { return await res.json(); }
    catch { throw new DatenFehler(`Datendatei „${pfad}“ ist beschädigt.`); }
  })();
  cache.set(pfad, p);
  p.catch(() => cache.delete(pfad));
  return p;
}

export async function index() { return lade('index.json'); }

/** Lädt alle Dateien einer Kategorie (faelle, mc, wissen, normkarten) und hängt sie aneinander. */
export async function ladeKategorie(kat) {
  const idx = await index();
  const dateien = idx.dateien[kat] || [];
  const teile = await Promise.allSettled(dateien.map(d => lade(d)));
  const daten = [], fehler = [];
  teile.forEach((t, i) => {
    if (t.status === 'fulfilled') { if (Array.isArray(t.value)) daten.push(...t.value); else daten.push(t.value); }
    else fehler.push(dateien[i]);
  });
  if (!daten.length && fehler.length) throw new DatenFehler(`Keine Daten für „${kat}“ ladbar.`);
  return { daten, fehler };
}

/** Nur geprüfte Inhalte für Prüfungen/Klausuren. */
export function nurGeprueft(liste) { return liste.filter(x => x.geprueft === true); }
