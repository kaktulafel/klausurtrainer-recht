#!/usr/bin/env node
// Validiert Daten, Verweise und Verbotenes. Exit-Code 1 bei Fehlern. Nur Node-Bordmittel.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, posix, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseNormen, registerId, formatNorm, parseEine } from '../site/js/normparser.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const DATA = join(SITE, 'data');
const fehler = [];
const warnungen = [];
const F = (datei, id, problem) => fehler.push(`${datei} · ${id || '-'} · ${problem}`);
const W = (datei, id, problem) => warnungen.push(`${datei} · ${id || '-'} · ${problem}`);
const rel = (p) => relative(ROOT, p).split(sep).join('/');

function alleDateien(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...alleDateien(p)); else out.push(p);
  }
  return out;
}

/** Existiert die Datei mit exakt dieser Groß-/Kleinschreibung? */
function existiertExakt(abs) {
  const r = relative(ROOT, abs);
  if (r.startsWith('..')) return false;
  let cur = ROOT;
  for (const teil of r.split(sep)) {
    if (!existsSync(cur) || !statSync(cur).isDirectory()) return false;
    if (!readdirSync(cur).includes(teil)) return false;
    cur = join(cur, teil);
  }
  return true;
}

// ---------- 1. JSON laden ----------
const json = {};
for (const p of alleDateien(DATA).filter(p => p.endsWith('.json'))) {
  const r = rel(p).replace('site/data/', '');
  try { json[r] = JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { F(rel(p), null, 'JSON nicht parsebar: ' + e.message); }
  if (statSync(p).size > 160 * 1024) W(rel(p), null, `Datei größer als ~150 KB (${Math.round(statSync(p).size / 1024)} KB) – aufteilen`);
}

const idx = json['index.json'];
if (!idx) F('site/data/index.json', null, 'fehlt');
const KATS = ['faelle', 'mc', 'wissen', 'normkarten'];
const EINZEL = ['themen.json', 'normen.json', 'schemata.json', 'drills.json', 'klausuren.json'];

// index.json ↔ tatsächliche Dateien
if (idx) {
  const gelistet = new Set([...KATS.flatMap(k => idx.dateien?.[k] || []), ...(idx.dateien?.einzel || []), ...(idx.dateien?.wortlaut || [])]);
  for (const k of KATS) if (!Array.isArray(idx.dateien?.[k])) F('index.json', k, 'Kategorie fehlt in dateien');
  for (const g of gelistet) if (!json[g]) F('index.json', g, 'gelistete Datei existiert nicht (oder ist kaputt)');
  for (const vorhanden of Object.keys(json)) {
    if (vorhanden === 'index.json') continue;
    if (!gelistet.has(vorhanden)) F('index.json', vorhanden, 'Datei existiert, ist aber nicht in index.json gelistet');
  }
  for (const e of EINZEL) if (!(idx.dateien?.einzel || []).includes(e)) F('index.json', e, 'Pflichtdatei nicht unter dateien.einzel gelistet');
}

// ---------- 2. Hilfen ----------
const ids = new Map();
function id(datei, obj, praefix = '') {
  if (!obj || typeof obj.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(obj.id)) { F(datei, obj?.id, 'id fehlt oder nicht kebab-case'); return; }
  const key = praefix + obj.id;
  if (ids.has(key)) F(datei, obj.id, 'ID doppelt (auch in ' + ids.get(key) + ')');
  else ids.set(key, datei);
}
const typ = {
  str: (v) => typeof v === 'string' && v.trim().length > 0,
  arr: (v) => Array.isArray(v),
  strArr: (v) => Array.isArray(v) && v.every(x => typeof x === 'string' && x.trim()),
  num: (v) => typeof v === 'number' && isFinite(v),
  bool: (v) => typeof v === 'boolean'
};
function pflicht(datei, obj, felder) {
  for (const [f, t] of Object.entries(felder)) {
    if (!(f in obj)) F(datei, obj.id, `Pflichtfeld „${f}“ fehlt`);
    else if (!typ[t](obj[f])) F(datei, obj.id, `Feld „${f}“ hat falschen Typ (erwartet ${t})`);
  }
}
function quelle(datei, obj) {
  if (!typ.str(obj.quelle) || !/^(material:[a-z0-9-]+|neu|zusatz)$/.test(obj.quelle)) F(datei, obj.id, 'quelle muss material:<id>, neu oder zusatz sein');
  if (!typ.bool(obj.geprueft)) F(datei, obj.id, 'geprueft (true/false) fehlt');
}

const themen = json['themen.json']?.themen || [];
const themenIds = new Set(themen.map(t => t.id));
for (const t of themen) {
  pflicht('themen.json', t, { id: 'str', titel: 'str', bereich: 'str', gewicht: 'str', kernnormen: 'strArr', fundstelle: 'str' });
  if (!['A', 'B', 'C'].includes(t.gewicht)) F('themen.json', t.id, 'gewicht muss A, B oder C sein');
}
function thema(datei, obj, feld = 'thema') {
  const werte = feld === 'themen' ? obj.themen : [obj.thema];
  if (!Array.isArray(werte) || !werte.length) { F(datei, obj.id, `Feld ${feld} fehlt`); return; }
  for (const w of werte) if (!themenIds.has(w)) F(datei, obj.id, `unbekanntes Thema „${w}“`);
}

// ---------- 3. Normenregister ----------
const normen = json['normen.json'] || [];
const register = new Set();
if (!Array.isArray(normen)) F('normen.json', null, 'muss ein Array sein');
else for (const n of normen) {
  id('normen.json', n, 'norm:');
  pflicht('normen.json', n, { zitat: 'str', gesetz: 'str', ueberschrift: 'str', kurz: 'str', lage: 'str', link: 'str' });
  const p = parseEine(n.zitat || '');
  if (!p) F('normen.json', n.id, 'zitat nicht parsebar');
  else if (registerId(p) !== n.id) F('normen.json', n.id, `id passt nicht zum Zitat (erwartet ${registerId(p)})`);
  if (n.link && !/^https:\/\/(www\.gesetze-im-internet\.de|eur-lex\.europa\.eu)\//.test(n.link)) F('normen.json', n.id, 'link muss auf gesetze-im-internet.de oder EUR-Lex zeigen');
  if (n.wortlaut !== undefined && n.wortlaut !== null && !n.geprueftAm) F('normen.json', n.id, 'wortlaut ohne geprueftAm (nur amtliche Quelle!)');
  if (n.wortlaut) {
    const w = json[n.wortlaut];
    if (!w) F('normen.json', n.id, `Wortlaut-Datei ${n.wortlaut} fehlt`);
    else if (typeof w[n.id] !== 'string' || !w[n.id].trim()) F('normen.json', n.id, `Wortlaut fehlt in ${n.wortlaut}`);
  } else W('normen.json', n.id, 'kein amtlicher Wortlaut hinterlegt (nur Link)');
  register.add(n.id);
}

/** Alle Normzitate in allen Strings eines Objekts prüfen. */
function normenImText(datei, objId, wert, pfad = '') {
  if (typeof wert === 'string') {
    for (const n of parseNormen(wert)) {
      if (!register.has(registerId(n))) F(datei, objId, `zitierte Norm nicht im Register: ${formatNorm(n)} (in ${pfad || 'Text'}: „${n.raw}“)`);
    }
  } else if (Array.isArray(wert)) wert.forEach((w, i) => normenImText(datei, objId, w, `${pfad}[${i}]`));
  else if (wert && typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) {
      if (['link', 'wortlaut', 'id', 'quelle'].includes(k)) continue;
      normenImText(datei, objId, v, pfad ? `${pfad}.${k}` : k);
    }
  }
}
function normListe(datei, obj, feld) {
  if (!typ.strArr(obj[feld])) { F(datei, obj.id, `${feld} muss eine Liste von Normzitaten sein`); return; }
  for (const z of obj[feld]) {
    const p = parseEine(z);
    if (!p) F(datei, obj.id, `${feld}: „${z}“ ist kein erkennbares Normzitat`);
    else if (!register.has(registerId(p))) F(datei, obj.id, `${feld}: „${z}“ nicht im Normenregister`);
  }
}

// ---------- 4. Inhalte ----------
const zaehler = {}; // thema → {faelle, mc, wissen, normkarten, drills}
const zaehle = (th, art) => { zaehler[th] ??= {}; zaehler[th][art] = (zaehler[th][art] || 0) + 1; };
const ungeprueft = [];
const alleMC = new Map(), alleWissen = new Map(), alleFaelle = new Map();

for (const [datei, inhalt] of Object.entries(json)) {
  if (datei.startsWith('faelle/')) {
    const f = inhalt;
    id(datei, f);
    if (datei !== `faelle/${f.id}.json`) F(datei, f.id, 'Dateiname muss der ID entsprechen');
    pflicht(datei, f, { titel: 'str', themen: 'strArr', schwierigkeit: 'num', minuten: 'num', punkte: 'num', sachverhalt: 'strArr', fallfragen: 'strArr', skizze: 'arr', musterloesung: 'arr', raster: 'arr', gutachtenstil: 'arr', erwarteteNormen: 'strArr', schluesselbegriffe: 'strArr', typischeFehler: 'strArr', abwandlungen: 'arr' });
    quelle(datei, f); thema(datei, f, 'themen');
    const abschnitte = new Set();
    for (const a of f.musterloesung || []) { pflicht(datei, { id: f.id + '/' + a.id, ...a }, { titel: 'str', text: 'str' }); abschnitte.add(a.id); }
    const rasterIds = new Set();
    let summe = 0;
    for (const r of f.raster || []) {
      if (!typ.str(r.id) || !typ.str(r.kriterium) || !typ.num(r.punkte) || r.punkte <= 0) F(datei, f.id, `Rasterpunkt ${r.id} unvollständig`);
      if (rasterIds.has(r.id)) F(datei, f.id, `Raster-ID doppelt: ${r.id}`); rasterIds.add(r.id);
      if (!abschnitte.has(r.abschnitt)) F(datei, f.id, `Rasterpunkt ${r.id} verweist auf unbekannten Abschnitt ${r.abschnitt}`);
      summe += r.punkte || 0;
    }
    for (const g of f.gutachtenstil || []) {
      if (!typ.str(g.id) || !typ.str(g.kriterium) || !typ.num(g.punkte)) F(datei, f.id, `Gutachtenstil-Kriterium ${g.id} unvollständig`);
      if (rasterIds.has(g.id)) F(datei, f.id, `ID doppelt (Raster/Stil): ${g.id}`); rasterIds.add(g.id);
      summe += g.punkte || 0;
    }
    if (Math.abs(summe - f.punkte) > 1e-6) F(datei, f.id, `Raster + Gutachtenstil = ${summe} ≠ punkte ${f.punkte}`);
    for (const a of abschnitte) if (!(f.raster || []).some(r => r.abschnitt === a)) F(datei, f.id, `Abschnitt ${a} der Musterlösung hat keinen Rasterpunkt`);
    for (const s of f.skizze || []) if (!typ.num(s.ebene) || !typ.str(s.text)) F(datei, f.id, 'Skizzenzeile braucht ebene + text');
    for (const a of f.abwandlungen || []) if (!typ.str(a.frage) || !typ.str(a.kurzloesung)) F(datei, f.id, 'Abwandlung braucht frage + kurzloesung');
    if (f.minuten >= 60 && !(f.abwandlungen || []).length) F(datei, f.id, 'klausurgroßer Fall braucht mindestens eine Abwandlung');
    if (f.gefuehrt) {
      const g = f.gefuehrt;
      if (!typ.arr(g.anspruchsgrundlagen) || !g.anspruchsgrundlagen.some(x => x.richtig)) F(datei, f.id, 'gefuehrt.anspruchsgrundlagen braucht mind. eine richtige');
      if (!typ.strArr(g.reihenfolge) || g.reihenfolge.length < 3) F(datei, f.id, 'gefuehrt.reihenfolge braucht mind. 3 Punkte');
      if (!typ.arr(g.punkte)) F(datei, f.id, 'gefuehrt.punkte fehlt');
    } else F(datei, f.id, 'gefuehrt (geführter Modus) fehlt');
    normListe(datei, f, 'erwarteteNormen');
    normenImText(datei, f.id, f);
    for (const t of f.themen || []) zaehle(t, 'faelle');
    if (!f.geprueft) ungeprueft.push(f.id);
    alleFaelle.set(f.id, f);
  } else if (datei.startsWith('mc/')) {
    if (!Array.isArray(inhalt)) { F(datei, null, 'muss ein Array sein'); continue; }
    for (const q of inhalt) {
      id(datei, q);
      pflicht(datei, q, { thema: 'str', typ: 'str', frage: 'str', normen: 'strArr', schwierigkeit: 'num' });
      quelle(datei, q); thema(datei, q);
      if (!['single', 'multi', 'aussagen', 'zuordnung'].includes(q.typ)) F(datei, q.id, 'unbekannter typ');
      if (![1, 2, 3].includes(q.schwierigkeit)) F(datei, q.id, 'schwierigkeit muss 1, 2 oder 3 sein');
      if (q.typ === 'zuordnung') {
        if (!typ.arr(q.paare) || q.paare.length < 2) F(datei, q.id, 'zuordnung braucht paare');
        if (!typ.arr(q.ziele) || q.ziele.length < 2) F(datei, q.id, 'zuordnung braucht ziele');
        const zielIds = new Set((q.ziele || []).map(z => z.id));
        for (const p of q.paare || []) {
          if (!typ.str(p.text) || !zielIds.has(p.loesung)) F(datei, q.id, `Paar ${p.id}: text fehlt oder loesung unbekannt`);
          if (!typ.str(p.erklaerung)) F(datei, q.id, `Paar ${p.id}: Erklärung fehlt`);
        }
      } else {
        const o = q.optionen || [];
        if (o.length < 2) F(datei, q.id, 'zu wenige Optionen');
        const richtige = o.filter(x => x.korrekt === true).length;
        if (q.typ === 'single' && richtige !== 1) F(datei, q.id, `single braucht genau 1 richtige Option (hat ${richtige})`);
        if ((q.typ === 'multi' || q.typ === 'aussagen') && (richtige < 1 || richtige === o.length) && q.typ === 'multi') F(datei, q.id, 'multi braucht ≥ 1 richtige und ≥ 1 falsche Option');
        if (q.typ === 'aussagen' && o.length < 3) F(datei, q.id, 'Aussagenblock braucht ≥ 3 Aussagen');
        const texte = new Set(), oids = new Set();
        for (const x of o) {
          if (!typ.str(x.id) || oids.has(x.id)) F(datei, q.id, `Option-ID fehlt/doppelt: ${x.id}`); oids.add(x.id);
          if (!typ.str(x.text)) F(datei, q.id, `Option ${x.id} ohne Text`);
          if (!typ.bool(x.korrekt)) F(datei, q.id, `Option ${x.id}: korrekt fehlt`);
          if (!typ.str(x.erklaerung)) F(datei, q.id, `Option ${x.id} ohne Erklärung`);
          const t = (x.text || '').trim().toLowerCase();
          if (texte.has(t)) F(datei, q.id, `Optionstext doppelt: „${x.text}“`); texte.add(t);
          if (/^(alle|keine) (der )?(genannten|oben)/i.test(x.text || '')) F(datei, q.id, `„alle/keine der genannten“ vermeiden (${x.id})`);
        }
      }
      normListe(datei, q, 'normen');
      normenImText(datei, q.id, q);
      zaehle(q.thema, 'mc');
      if (!q.geprueft) ungeprueft.push(q.id);
      alleMC.set(q.id, q);
    }
  } else if (datei.startsWith('wissen/')) {
    if (!Array.isArray(inhalt)) { F(datei, null, 'muss ein Array sein'); continue; }
    for (const w of inhalt) {
      id(datei, w);
      pflicht(datei, w, { thema: 'str', frage: 'str', antwort: 'str', kernpunkte: 'strArr', normen: 'strArr', schwierigkeit: 'num' });
      quelle(datei, w); thema(datei, w);
      if (w.stichwoerter && (!Array.isArray(w.stichwoerter) || w.stichwoerter.length !== w.kernpunkte.length)) F(datei, w.id, 'stichwoerter muss je Kernpunkt eine Liste haben');
      normListe(datei, w, 'normen');
      normenImText(datei, w.id, w);
      zaehle(w.thema, 'wissen');
      if (!w.geprueft) ungeprueft.push(w.id);
      alleWissen.set(w.id, w);
    }
  } else if (datei.startsWith('normkarten/')) {
    if (!Array.isArray(inhalt)) { F(datei, null, 'muss ein Array sein'); continue; }
    for (const k of inhalt) {
      id(datei, k);
      pflicht(datei, k, { thema: 'str', problem: 'str', norm: 'str', erklaerung: 'str' });
      quelle(datei, k); thema(datei, k);
      const p = parseEine(k.norm || '');
      if (!p || !register.has(registerId(p))) F(datei, k.id, `norm „${k.norm}“ nicht im Register`);
      normenImText(datei, k.id, k);
      zaehle(k.thema, 'normkarten');
      if (!k.geprueft) ungeprueft.push(k.id);
    }
  }
}

// Schemata
const schemata = json['schemata.json'];
if (schemata) {
  if (!Array.isArray(schemata)) F('schemata.json', null, 'muss ein Array sein');
  else for (const s of schemata) {
    id('schemata.json', s, 'schema:');
    pflicht('schemata.json', s, { titel: 'str', thema: 'str', normen: 'strArr', knoten: 'arr' });
    quelle('schemata.json', s); thema('schemata.json', s);
    if ((s.knoten || []).length < 3) F('schemata.json', s.id, 'Schema braucht ≥ 3 Hauptpunkte (Puzzle)');
    const pruefe = (kn, tiefe) => { for (const k of kn) { if (!typ.str(k.text)) F('schemata.json', s.id, 'Knoten ohne text'); if (k.kinder) pruefe(k.kinder, tiefe + 1); } };
    pruefe(s.knoten || [], 0);
    normListe('schemata.json', s, 'normen');
    normenImText('schemata.json', s.id, s);
    if (!s.geprueft) ungeprueft.push(s.id);
  }
}

// Drills
const drills = json['drills.json'];
if (drills) {
  if (!Array.isArray(drills)) F('drills.json', null, 'muss ein Array sein');
  else for (const d of drills) {
    id('drills.json', d, 'drill:');
    pflicht('drills.json', d, { titel: 'str', thema: 'str', typ: 'str', aufgabe: 'str', antwort: 'str', kernpunkte: 'strArr', normen: 'strArr', korrekturhinweis: 'num' });
    quelle('drills.json', d); thema('drills.json', d);
    if (![1, 2, 3, 4].includes(d.korrekturhinweis)) F('drills.json', d.id, 'korrekturhinweis muss 1–4 sein');
    if (d.typ === 'lueckentext') {
      const l = (d.aufgabe.match(/\{\{[^}]+\}\}/g) || []).length;
      if (!l) F('drills.json', d.id, 'Lückentext ohne {{Lücken}}');
    }
    normListe('drills.json', d, 'normen');
    normenImText('drills.json', d.id, d);
    zaehle(d.thema, 'drills'); zaehle('gutachtenstil', 'drills-gesamt');
    if (!d.geprueft) ungeprueft.push(d.id);
  }
  for (const k of [1, 2, 3, 4]) {
    const n = (drills || []).filter(d => d.korrekturhinweis === k).length;
    if (n < 5 && idx?.abdeckungPflicht !== false) F('drills.json', null, `Korrekturhinweis ${k}: nur ${n} Drills (mind. 5)`);
  }
}

