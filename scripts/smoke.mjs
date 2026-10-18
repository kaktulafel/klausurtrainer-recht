#!/usr/bin/env node
// Smoke-Test ohne Browser: startet den lokalen Server unter einem Pages-ähnlichen Unterpfad
// und prüft, dass Startseite, alle Shell-Dateien, alle (rekursiv) importierten Module,
// alle View-Module und alle Datendateien mit HTTP 200 ausgeliefert werden und gültiges JSON liefern.
import { starteServer } from './serve.mjs';

const BASIS = '/klausurtrainer-recht/';
const server = await starteServer(0, BASIS);
const port = server.address().port;
const url = (p) => `http://localhost:${port}${BASIS}${p}`;
const fehler = [];
const geprueft = new Set();

async function hole(p) {
  const res = await fetch(url(p));
  geprueft.add(p);
  if (res.status !== 200) fehler.push(`${p}: HTTP ${res.status}`);
  return res;
}

function aufloesen(basisDatei, spec) {
  const teile = basisDatei.split('/'); teile.pop();
  for (const s of spec.split('/')) { if (s === '.' || s === '') continue; if (s === '..') teile.pop(); else teile.push(s); }
  return teile.join('/');
}

async function modulBaum(p) {
  if (geprueft.has(p)) return;
  const res = await hole(p);
  if (res.status !== 200) return;
  const t = await res.text();
  const specs = [...t.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g), ...t.matchAll(/import\(\s*['"]([^'"$`]+)['"]\s*\)/g)].map(m => m[1]);
  for (const s of specs) if (s.startsWith('.')) await modulBaum(aufloesen(p, s));
}

try {
  const start = await hole('');
  const html = await start.text();
  if (!/<main id="main"/.test(html)) fehler.push('Startseite ohne <main id="main">');
  if (!/noindex/.test(html)) fehler.push('Startseite ohne noindex');
  for (const m of html.matchAll(/\b(?:src|href)="([^"#:]+)"/g)) await hole(m[1]);
  const sw = await (await hole('sw.js')).text();
  for (const m of (sw.match(/const SHELL = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)) {
    if (m[1] === './') continue;
    if (m[1].endsWith('.js')) await modulBaum(m[1]); else await hole(m[1]);
  }
  const app = await (await fetch(url('js/app.js'))).text();
  for (const m of (app.match(/const VIEWS = \{([\s\S]*?)\};/)?.[1] || '').matchAll(/:\s*'([a-z0-9-]+)'/g)) await modulBaum(`js/views/${m[1]}.js`);
  const idx = await (await hole('data/index.json')).json();
  for (const d of Object.values(idx.dateien).flat()) {
    const r = await hole('data/' + d);
    if (r.status === 200) { try { await r.json(); } catch { fehler.push(`data/${d}: kein gültiges JSON`); } }
  }
  const nf = await fetch(url('gibt-es-nicht.html'));
  if (nf.status !== 404) fehler.push('Unbekannte Seite liefert nicht 404');
  const r = await fetch(url('robots.txt'));
  if (!/Disallow: \//.test(await r.text())) fehler.push('robots.txt ohne Disallow');
} catch (e) {
  fehler.push('Ausnahme: ' + e.message);
} finally {
  server.close();
}

if (fehler.length) {
  console.error(`✗ Smoke-Test: ${fehler.length} Fehler`);
  for (const f of fehler) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`✓ Smoke-Test grün: ${geprueft.size} Pfade unter ${BASIS} mit HTTP 200.`);
