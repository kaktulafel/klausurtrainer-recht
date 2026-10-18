// KI-Korrektur über die Claude-API direkt aus dem Browser (optional, eigener API-Key).
// Reine Funktionen + sende() mit injizierbarem fetch → vollständig per Mock testbar.
// Sicherheit: Der Key wird nie geloggt und taucht nie in Fehlermeldungen auf; Antworten werden nie als HTML gerendert.

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODELLE = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (empfohlen)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (günstig)' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (gründlich)' }
];
export const MAX_TOKENS = 16000;
export const TIMEOUT_MS = 180000;

export function headers(apiKey) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
}

const SYSTEM_FALL = `Du bist ein strenger, aber fairer Korrektor einer deutschen Hochschulklausur im Bürgerlichen Recht (BGB, Allgemeiner Teil und Grundlagen des Schuldrechts).
Regeln:
- Bewerte ausschließlich, was im Text der Bearbeitung tatsächlich steht. Unterstelle nichts.
- Vertretbare abweichende Lösungen erkennst du an, wenn sie gut begründet sind; vergib dann die Punkte des entsprechenden Rasterpunkts.
- Für ein bloßes Normzitat ohne Subsumtion gibt es keine Punkte.
- Der Gutachtenstil wird eigens bepunktet: Obersatz im Konjunktiv (wer will was von wem woraus), Tatbestandsmerkmale mit Definition, Subsumtion am Sachverhalt, Ergebnissatz je Prüfung; Urteilsstil nur bei Unproblematischem.
- Vergib je Rasterpunkt höchstens dessen Maximalpunkte; halbe Punkte sind erlaubt.
- Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Text davor oder danach) in genau diesem Format:
{"raster":[{"id":"r1","punkte":0,"begruendung":"…"}],"gutachtenstil":[{"id":"g1","punkte":0,"begruendung":"…"}],"fehlendePruefungspunkte":["…"],"fehlendeNormen":["…"],"fachlicheFehler":["…"],"staerken":["…"],"tipps":["…","…","…"],"verbessertePassage":{"original":"…","verbessert":"…"}}`;

const SYSTEM_WISSEN = `Du bist ein strenger, fairer Korrektor einer deutschen Hochschulklausur (Recht & Datenschutz).
Bewerte nur, was in der Antwort tatsächlich steht. Prüfe jeden Kernpunkt einzeln.
Antworte AUSSCHLIESSLICH mit JSON: {"kernpunkte":[{"index":0,"erfuellt":true,"begruendung":"…"}],"feedback":"…"}`;

/** Baut den Request für die Korrektur einer Fallbearbeitung. */
export function baueFallRequest({ apiKey, modell, fall, text }) {
  if (!apiKey) throw new Error('Kein API-Key hinterlegt.');
  const raster = fall.raster.map(r => `- ${r.id} (max. ${r.punkte} P., Abschnitt ${r.abschnitt}): ${r.kriterium}`).join('\n');
  const stil = fall.gutachtenstil.map(g => `- ${g.id} (max. ${g.punkte} P.): ${g.kriterium}`).join('\n');
  const muster = fall.musterloesung.map(a => `${a.titel}\n${a.text}`).join('\n\n');
  const user = [
    `SACHVERHALT:\n${fall.sachverhalt.join('\n')}`,
    `FALLFRAGE(N):\n${fall.fallfragen.join('\n')}`,
    `MUSTERLÖSUNG:\n${muster}`,
    `PUNKTERASTER INHALT (IDs + Maximalpunkte):\n${raster}`,
    `GUTACHTENSTIL-KRITERIEN (IDs + Maximalpunkte):\n${stil}`,
    `ZU BEWERTENDE BEARBEITUNG:\n"""\n${text}\n"""`
  ].join('\n\n');
  return {
    url: API_URL,
    init: {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model: modell || MODELLE[0].id, max_tokens: MAX_TOKENS, system: SYSTEM_FALL, messages: [{ role: 'user', content: user }] })
    }
  };
}