// Klausuren
const klausuren = json['klausuren.json'];
if (klausuren) {
  if (!Array.isArray(klausuren)) F('klausuren.json', null, 'muss ein Array sein');
  else for (const k of klausuren) {
    id('klausuren.json', k, 'klausur:');
    pflicht('klausuren.json', k, { titel: 'str', minuten: 'num' });
    const A = k.teile?.A, B = k.teile?.B, C = k.teile?.C;
    if (!A || !alleFaelle.has(A.fall)) F('klausuren.json', k.id, `Teil A: Fall ${A?.fall} unbekannt`);
    else if (!alleFaelle.get(A.fall).geprueft) F('klausuren.json', k.id, `Teil A: Fall ${A.fall} ist ungeprüft`);
    for (const w of B?.wissen || []) { if (!alleWissen.has(w)) F('klausuren.json', k.id, `Teil B: Wissensfrage ${w} unbekannt`); else if (!alleWissen.get(w).geprueft) F('klausuren.json', k.id, `Teil B: ${w} ungeprüft`); }
    for (const m of C?.mc || []) { if (!alleMC.has(m)) F('klausuren.json', k.id, `Teil C: MC ${m} unbekannt`); else if (!alleMC.get(m).geprueft) F('klausuren.json', k.id, `Teil C: ${m} ungeprüft`); }
  }
}

