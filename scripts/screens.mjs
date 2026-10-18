#!/usr/bin/env node
// Entwickler-Werkzeug: Screenshots ausgewählter Routen (Handy 375 px + Desktop, hell/dunkel) und Konsolenfehler.
// Nutzung: node scripts/screens.mjs <ausgabeordner> [route1 route2 …]   (z. B. "#/faelle/fall-01?modus=loesung")
// Lokal wird – falls vorhanden – Microsoft Edge bzw. Chrome genutzt, sonst Playwright-Chromium.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { starteServer } from './serve.mjs';

const [aus = 'tmp/screens', ...routen] = process.argv.slice(2);
mkdirSync(aus, { recursive: true });
const server = await starteServer(0, '/klausurtrainer-recht/');
const basis = `http://localhost:${server.address().port}/klausurtrainer-recht/`;
let browser;
for (const channel of [undefined, 'msedge', 'chrome']) {
  try { browser = await chromium.launch(channel ? { channel } : {}); break; } catch { /* nächster */ }
}
const liste = routen.length ? routen : ['#/'];
const varianten = [
  { name: 'handy', viewport: { width: 375, height: 800 }, colorScheme: 'light' },
  { name: 'handy-dunkel', viewport: { width: 375, height: 800 }, colorScheme: 'dark' },
  { name: 'desktop', viewport: { width: 1280, height: 900 }, colorScheme: 'light' }
];
let fehlerGesamt = 0;
for (const v of varianten) {
  const ctx = await browser.newContext({ viewport: v.viewport, colorScheme: v.colorScheme });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', e => fehler.push(e.message));
  for (const r of liste) {
    await page.goto(basis + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    const datei = join(aus, `${v.name}-${r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'start'}.png`);
    await page.screenshot({ path: datei, fullPage: true });
    const nullText = await page.evaluate(() => /\b(null|undefined|NaN|\[object Object\])\b/.test(document.querySelector('main')?.innerText || ''));
    if (nullText) fehler.push(`${r}: Text „null/undefined/NaN/[object Object]“ sichtbar`);
    const ueberlauf = breite > v.viewport.width + 1 ? ` ⚠ horizontales Scrollen (${breite}px)` : '';
    console.log(`${v.name} ${r} → ${datei}${ueberlauf}`);
  }
  if (fehler.length) { fehlerGesamt += fehler.length; console.log(`  Konsolenfehler (${v.name}):\n   ` + fehler.join('\n   ')); }
  await ctx.close();
}
await browser.close();
server.close();
process.exit(fehlerGesamt ? 1 : 0);
