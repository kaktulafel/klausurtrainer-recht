#!/usr/bin/env node
// Erzeugt docs/THEMENKARTE.md aus site/data/themen.json mit aktuellen Ist-Mengen je Inhaltstyp.
// Nutzung: npm run docs   (nach Inhaltsänderungen erneut ausführen)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'site', 'data');
const lies = (p) => JSON.parse(readFileSync(join(D, p), 'utf8'));
const idx = lies('index.json');
const { themen } = lies('themen.json');
const kat = (k) => (idx.dateien[k] || []).flatMap(f => { const x = lies(f); return Array.isArray(x) ? x : [x]; });

const ist = {};
const zaehle = (thema, art) => { ist[thema] ??= {}; ist[thema][art] = (ist[thema][art] || 0) + 1; };
for (const f of kat('faelle')) for (const t of f.themen) zaehle(t, 'faelle');
for (const q of kat('mc')) zaehle(q.thema, 'mc');
for (const w of kat('wissen')) zaehle(w.thema, 'wissen');
for (const k of kat('normkarten')) zaehle(k.thema, 'normkarten');
for (const s of lies('schemata.json')) zaehle(s.thema, 'schemata');
for (const d of lies('drills.json')) zaehle(d.thema, 'drills');

const ARTEN = ['faelle', 'wissen', 'mc', 'normkarten', 'schemata', 'drills'];
const NAME = { faelle: 'Fälle', wissen: 'Wissen', mc: 'MC', normkarten: 'Normkarten', schemata: 'Schemata', drills: 'Drills' };
const zelle = (t, a) => { const i = ist[t.id]?.[a] || 0; const z = t.ziele?.[a]; return z ? `${i} / ${z}${i >= z ? '' : ' ⚠'}` : (i ? String(i) : '–'); };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');

const zeilen = [];
zeilen.push('# Themenkarte', '');
zeilen.push('> Automatisch erzeugt aus `site/data/themen.json` (`npm run docs`). Zellen: Ist / Ziel (⚠ = Ziel nicht erreicht; „–“ = kein Ziel und kein Inhalt).', '');
zeilen.push('**Gewichtung:** **A** = zentral bzw. in der Erstklausur geprüft (meiste Inhalte) · **B** = wichtig · **C** = Randthema. ★ = Thema der Erstklausur.', '');
for (const [bereich, titel] of [['recht', 'Recht (BGB)'], ['datenschutz', 'Datenschutz']]) {
  zeilen.push(`## ${titel}`, '');
  zeilen.push(`| Thema | Gew. | Kernnormen | Fundstelle im Material | ${ARTEN.map(a => NAME[a]).join(' | ')} |`);
  zeilen.push(`|---|---|---|---|${ARTEN.map(() => '---').join('|')}|`);
  for (const t of themen.filter(x => x.bereich === bereich)) {
    zeilen.push(`| ${esc(t.titel)}${t.erstklausur ? ' ★' : ''} | ${t.gewicht} | ${esc((t.kernnormen || []).join(', ')) || '–'} | ${esc(t.fundstelle) || '–'} | ${ARTEN.map(a => zelle(t, a)).join(' | ')} |`);
  }
  zeilen.push('');
}
const hinweise = themen.filter(t => t.hinweis);
if (hinweise.length) { zeilen.push('## Hinweise', ''); for (const t of hinweise) zeilen.push(`- **${t.titel}:** ${t.hinweis}`); zeilen.push(''); }
writeFileSync(join(ROOT, 'docs', 'THEMENKARTE.md'), zeilen.join('\n'));
console.log(`docs/THEMENKARTE.md erzeugt (${themen.length} Themen).`);
