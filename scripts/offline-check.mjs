#!/usr/bin/env node
// Prüft die Offline-Fähigkeit der LIVE-Seite (gestempelte Version, echter Service Worker):
// erster Besuch online → Service Worker aktiv → Netz aus → Kernbereiche müssen weiter funktionieren.
// Nutzung: node scripts/offline-check.mjs https://<user>.github.io/<repo>/
import { chromium } from '@playwright/test';

let basis = process.argv.slice(2).find(a => /^https?:\/\//.test(a));
if (!basis) { console.error('Bitte URL angeben.'); process.exit(2); }
if (!basis.endsWith('/')) basis += '/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const fehler = [];
page.on('pageerror', e => fehler.push('Seite: ' + e.message));

await page.goto(basis, { waitUntil: 'networkidle' });
// Warten, bis der Service Worker installiert (inkl. Daten-Precache) und aktiv ist
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload({ waitUntil: 'networkidle' });
const cacheInfo = await page.evaluate(async () => {
  const namen = (await caches.keys()).filter(k => k.startsWith('nk-recht-'));
  let anzahl = 0;
  for (const n of namen) anzahl += (await (await caches.open(n)).keys()).length;
  return { namen, anzahl };
});
console.log(`Service Worker aktiv · Cache ${cacheInfo.namen.join(', ')} · ${cacheInfo.anzahl} Einträge`);
if (!cacheInfo.anzahl) fehler.push('Cache leer');

await ctx.setOffline(true);
const routen = [
  ['#/', 'h1'],
  ['#/faelle/fall-18?modus=loesung', 'text=Musterlösung'],
  ['#/mc?start=1&modus=ueben&n=5', '.optionen'],
  ['#/wissen', 'h1'],
  ['#/normen/register', 'h1'],
  ['#/schemata', 'h1'],
  ['#/klausur', 'text=Feste Probeklausuren']
];
for (const [r, sel] of routen) {
  try {
    await page.goto(basis + r, { waitUntil: 'load' });
    await page.waitForSelector(sel);
    const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
    if (/konnte nicht geladen werden|Offline – Inhalt nicht im Cache|Da ist etwas schiefgelaufen|nicht gefunden/.test(text)) throw new Error('Fehlerkarte sichtbar');
    console.log('✓ offline: ' + r);
  } catch (e) { fehler.push(`${r}: ${e.message.split('\n')[0]}`); console.log('✗ offline: ' + r); }
}
// Norm-Wortlaut (separate Datei) offline
try {
  await page.goto(basis + '#/faelle/fall-18?modus=loesung', { waitUntil: 'load' });
  await page.locator('button.norm').first().click();
  await page.locator('.popover summary, details summary', { hasText: 'Amtlicher Wortlaut' }).first().click();
  await page.waitForFunction(() => { const w = document.querySelector('.wortlaut'); return w && w.textContent.length > 40 && !/Lädt|nicht gefunden|Kein Wortlaut/.test(w.textContent); });
  console.log('✓ offline: Norm-Wortlaut im Popover');
} catch (e) { fehler.push('Wortlaut offline: ' + e.message.split('\n')[0]); }

await browser.close();
if (fehler.length) { console.log('\nFehler:\n  ' + fehler.join('\n  ')); process.exit(1); }
console.log('\nOffline-Check erfolgreich.');
