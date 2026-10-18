#!/usr/bin/env node
// Aktualisiert site/data/index.json aus den vorhandenen Dateien (faelle, mc, wissen, normkarten).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'data');
const p = join(DATA, 'index.json');
const idx = JSON.parse(readFileSync(p, 'utf8'));
for (const k of ['faelle', 'mc', 'wissen', 'normkarten']) {
  const dir = join(DATA, k);
  idx.dateien[k] = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => `${k}/${f}`) : [];
}
writeFileSync(p, JSON.stringify(idx, null, 2) + '\n');
console.log('index.json aktualisiert:', Object.entries(idx.dateien).map(([k, v]) => `${k} ${v.length}`).join(', '));
