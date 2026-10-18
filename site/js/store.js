// Lernstand im localStorage (Präfix nk-recht:) mit Autosave, Backup und Export/Import.
import { ladeZustand, STATE_KEY, BACKUP_KEY, KEY_KEY, exportiere, importiere, leererZustand, markiereLerntag } from './storage-core.js';
import { bewerte as srsBewerte, heute } from './srs.js';

let zustand = null;
let speicherbar = true;
let ladeMeldung = null;
let timer = null;
const hoerer = new Set();

function ls() {
  try { return window.localStorage; } catch { return null; }
}

export function init() {
  const s = ls();
  let roh = null;
  try { roh = s ? s.getItem(STATE_KEY) : null; } catch { speicherbar = false; }
  if (!s) speicherbar = false;
  const r = ladeZustand(roh);
  zustand = r.zustand;
  if (r.status === 'defekt' && r.backup) {
    try { s.setItem(BACKUP_KEY + ':' + Date.now(), r.backup); } catch { /* voll */ }
    ladeMeldung = r.meldung;
    speichereJetzt();
  } else if (r.status === 'migriert' || r.status === 'repariert') {
    if (roh) try { s.setItem(BACKUP_KEY + ':vor-migration', roh); } catch { /* ignore */ }
    speichereJetzt();
  }
  if (!speicherbar) ladeMeldung = 'Der Browser erlaubt keinen lokalen Speicher (privater Modus?). Fortschritt geht beim Schließen verloren – bitte regelmäßig exportieren.';
  return { meldung: ladeMeldung };
}

export function get() { return zustand; }
export function einstellungen() { return zustand.einstellungen; }

/** Ändert den Zustand über eine Funktion und speichert verzögert. */
export function update(fn, { sofort = false } = {}) {
  fn(zustand);
  if (sofort) speichereJetzt(); else speichereSpaeter();
  for (const h of hoerer) { try { h(zustand); } catch { /* ignore */ } }
}

export function onChange(fn) { hoerer.add(fn); return () => hoerer.delete(fn); }

function speichereSpaeter() {
  clearTimeout(timer);
  timer = setTimeout(speichereJetzt, 800);
}

export function speichereJetzt() {
  clearTimeout(timer);
  const s = ls();
  if (!s) return false;
  try { s.setItem(STATE_KEY, JSON.stringify(zustand)); speicherbar = true; return true; }
  catch { speicherbar = false; return false; }
}

// ---- Bequemlichkeitsfunktionen ----
export function srsBewertung(key, bewertung) {
  const tag = heute();
  update(z => {
    z.srs[key] = srsBewerte(z.srs[key], bewertung, tag);
    z.serie = markiereLerntag(z.serie, tag);
  });
}

export function entwurf(key) { return zustand.entwuerfe[key]?.text || ''; }
export function setzeEntwurf(key, text) {
  update(z => { z.entwuerfe[key] = { text, aktualisiert: new Date().toISOString() }; });
}

export function versuch(art, eintrag) {
  update(z => {
    z.versuche[art].push({ ...eintrag, datum: eintrag.datum || heute() });
    if (z.versuche[art].length > 300) z.versuche[art] = z.versuche[art].slice(-300);
    z.serie = markiereLerntag(z.serie, heute());
  }, { sofort: true });
}

export function exportText() { return exportiere(zustand); }
export function importText(text) {
  const neu = importiere(text);
  zustand = neu;
  speichereJetzt();
  for (const h of hoerer) { try { h(zustand); } catch { /* ignore */ } }
}

export function zuruecksetzen() {
  const s = ls();
  if (s) try { s.setItem(BACKUP_KEY + ':reset-' + Date.now(), JSON.stringify(zustand)); } catch { /* ignore */ }
  zustand = leererZustand();
  speichereJetzt();
}

/** Nur eigene Schlüssel entfernen (geteilte Origin auf GitHub Pages). */
export function alleEigenenSchluessel() {
  const s = ls(); if (!s) return [];
  const k = [];
  for (let i = 0; i < s.length; i++) { const key = s.key(i); if (key && key.startsWith('nk-recht:')) k.push(key); }
  return k;
}

// ---- API-Key (nie im Export, wahlweise nur Sitzung) ----
export function apiKey() {
  try { return window.sessionStorage.getItem(KEY_KEY) || ls()?.getItem(KEY_KEY) || ''; } catch { return ''; }
}
export function setzeApiKey(key, nurSitzung) {
  loescheApiKey();
  if (!key) return;
  try { (nurSitzung ? window.sessionStorage : ls()).setItem(KEY_KEY, key.trim()); } catch { /* ignore */ }
}
export function loescheApiKey() {
  try { window.sessionStorage.removeItem(KEY_KEY); } catch { /* ignore */ }
  try { ls()?.removeItem(KEY_KEY); } catch { /* ignore */ }
}

// Beim Verlassen sofort sichern
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => speichereJetzt());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') speichereJetzt(); });
}
