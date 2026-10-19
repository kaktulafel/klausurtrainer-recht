#!/usr/bin/env node
// Barrierefreiheit: axe-core (WCAG 2.1 A/AA) über alle Bereiche, 375 px, hell und dunkel.
// Meldet Verstöße der Schwere „serious“/„critical“ als Fehler (Exit 1), „moderate“ als Hinweis.
// Nutzung: node scripts/a11y.mjs
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { starteServer } from './serve.mjs';

const axePfad = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const ROUTEN = [
  '#/', '#/faelle', '#/faelle/fall-18?modus=sachverhalt', '#/faelle/fall-18?modus=gefuehrt', '#/faelle/fall-18?modus=klausur',
  '#/faelle/fall-18?modus=bewertung', '#/faelle/fall-18?modus=loesung', '#/mc', '#/mc?start=1&modus=ueben&n=5',
  '#/normen', '#/normen/karten', '#/normen/zitieren', '#/normen/register', '#/wissen', '#/wissen?start=1&n=3',
  '#/schemata', '#/schemata/schema-gutachten?modus=puzzle', '#/schemata/schema-gutachten?modus=luecken',
  '#/schwachstellen', '#/schwachstellen/dr-01', '#/schwachstellen/taktik', '#/klausur', '#/wiederholen', '#/statistik',
  '#/einstellungen', '#/mehr', '#/info', '#/gibtsnicht'
];
const server = await starteServer(0, '/klausurtrainer-recht/');
const basis = `http://localhost:${server.address().port}/klausurtrainer-recht/`;
const browser = await chromium.launch();
let schwer = 0;
const gesehen = new Map();
for (const schema of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, colorScheme: schema, bypassCSP: true });
  const page = await ctx.newPage();
  for (const r of ROUTEN) {
    await page.goto(basis + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    await page.addScriptTag({ path: axePfad });
    const erg = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations
      .map(v => ({ id: v.id, impact: v.impact, hilfe: v.help, ziele: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })));
    for (const v of erg) {
      const k = `${schema} ${v.id}`;
      if (!gesehen.has(k)) gesehen.set(k, { ...v, routen: [] });
      gesehen.get(k).routen.push(r);
      if (v.impact === 'serious' || v.impact === 'critical') schwer++;
    }
  }
  await ctx.close();
}
await browser.close();
server.close();
for (const [k, v] of gesehen) {
  console.log(`${v.impact === 'serious' || v.impact === 'critical' ? '✗' : '⚠'} [${v.impact}] ${k}: ${v.hilfe}\n    Routen: ${v.routen.slice(0, 6).join(' ')}${v.routen.length > 6 ? ' …' : ''}\n    z. B.: ${v.ziele.join(' | ')}`);
}
console.log(schwer ? `\n${schwer} schwere A11y-Verstöße.` : '\n✓ Keine schweren A11y-Verstöße (WCAG 2.1 AA, axe-core).');
process.exit(schwer ? 1 : 0);