/** Baut den Request für eine Wissensfrage. */
export function baueWissenRequest({ apiKey, modell, frage, text }) {
  if (!apiKey) throw new Error('Kein API-Key hinterlegt.');
  const kp = frage.kernpunkte.map((k, i) => `${i}: ${k}`).join('\n');
  const user = `FRAGE:\n${frage.frage}\n\nMUSTERANTWORT:\n${frage.antwort}\n\nKERNPUNKTE (Index: Inhalt):\n${kp}\n\nANTWORT DES PRÜFLINGS:\n"""\n${text}\n"""`;
  return {
    url: API_URL,
    init: { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ model: modell || MODELLE[0].id, max_tokens: 4000, system: SYSTEM_WISSEN, messages: [{ role: 'user', content: user }] }) }
  };
}

/** Test-Request für „Verbindung testen“. */
export function baueTestRequest({ apiKey, modell }) {
  if (!apiKey) throw new Error('Kein API-Key hinterlegt.');
  return {
    url: API_URL,
    init: { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ model: modell || MODELLE[0].id, max_tokens: 20, messages: [{ role: 'user', content: 'Antworte nur mit: OK' }] }) }
  };
}

/** Wertet die API-Antwort aus: nur Text-Blöcke, Hinweis bei max_tokens. */
export function leseAntwort(json) {
  if (!json || !Array.isArray(json.content)) throw new KIFehler('format', 'Unerwartetes Antwortformat der API.');
  const text = json.content.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text).join('');
  return { text, gekuerzt: json.stop_reason === 'max_tokens' };
}

/** Findet ein JSON-Objekt in Text, Codeblock oder Fließtext. Gibt null zurück, wenn keins parsebar ist. */
export function extrahiereJson(text) {
  if (typeof text !== 'string') return null;
  const kandidaten = [];
  const block = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m;
  while ((m = block.exec(text))) kandidaten.push(m[1]);
  kandidaten.push(text);
  for (const k of kandidaten) {
    const t = k.trim();
    try { const v = JSON.parse(t); if (v && typeof v === 'object') return v; } catch { /* weiter */ }
    // erstes balanciertes {...} suchen
    const start = t.indexOf('{');
    if (start < 0) continue;
    let tiefe = 0, inStr = false, esc = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') tiefe++;
      else if (c === '}') { tiefe--; if (tiefe === 0) { try { return JSON.parse(t.slice(start, i + 1)); } catch { break; } } }
    }
  }
  return null;
}

function zahl(x) { const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : x; return typeof n === 'number' && isFinite(n) ? n : 0; }
function begrenze(x, max) { return Math.max(0, Math.min(zahl(x), max)); }
function strArr(x) { return Array.isArray(x) ? x.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()) : []; }

/**
 * Validiert und normalisiert die KI-Korrektur. Punkte werden auf [0, max] begrenzt,
 * Summen werden SELBST berechnet (der Summe der KI wird nicht vertraut).
 */
export function normalisiereKorrektur(obj, fall) {
  if (!obj || typeof obj !== 'object') throw new KIFehler('parse', 'Die KI-Antwort enthielt kein gültiges JSON.');
  const kiRaster = new Map((Array.isArray(obj.raster) ? obj.raster : []).filter(r => r && typeof r === 'object').map(r => [String(r.id), r]));
  const kiStil = new Map((Array.isArray(obj.gutachtenstil) ? obj.gutachtenstil : []).filter(r => r && typeof r === 'object').map(r => [String(r.id), r]));
  const raster = fall.raster.map(r => {
    const k = kiRaster.get(r.id);
    return { id: r.id, kriterium: r.kriterium, max: r.punkte, punkte: k ? begrenze(k.punkte, r.punkte) : 0, begruendung: k && typeof k.begruendung === 'string' ? k.begruendung : (k ? '' : 'Von der KI nicht bewertet – 0 Punkte.') };
  });
  const stil = fall.gutachtenstil.map(g => {
    const k = kiStil.get(g.id);
    return { id: g.id, kriterium: g.kriterium, max: g.punkte, punkte: k ? begrenze(k.punkte, g.punkte) : 0, begruendung: k && typeof k.begruendung === 'string' ? k.begruendung : (k ? '' : 'Von der KI nicht bewertet – 0 Punkte.') };
  });
  const summeInhalt = rund(raster.reduce((s, r) => s + r.punkte, 0));
  const summeStil = rund(stil.reduce((s, r) => s + r.punkte, 0));
  const vp = obj.verbessertePassage && typeof obj.verbessertePassage === 'object' ? obj.verbessertePassage : {};
  return {
    raster, stil, summeInhalt, summeStil,
    summe: rund(summeInhalt + summeStil),
    max: rund(fall.raster.reduce((s, r) => s + r.punkte, 0) + fall.gutachtenstil.reduce((s, g) => s + g.punkte, 0)),
    fehlendePruefungspunkte: strArr(obj.fehlendePruefungspunkte),
    fehlendeNormen: strArr(obj.fehlendeNormen),
    fachlicheFehler: strArr(obj.fachlicheFehler),
    staerken: strArr(obj.staerken),
    tipps: strArr(obj.tipps).slice(0, 5),
    verbessertePassage: { original: typeof vp.original === 'string' ? vp.original : '', verbessert: typeof vp.verbessert === 'string' ? vp.verbessert : '' }
  };
}

