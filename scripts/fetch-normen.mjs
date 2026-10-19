#!/usr/bin/env node
// Übernimmt amtliche Überschrift, Wortlaut und Fundort (Gliederung) der Register-Normen aus amtlichen Quellen:
//   BGB, BDSG, TDDDG, HGB, StVG, GG, GmbHG, AktG → gesetze-im-internet.de (XML)
//   DSGVO, KI-VO                                 → EUR-Lex (HTML)
// Nutzung: npm run normen   (braucht Internet; schreibt site/data/normen.json, behält „kurz“ und Reihenfolge)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { parseEine, registerId } from '../site/js/normparser.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATEI = join(ROOT, 'site/data/normen.json');
const HEUTE = new Date().toISOString().slice(0, 10);

const GII = { BGB: 'bgb', BDSG: 'bdsg_2018', TDDDG: 'ttdsg', HGB: 'hgb', StVG: 'stvg', GG: 'gg', GmbHG: 'gmbhg', AktG: 'aktg', EFZG: 'entgfg', VVG: 'vvg_2008', SchwarzArbG: 'schwarzarbg_2004' };
const EURLEX = {
  DSGVO: { celex: '32016R0679', name: 'Verordnung (EU) 2016/679 (DSGVO)' },
  'KI-VO': { celex: '02024R1689-20260727', name: 'Verordnung (EU) 2024/1689 (KI-VO), konsolidiert 27.07.2026' }
};

