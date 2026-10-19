#!/usr/bin/env node
// End-to-End-Flows mit Playwright (Chromium, 375 px): Probeklausur komplett, Wiederholen, Statistik, Export.
// Nutzung: node scripts/e2e.mjs   (Exit-Code ≠ 0 bei Fehlern)
import { chromium } from '@playwright/test';
import { starteServer } from './serve.mjs';

const server = await starteServer(0, '/klausurtrainer-recht/');
const basis = `http://localhost:${server.address().port}/klausurtrainer-recht/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
const fehler = [];
page.on('console', m => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text()); });
page.on('pageerror', e => fehler.push('Seite: ' + e.message));
page.on('dialog', d => d.accept());

async function schritt(name, fn) {
  try { await fn(); console.log('✓ ' + name); }
  catch (e) { fehler.push(`${name}: ${e.message.split('\n').slice(0, 3).join(' ')}`); console.log('✗ ' + name); }
}
const sichtbarerText = () => page.evaluate(() => document.querySelector('main')?.innerText || '');
async function keinMuell(route) {
  const t = await sichtbarerText();
  if (/\b(null|undefined|NaN|\[object Object\])\b/.test(t)) throw new Error(`${route}: null/undefined/NaN sichtbar`);
  const breite = await page.evaluate(() => document.documentElement.scrollWidth);
  if (breite > 376) throw new Error(`${route}: horizontales Scrollen (${breite}px)`);
}

await schritt('Probeklausur: starten, bearbeiten, abgeben, auswerten, speichern', async () => {
  await page.goto(basis + '#/klausur', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Starten' }).first().click();
  await page.waitForSelector('textarea.editor');
  await page.fill('textarea.editor', 'V könnte gegen K einen Anspruch auf Zahlung aus § 433 Abs. 2 BGB haben. Dies setzt einen wirksamen Kaufvertrag voraus. Fraglich ist, ob K angefochten hat (§ 142 Abs. 1 BGB).');
  await page.getByRole('tab', { name: 'Teil B' }).click();
  await page.locator('textarea').first().fill('Der Taschengeldparagraph ist § 110 BGB.');
  await page.getByRole('tab', { name: 'Teil C' }).click();
  await page.locator('.optionen').first().waitFor();
  const erste = page.locator('.optionen').first().locator('label.option, li.aussage .rf button, li.aussage > select').first();
  await erste.click();
  await keinMuell('#/klausur (Sitzung)');
  // Reload: Antworten müssen erhalten bleiben
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Teil A' }).click();
  const text = await page.inputValue('textarea.editor');
  if (!text.includes('§ 433 Abs. 2 BGB')) throw new Error('Entwurf Teil A nach Reload verloren');
  await page.getByRole('button', { name: 'Abgeben & auswerten' }).click();
  await page.waitForSelector('text=Auswertung');
  await keinMuell('#/klausur/…/auswertung');
  const sel = page.locator('select[aria-label^="Punkte für"]').first();
  await sel.selectOption('2');
  const summe = await page.locator('p.gross').first().innerText();
  if (!/\/ 80 P\./.test(summe)) throw new Error('Summe unerwartet: ' + summe);
  await page.getByRole('button', { name: /Ergebnis speichern/ }).first().click();
  await page.waitForSelector('text=Verlauf');
  const z = await page.evaluate(() => JSON.parse(localStorage.getItem('nk-recht:state')));
  if (z.versuche.klausuren.length !== 1) throw new Error('Klausurversuch nicht gespeichert');
  if (Object.keys(z.entwuerfe).some(k => k.startsWith('klausur:') && z.entwuerfe[k].text)) throw new Error('Klausurentwürfe nicht aufgeräumt');
});

await schritt('Wiederholen: fällige Karten werden angezeigt', async () => {
  await page.goto(basis + '#/wiederholen', { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  await keinMuell('#/wiederholen');
  // Nach der Klausur sind falsch beantwortete MC heute fällig → direkt wiederholbar
  await page.waitForSelector('text=Direkt wiederholen');
  const vorher = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('nk-recht:state')).srs).reduce((s, k) => s + k.anzahl, 0));
  const karteTyp = await page.locator('.karte .badge').first().innerText();
  if (karteTyp === 'Datenschutz-MC') {
    await page.locator('label.option, li.aussage .rf button, li.aussage > select').first().click();
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
  } else {
    await page.getByRole('button', { name: /Aufdecken/ }).click();
    await page.getByRole('button', { name: /Gewusst/ }).click();
  }
  await page.waitForTimeout(1000);
  const nachher = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('nk-recht:state')).srs).reduce((s, k) => s + k.anzahl, 0));
  if (nachher !== vorher + 1) throw new Error(`SRS nicht aktualisiert (${vorher} → ${nachher})`);
});

await schritt('Statistik: Themen-Tabelle', async () => {
  await page.goto(basis + '#/statistik', { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  await keinMuell('#/statistik');
});

await schritt('Export enthält keinen API-Key', async () => {
  await page.evaluate(() => localStorage.setItem('nk-recht:ki-key', 'sk-ant-test-123'));
  await page.goto(basis + '#/einstellungen', { waitUntil: 'networkidle' });
  const exp = await page.evaluate(async () => (await import('./js/store.js')).exportText());
  if (exp.includes('sk-ant-')) throw new Error('API-Key im Export!');
  await page.evaluate(() => localStorage.removeItem('nk-recht:ki-key'));
});

await browser.close();
server.close();
if (fehler.length) { console.log('\nFehler:\n  ' + fehler.join('\n  ')); process.exit(1); }
console.log('\nAlle E2E-Flows erfolgreich.');
