// Sammelt alle Lerninhalte (für Dashboard, Statistik, Wiederholung): Zuordnung Item-Schlüssel → Thema.
import { lade, ladeKategorie } from './data.js';

let cache = null;

/** Lädt alle Kategorien tolerant (fehlende Dateien → leer). */
export async function alleInhalte() {
  if (cache) return cache;
  const sicher = (p) => p.then(r => r.daten ?? r).catch(() => []);
  const [themen, mc, wissen, normkarten, faelle, schemata, drills] = await Promise.all([
    lade('themen.json').then(t => t.themen).catch(() => []),
    sicher(ladeKategorie('mc')), sicher(ladeKategorie('wissen')), sicher(ladeKategorie('normkarten')), sicher(ladeKategorie('faelle')),
    lade('schemata.json').catch(() => []), lade('drills.json').catch(() => [])
  ]);
  const itemThema = {};
  for (const q of mc) itemThema['mc:' + q.id] = q.thema;
  for (const w of wissen) itemThema['wissen:' + w.id] = w.thema;
  for (const k of normkarten) itemThema['nk:' + k.id] = k.thema;
  for (const s of schemata) itemThema['schema:' + s.id] = s.thema;
  for (const d of drills) itemThema['drill:' + d.id] = d.thema;
  cache = { themen, mc, wissen, normkarten, faelle, schemata, drills, itemThema };
  return cache;
}