// ---------- ZIP (nur „deflate“/„stored“, ausreichend für gesetze-im-internet.de) ----------
function entpacke(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Kein ZIP');
  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const dateien = {};
  for (let n = 0; n < anzahl; n++) {
    const methode = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), klen = buf.readUInt16LE(p + 32);
    const lokal = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(lokal + 26), lelen = buf.readUInt16LE(lokal + 28);
    const daten = buf.subarray(lokal + 30 + lnlen + lelen, lokal + 30 + lnlen + lelen + csize);
    dateien[name] = methode === 0 ? daten : inflateRawSync(daten);
    p += 46 + nlen + elen + klen;
  }
  return dateien;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function entities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });
}
function textAusXml(xml) {
  return entities(xml
    .replace(/<FnR[^>]*\/>/g, '')
    .replace(/<DT>(.*?)<\/DT>/g, '\n$1 ')
    .replace(/<\/P>/g, '\n').replace(/<BR\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

// ---------- gesetze-im-internet.de ----------
async function ladeGii(gesetz) {
  const res = await fetch(`https://www.gesetze-im-internet.de/${GII[gesetz]}/xml.zip`);
  if (!res.ok) throw new Error(`${gesetz}: HTTP ${res.status}`);
  const zip = entpacke(Buffer.from(await res.arrayBuffer()));
  const xml = Object.entries(zip).find(([n]) => n.endsWith('.xml'))[1].toString('utf8');
  const normen = new Map();
  const gliederung = []; // Ebenen nach Kennzahl-Länge
  for (const m of xml.matchAll(/<norm\b[\s\S]*?<\/norm>/g)) {
    const n = m[0];
    const kz = /<gliederungskennzahl>(\d+)<\/gliederungskennzahl>/.exec(n);
    if (kz) {
      const ebene = kz[1].length / 3 - 1;
      const bez = entities((/<gliederungsbez>([\s\S]*?)<\/gliederungsbez>/.exec(n) || [])[1] || '').trim();
      const tit = entities(((/<gliederungstitel>([\s\S]*?)<\/gliederungstitel>/.exec(n) || [])[1] || '').replace(/<[^>]+>/g, '')).trim();
      gliederung.length = ebene;
      gliederung[ebene] = [bez, tit].filter(Boolean).join(' – ');
      continue;
    }
    const enbez = /<enbez>([\s\S]*?)<\/enbez>/.exec(n);
    if (!enbez) continue;
    const bez = entities(enbez[1]).trim().replace(/ /g, ' ');
    const titel = entities(((/<titel[^>]*>([\s\S]*?)<\/titel>/.exec(n) || [])[1] || '').replace(/<[^>]+>/g, '')).trim();
    const content = /<Content>([\s\S]*?)<\/Content>/.exec(n);
    normen.set(bez, { titel, wortlaut: content ? textAusXml(content[1]) : '', lage: gliederung.filter(Boolean).join(' › ') });
  }
  return normen;
}

// ---------- EUR-Lex ----------
function textAusHtml(html) {
  return entities(html
    .replace(/<td[^>]*>\s*<p class="oj-normal">([a-z]{1,2}\)|\(?[ivx]+\)|\(\d+\))<\/p>\s*<\/td>/g, '\n$1 ')
    .replace(/<\/p>/g, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n')
    .replace(/(^|\n)([a-z]{1,2}\)|[ivx]{1,4}\)|\(\d+\)|\d+\.)\n/g, '$1$2 ').trim();
}
async function ladeEurLex(gesetz) {
  const { celex } = EURLEX[gesetz];
  const res = await fetch(`https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:${celex}`);
  if (!res.ok) throw new Error(`${gesetz}: HTTP ${res.status}`);
  const html = await res.text();
  const normen = new Map();
  // Kapitel/Abschnitte in Reihenfolge erfassen
  const marken = [];
  for (const m of html.matchAll(/<div[^>]*id="(cpt_[A-Z]+(?:\.sct_\d+)?|art_\d+)"[^>]*>/g)) marken.push({ id: m[1], pos: m.index });
  let kapitel = '', abschnitt = '';
  for (let i = 0; i < marken.length; i++) {
    const { id, pos } = marken[i];
    const ende = i + 1 < marken.length ? marken[i + 1].pos : html.length;
    let stueck = html.slice(pos, ende);
    const schluss = ['Geschehen zu', 'class="oj-note"', 'id="anx_', 'class="oj-signatory"'].map(x => stueck.indexOf(x)).filter(x => x > 0);
    if (schluss.length) stueck = stueck.slice(0, Math.min(...schluss));
    if (id.startsWith('cpt_')) {
      const titel = [...stueck.matchAll(/<p[^>]*class="oj-ti-section-[12]"[^>]*>([\s\S]*?)<\/p>/g)].map(x => entities(x[1].replace(/<[^>]+>/g, '')).trim().replace(/\s+/g, ' '));
      if (id.includes('.sct_')) abschnitt = titel.join(' – ');
      else { kapitel = titel.join(' – ').replace(/^KAPITEL/, 'Kapitel'); abschnitt = ''; }
      continue;
    }
    const nr = id.slice(4);
    const ueber = entities(((/<p[^>]*class="oj-sti-art"[^>]*>([\s\S]*?)<\/p>/.exec(stueck) || [])[1] || '').replace(/<[^>]+>/g, '')).trim();
    const koerper = stueck.replace(/<p[^>]*class="oj-ti-art"[^>]*>[\s\S]*?<\/p>/, '').replace(/<p[^>]*class="oj-sti-art"[^>]*>[\s\S]*?<\/p>/, '');
    // Konsolidierte Fassungen: Änderungsmarker (▼M1, ▼B, ▲) entfernen, Überschrift steht im Text
    let zeilen = textAusHtml(koerper).split('\n').filter(z => !/^[▼▲►◄][A-Z]?\d*$/.test(z.trim()) && z.trim());
    let titel = ueber;
    if (zeilen[0] && new RegExp('^Artikel\\s*' + nr + '$').test(zeilen[0].trim())) { zeilen.shift(); if (!titel) titel = (zeilen.shift() || '').trim(); }
    normen.set(nr, { titel, wortlaut: zeilen.join('\n'), lage: [kapitel, abschnitt].filter(Boolean).join(' › ') });
  }
  return normen;
}

function link(n) {
  const p = parseEine(n.zitat);
  if (GII[p.gesetz]) return p.zeichen === 'Art.' ? `https://www.gesetze-im-internet.de/${GII[p.gesetz]}/art_${p.nr}.html` : `https://www.gesetze-im-internet.de/${GII[p.gesetz]}/__${p.nr}.html`;
  if (EURLEX[p.gesetz]) return `https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:${EURLEX[p.gesetz].celex}#art_${p.nr}`;
  return n.link;
}

const register = JSON.parse(readFileSync(DATEI, 'utf8'));
const gesetze = [...new Set(register.map(n => parseEine(n.zitat).gesetz))];
const quellen = {};
for (const g of gesetze) {
  try {
    quellen[g] = GII[g] ? await ladeGii(g) : EURLEX[g] ? await ladeEurLex(g) : null;
    console.log(`${g}: ${quellen[g] ? quellen[g].size + ' Normen geladen' : 'keine amtliche Quelle konfiguriert'}`);
  } catch (e) { console.error(`${g}: ${e.message}`); }
}
let ok = 0;
const fehlt = [];
for (const n of register) {
  const p = parseEine(n.zitat);
  n.id = registerId(p);
  n.gesetz = p.gesetz;
  n.link = link(n);
  const q = quellen[p.gesetz];
  const key = GII[p.gesetz] ? (p.zeichen === 'Art.' ? `Art ${p.nr}` : `§ ${p.nr}`) : p.nr;
  const e = q && (q.get(key) || q.get(key.replace('Art ', 'Art. ')));
  if (!e) { fehlt.push(n.zitat); continue; }
  n.ueberschrift = e.titel || '(keine amtliche Überschrift)';
  n.wortlaut = e.wortlaut || null;
  if (e.lage) n.lage = (GII[p.gesetz] ? p.gesetz + ' › ' : EURLEX[p.gesetz].name + ' › ') + e.lage;
  n.quelleWortlaut = GII[p.gesetz] ? 'gesetze-im-internet.de' : 'EUR-Lex';
  n.geprueftAm = HEUTE;
  ok++;
}
// Wortlaut in Teildateien ≤ ~140 KB auslagern (werden erst im Popover/Register geladen)
const teile = [];
let aktuell = null;
for (const n of register) {
  if (!n.wortlaut) continue;
  const g = n.gesetz.toLowerCase().replace(/[^a-z0-9]/g, '');
  const groesse = Buffer.byteLength(JSON.stringify(n.wortlaut));
  if (!aktuell || aktuell.g !== g && aktuell.groesse > 60000 || aktuell.groesse + groesse > 140000) {
    aktuell = { g, groesse: 0, daten: {}, name: null };
    teile.push(aktuell);
  }
  aktuell.daten[n.id] = n.wortlaut;
  aktuell.groesse += groesse;
  n.wortlautDatei = aktuell;
}
teile.forEach((t, i) => { t.name = `wortlaut/wortlaut-${i + 1}.json`; });
mkdirSync(join(ROOT, 'site/data/wortlaut'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'site/data/wortlaut'))) unlinkSync(join(ROOT, 'site/data/wortlaut', f));
for (const t of teile) writeFileSync(join(ROOT, 'site/data', t.name), JSON.stringify(t.daten) + '\n');
// Feldreihenfolge vereinheitlichen
const sortiert = register.map(n => ({ id: n.id, zitat: n.zitat, gesetz: n.gesetz, ueberschrift: n.ueberschrift || '', kurz: n.kurz, lage: n.lage || n.gesetz, link: n.link, wortlaut: n.wortlautDatei ? n.wortlautDatei.name : null, quelleWortlaut: n.quelleWortlaut, geprueftAm: n.geprueftAm }));
writeFileSync(DATEI, JSON.stringify(sortiert, null, 1) + '\n');
// index.json aktualisieren
const IDX = join(ROOT, 'site/data/index.json');
const idx = JSON.parse(readFileSync(IDX, 'utf8'));
idx.dateien.wortlaut = teile.map(t => t.name);
writeFileSync(IDX, JSON.stringify(idx, null, 2) + '\n');
console.log(`Wortlaut in ${teile.length} Dateien: ${teile.map(t => `${t.name} (${Math.round(t.groesse / 1024)} KB)`).join(', ')}`);
console.log(`\n${ok}/${register.length} Normen mit amtlichem Wortlaut aktualisiert.`);
if (fehlt.length) { console.error('Nicht gefunden: ' + fehlt.join(', ')); process.exit(1); }