// ---------- 5. Abdeckung ----------
const report = [];
let unterdeckt = 0;
for (const t of themen) {
  const ist = zaehler[t.id] || {};
  const teile = [];
  for (const [art, soll] of Object.entries(t.ziele || {})) {
    const n = ist[art] || 0;
    const ok = n >= soll;
    teile.push(`${art} ${n}/${soll}${ok ? '' : ' ✗'}`);
    if (!ok && t.gewicht === 'A' && idx?.abdeckungPflicht !== false) { unterdeckt++; F('themen.json', t.id, `A-Thema unterdeckt: ${art} ${n}/${soll}`); }
  }
  report.push(`  [${t.gewicht}] ${t.id.padEnd(34)} ${teile.join(' · ')}`);
}
const summen = { faelle: alleFaelle.size, mc: alleMC.size, wissen: alleWissen.size, normkarten: Object.entries(json).filter(([d]) => d.startsWith('normkarten/')).reduce((s, [, v]) => s + (Array.isArray(v) ? v.length : 0), 0), schemata: Array.isArray(schemata) ? schemata.length : 0, drills: Array.isArray(drills) ? drills.length : 0, klausuren: Array.isArray(klausuren) ? klausuren.length : 0, normen: register.size };

// ---------- 6. Verweise in HTML/CSS/JS/Manifest ----------
const siteDateien = alleDateien(SITE);
for (const p of siteDateien) {
  const r = rel(p);
  const inhalt = /\.(html|css|js|mjs|webmanifest|json)$/.test(p) ? readFileSync(p, 'utf8') : '';
  if (!inhalt || r.startsWith('site/data/')) continue;
  const verweise = [];
  if (p.endsWith('.html')) for (const m of inhalt.matchAll(/\b(?:src|href)="([^"#]+)"/g)) verweise.push(m[1]);
  if (p.endsWith('.css')) for (const m of inhalt.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) verweise.push(m[1]);
  if (p.endsWith('.js')) {
    for (const m of inhalt.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g)) verweise.push(m[1]);
    for (const m of inhalt.matchAll(/import\(\s*['"]([^'"$`]+)['"]\s*\)/g)) verweise.push(m[1]);
    if (/\bfetch\(\s*['"`]\//.test(inhalt)) F(r, null, 'absoluter Pfad in fetch()');
  }
  if (p.endsWith('.webmanifest')) {
    try { const m = JSON.parse(inhalt); for (const i of m.icons || []) verweise.push(i.src); if (/^\//.test(m.start_url) || /^\//.test(m.scope)) F(r, null, 'absoluter Pfad in start_url/scope'); }
    catch { F(r, null, 'Manifest kein gültiges JSON'); }
  }
  for (const v of verweise) {
    if (/^(https?:|data:|mailto:|#|\.\/$)/.test(v) || v === './') continue;
    if (v.startsWith('/')) { F(r, null, `absoluter Pfad: ${v}`); continue; }
    const ziel = join(dirname(p), v.split('?')[0]);
    if (!existiertExakt(ziel)) F(r, null, `verweist auf fehlende Datei (exakte Schreibweise): ${v}`);
  }
}
// Service-Worker-Shell und dynamische Views
const sw = readFileSync(join(SITE, 'sw.js'), 'utf8');
const shell = [...(sw.match(/const SHELL = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map(m => m[1]);
for (const s of shell) if (s !== './' && !existiertExakt(join(SITE, s))) F('site/sw.js', null, `SHELL-Datei fehlt: ${s}`);
for (const p of siteDateien.filter(p => /\.(js|css)$/.test(p) && !p.endsWith('sw.js'))) {
  const r = rel(p).replace('site/', '');
  if (!shell.includes(r)) F('site/sw.js', null, `Datei nicht in SHELL (offline fehlt sie): ${r}`);
}
const appJs = readFileSync(join(SITE, 'js/app.js'), 'utf8');
const viewsBlock = appJs.match(/const VIEWS = \{([\s\S]*?)\};/)?.[1] || '';
for (const m of viewsBlock.matchAll(/:\s*'([a-z0-9-]+)'/g)) if (!existiertExakt(join(SITE, 'js/views', m[1] + '.js'))) F('site/js/app.js', null, `View-Modul fehlt: views/${m[1]}.js`);
// Dateinamen: klein, ohne Leerzeichen/Umlaute
for (const p of siteDateien) { const r = rel(p); if (/[A-ZÄÖÜäöüß\s]/.test(r.replace(/^site\//, ''))) F(r, null, 'Dateiname nicht klein/ohne Leerzeichen/Umlaute'); }
// noindex + CSP auf allen HTML-Seiten
for (const p of siteDateien.filter(p => p.endsWith('.html'))) {
  const t = readFileSync(p, 'utf8');
  if (!/<meta name="robots" content="noindex, nofollow">/.test(t)) F(rel(p), null, 'robots noindex fehlt');
  if (!/Content-Security-Policy/.test(t)) F(rel(p), null, 'CSP fehlt');
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(t)) F(rel(p), null, 'Inline-JavaScript gefunden');
  if (/\sstyle="/.test(t)) F(rel(p), null, 'Inline-Style-Attribut (durch CSP blockiert)');
  if (/\son[a-z]+="/.test(t)) F(rel(p), null, 'Inline-Eventhandler gefunden');
}
if (!existsSync(join(SITE, 'robots.txt')) || !/Disallow: \//.test(readFileSync(join(SITE, 'robots.txt'), 'utf8'))) F('site/robots.txt', null, 'fehlt oder ohne Disallow: /');
for (const p of siteDateien.filter(p => p.endsWith('.js'))) {
  const t = readFileSync(p, 'utf8');
  if (/\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=|document\.write/.test(t)) F(rel(p), null, 'unsichere HTML-Zuweisung (innerHTML o. Ä.)');
}

// ---------- 7. Verbotenes ----------
for (const p of siteDateien) {
  const r = rel(p);
  if (/\.(pdf|docx?|pptx?|xlsx?|zip|heic|jpe?g)$/i.test(p)) F(r, null, 'Material-/Scan-Datei in site/');
  if (/\.png$/i.test(p) && !r.startsWith('site/icons/')) F(r, null, 'Bilddatei außerhalb von site/icons/');
}
for (const p of ['site/index.html', 'site/sw.js', 'site/version.json']) {
  if (!readFileSync(join(ROOT, p), 'utf8').includes('__APP_VERSION__')) F(p, null, 'Versions-Platzhalter __APP_VERSION__ fehlt (Stamp-Mechanismus kaputt)');
}
let getrackt = [];
try { getrackt = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { W('git', null, 'git ls-files nicht ausführbar – Prüfung übersprungen'); }
for (const g of getrackt) {
  if (/\.(pdf|docx?|pptx?|xlsx?|zip|heic)$/i.test(g)) F(g, null, 'Materialdatei ist von Git getrackt!');
  if (/\.(png|jpe?g)$/i.test(g) && !g.startsWith('site/icons/')) F(g, null, 'Bild/Scan außerhalb von site/icons ist getrackt');
  if (/(^|\/)\.env/.test(g)) F(g, null, '.env-Datei ist getrackt');
}
const pruefDateien = (getrackt.length ? getrackt : alleDateien(ROOT).map(rel).filter(r => !r.startsWith('node_modules') && !r.startsWith('.git/')))
  .filter(g => /\.(js|mjs|json|html|css|md|yml|yaml|txt|webmanifest)$/.test(g) && existsSync(join(ROOT, g)));
// Namen von Dozierenden/Verfasser:innen der Materialien – nur als SHA-256 (klein geschrieben) hinterlegt,
// damit die Namen selbst nicht im öffentlichen Repo stehen. Geprüft wird jedes Wort jeder Datei.
const NAMEN_HASHES = new Set([
  'b733e83c5c6bfe3a4832df2c817a54c2adf63052d6234e8e035a5be92deed4f9',
  'f111a6c418814900429d7579acecba5470a804ce767895c00387b054694b8ccc',
  'ea842197c40acdef494df6cbe12565af24f03487db1acca0e9996587a23502cb'
]);
const enthaeltNamen = (t) => {
  for (const w of new Set(t.toLowerCase().match(/[a-zäöüß]{4,}/g) || [])) {
    if (NAMEN_HASHES.has(createHash('sha256').update(w).digest('hex'))) return true;
  }
  return false;
};
for (const g of pruefDateien) {
  const t = readFileSync(join(ROOT, g), 'utf8');
  if (/sk-ant-(api|admin)\d{2}-[A-Za-z0-9_\-]{20,}/.test(t)) F(g, null, 'API-Key-Muster (sk-ant-…) gefunden!');
  if (enthaeltNamen(t)) F(g, null, 'Name von Dozierenden/Verfasser:in gefunden – entfernen');
}

// ---------- Ausgabe ----------
console.log('Abdeckung je Thema (Ist/Ziel):');
console.log(report.join('\n'));
console.log(`\nInhalte: ${Object.entries(summen).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
if (ungeprueft.length) console.log(`Ungeprüft (Badge „ungeprüft“): ${ungeprueft.length} – ${ungeprueft.slice(0, 15).join(', ')}${ungeprueft.length > 15 ? ' …' : ''}`);
if (warnungen.length) { console.log(`\nWarnungen (${warnungen.length}):`); for (const w of warnungen) console.log('  ⚠ ' + w); }
if (fehler.length) {
  console.error(`\n✗ ${fehler.length} Fehler (Datei · ID · Problem):`);
  for (const f of fehler) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\n✓ Validierung erfolgreich.');
