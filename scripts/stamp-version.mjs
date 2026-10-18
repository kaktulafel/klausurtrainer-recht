#!/usr/bin/env node
// Ersetzt __APP_VERSION__ in site/index.html, site/sw.js, site/version.json durch Commit-SHA + Zeitstempel.
// Nur im CI vor dem Upload ausführen – im Repo bleibt der Platzhalter stehen.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const sha = (process.argv[2] || process.env.GITHUB_SHA || 'unbekannt').trim();
const zeit = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const version = `${sha.slice(0, 7)}-${zeit.replace(/[-:]/g, '').replace('T', '-').slice(0, 13)}`;
for (const f of ['index.html', 'sw.js']) {
  const p = join(SITE, f);
  const alt = readFileSync(p, 'utf8');
  if (!alt.includes('__APP_VERSION__')) { console.error(`Platzhalter fehlt in ${f}`); process.exit(1); }
  writeFileSync(p, alt.replaceAll('__APP_VERSION__', version));
}
writeFileSync(join(SITE, 'version.json'), JSON.stringify({ version, commit: sha, gebaut: zeit }, null, 2) + '\n');
console.log(`Version gestempelt: ${version} (Commit ${sha})`);