export function normalisiereWissen(obj, frage) {
  if (!obj || typeof obj !== 'object') throw new KIFehler('parse', 'Die KI-Antwort enthielt kein gültiges JSON.');
  const liste = Array.isArray(obj.kernpunkte) ? obj.kernpunkte : [];
  const kp = frage.kernpunkte.map((text, i) => {
    const k = liste.find(x => x && zahl(x.index) === i);
    return { text, erfuellt: !!(k && k.erfuellt === true), begruendung: k && typeof k.begruendung === 'string' ? k.begruendung : '' };
  });
  return { kernpunkte: kp, erfuellt: kp.filter(k => k.erfuellt).length, gesamt: kp.length, feedback: typeof obj.feedback === 'string' ? obj.feedback : '' };
}

function rund(x) { return Math.round(x * 100) / 100; }

export class KIFehler extends Error {
  constructor(art, meldung) { super(meldung); this.art = art; }
}

/** Ordnet HTTP-Status bzw. Netzwerkfehler einer verständlichen Meldung zu (ohne Key!). */
export function fehlerMeldung(statusOderFehler) {
  if (typeof statusOderFehler === 'number') {
    const s = statusOderFehler;
    if (s === 401) return new KIFehler('auth', 'API-Key ungültig (401). Bitte den Key in den Einstellungen prüfen.');
    if (s === 403) return new KIFehler('auth', 'Zugriff verweigert (403). Hat der Key Zugriff auf dieses Modell?');
    if (s === 404) return new KIFehler('modell', 'Modell nicht gefunden (404). Bitte den Modellnamen in den Einstellungen prüfen.');
    if (s === 400) return new KIFehler('anfrage', 'Die Anfrage wurde abgelehnt (400). Evtl. ist der Text zu lang oder der Modellname falsch.');
    if (s === 413) return new KIFehler('anfrage', 'Text zu lang (413).');
    if (s === 429) return new KIFehler('limit', 'Zu viele Anfragen bzw. Limit erreicht (429). Bitte später erneut versuchen.');
    if (s === 529 || s === 503) return new KIFehler('ueberlastet', `Die API ist gerade überlastet (${s}). Bitte später erneut versuchen.`);
    if (s >= 500) return new KIFehler('server', `Serverfehler der API (${s}). Bitte später erneut versuchen.`);
    return new KIFehler('http', `Unerwartete Antwort der API (HTTP ${s}).`);
  }
  const e = statusOderFehler;
  if (e && e.name === 'AbortError') return new KIFehler('timeout', 'Zeitüberschreitung – die KI hat zu lange gebraucht. Bitte erneut versuchen.');
  return new KIFehler('netz', 'Netzwerk- oder CORS-Fehler – keine Verbindung zur API. Internetverbindung prüfen.');
}

/**
 * Sendet einen Request. fetchImpl injizierbar (Tests). Liefert { text, gekuerzt }.
 * Wirft KIFehler mit verständlicher Meldung – der Key erscheint nie in Meldungen.
 */
export async function sende(req, { fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetchImpl(req.url, { ...req.init, signal: ctrl ? ctrl.signal : undefined });
  } catch (e) {
    throw fehlerMeldung(e);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw fehlerMeldung(res.status);
  let json;
  try { json = await res.json(); } catch { throw new KIFehler('format', 'Die API-Antwort war kein JSON.'); }
  return leseAntwort(json);
}

/** Entfernt API-Key-Muster aus beliebigem Text (Sicherheitsnetz für Fehlermeldungen/Logs). */
export function schwaerze(text) {
  return String(text).replace(/sk-ant-[A-Za-z0-9_\-]+/g, 'sk-ant-***');
}
