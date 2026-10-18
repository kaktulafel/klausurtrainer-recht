#!/usr/bin/env node
// Prüft die Live-Seite: HTTP 200, version.json = aktueller Commit, alle Daten/Assets erreichbar.
// Nutzung: npm run live-check -- https://<user>.github.io/<repo>/ [--sha <commit>] [--warten]
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
let basis = args.find(a => /^https?:\/\//.test(a));
if (!basis) { console.error('Bitte URL angeben: npm run live-check -- https://…/'); process.exit(2); }
if (!basis.endsWith('/')) basis += '/';
const iSha = args.indexOf('--sha');
let sha = iSha >= 0 ? args[iSha + 1] : null;
if (!sha) { try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { sha = null; } }
const warten = args.includes('--warten');

const hole = (pfad) => fetch(basis + pfad + (pfad.includes('?') ? '&' : '?') + 'lc=' + Date.now(), { cache: 'no-store' });

async function einmal() {
  const fehler = [];
  const start = await hole('');
  if (start.status !== 200) fehler.push(`Startseite: HTTP ${start.status}`);
  const html = start.status === 200 ? await start.text() : '';
  if (html.includes('__APP_VERSION__')) fehler.push('Startseite enthält noch den Versions-Platzhalter');
  const v = await hole('version.json');
  let version = null;
  if (v.status !== 200) fehler.push(`version.json: HTTP ${v.status}`);
  else {
    version = await v.json();
    if (sha && version.commit !== sha) fehler.push(`version.json commit ${version.commit} ≠ HEAD ${sha}`);
  }
  const pfade = ['sw.js', 'manifest.webmanifest', 'robots.txt', 'data/index.json'];
  const swText = await (await hole('sw.js')).text();
  const shell = swText.match(/const SHELL = \[([\s\S]*?)\];/);
  for (const m of (shell ? shell[1] : '').matchAll(/'([^']+)'/g)) if (m[1] !== './') pfade.push(m[1]);
  try {
    const idx = await (await hole('data/index.json')).json();
    for (const d of Object.values(idx.dateien).flat()) pfade.push('data/' + d);
  } catch { fehler.push('data/index.json nicht lesbar'); }
  const einzig = [...new Set(pfade)];
  const ergebnisse = await Promise.all(einzig.map(async p => [p, (await hole(p)).status]));
  for (const [p, s] of ergebnisse) if (s !== 200) fehler.push(`${p}: HTTP ${s}`);
  return { fehler, version, anzahl: einzig.length };
}

const fristen = warten ? [0, 15, 30, 45, 60, 90, 120, 120, 120] : [0];
for (let i = 0; i < fristen.length; i++) {
  if (fristen[i]) { console.log(`… erneuter Versuch in ${fristen[i]} s`); await new Promise(r => setTimeout(r, fristen[i] * 1000)); }
  try {
    const r = await einmal();
    if (!r.fehler.length) { console.log(`✓ Live-Check grün: ${basis} · Version ${r.version?.version} · ${r.anzahl} Dateien erreichbar`); process.exit(0); }
    console.log(`✗ Live-Check (${i + 1}/${fristen.length}):\n  ` + r.fehler.slice(0, 20).join('\n  '));
  } catch (e) { console.log(`✗ Live-Check (${i + 1}/${fristen.length}): ${e.message}`); }
}
process.exit(1);
