import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUR_UEBERSCHRIFT, zeilen, anspruchAus, ohneGliederung, gruppiereAnsprueche, schemaFuer, SCHEMA_IDS, fallPasst } from '../site/js/kompakt.js';

const json = (p) => JSON.parse(readFileSync(new URL('../site/data/' + p, import.meta.url), 'utf8'));
const faelle = json('index.json').dateien.faelle.map(json);

test('anspruchAus: Anspruchsteller, Gegner und Grundlage', () => {
  assert.deepEqual(anspruchAus('B. Anspruch MK gegen J auf 4.500 € aus § 433 Abs. 2 BGB'), { wer: 'MK', gegen: 'J', grundlage: '§ 433 Abs. 2 BGB' });
  assert.deepEqual(anspruchAus('D. Anspruch N gegen J aus § 122 Abs. 1 BGB (analog)'), { wer: 'N', gegen: 'J', grundlage: '§ 122 Abs. 1 BGB' });
  assert.deepEqual(anspruchAus('Frage 3: Anspruch W gegen T aus § 179 Abs. 1 BGB'), { wer: 'W', gegen: 'T', grundlage: '§ 179 Abs. 1 BGB' });
  assert.equal(anspruchAus('A. Anspruch N gegen J auf 500 € aus §§ 280 Abs. 1, 311 Abs. 2 Nr. 2, 241 Abs. 2 BGB').grundlage, '§§ 280 Abs. 1, 311 Abs. 2, 241 Abs. 2 BGB');
  assert.equal(anspruchAus('A. Anfechtung der Vollmachtserteilung durch J (Gestaltungsrecht, Rechtsfolge § 142 Abs. 1 BGB)'), null);
  assert.equal(anspruchAus('B. Eigentum an der Kamera'), null);
  assert.equal(anspruchAus(undefined), null);
});

test('anspruchAus: Stichpunkt-Form ohne das Wort „Anspruch“, mit Ergebnis', () => {
  assert.deepEqual(anspruchAus('B. MK gegen J auf 4.500 € aus § 433 Abs. 2 BGB (−)'), { wer: 'MK', gegen: 'J', grundlage: '§ 433 Abs. 2 BGB' });
  assert.deepEqual(anspruchAus('Frage 1: P gegen V aus § 433 Abs. 1 S. 1 BGB (−); Vertrauensschaden 60 € (−, a. A. vertretbar)'), { wer: 'P', gegen: 'V', grundlage: '§ 433 Abs. 1 S. 1 BGB' });
  assert.equal(anspruchAus('Frage 2: Anfechtung wegen Eigenschaftsirrtums, § 119 Abs. 2 BGB (+), aber Ersatz des Vertrauensschadens'), null);
});

test('ohneGliederung entfernt nur das Gliederungszeichen', () => {
  assert.equal(ohneGliederung('B. Anspruch V gegen K'), 'Anspruch V gegen K');
  assert.equal(ohneGliederung('II. Vertretungsmacht'), 'Vertretungsmacht');
  assert.equal(ohneGliederung('Frage 1'), 'Frage 1');
});

test('gruppiereAnsprueche: jede Prüfung der obersten Ebene genau einmal, sortiert nach Paragraph', () => {
  const { gruppen, sonstige } = gruppiereAnsprueche(faelle);
  assert.ok(faelle.every(f => f.stichpunkte?.length && f.kurzSachverhalt?.length), 'jeder Fall hat Stichpunktlösung und Kurz-Sachverhalt');
  const ebene1 = faelle.reduce((s, f) => s + zeilen(f).filter(z => z.ebene === 1 && !NUR_UEBERSCHRIFT.test(ohneGliederung(z.text))).length, 0);
  assert.ok(!sonstige.some(e => /^(Frage|Teil) \d+$/.test(e.text)), 'keine reinen Überschriften');
  assert.equal(gruppen.reduce((s, g) => s + g.eintraege.length, 0) + sonstige.length, ebene1);
  const kauf = gruppen.find(g => g.grundlage === '§ 433 Abs. 2 BGB');
  assert.ok(kauf && kauf.eintraege.some(e => e.fallId === 'fall-01' && e.wer === 'MK' && e.gegen === 'J'));
  assert.equal(gruppen.filter(g => g.grundlage.startsWith('§§ 280 Abs. 1, 311')).length, 1, 'c.i.c. mit und ohne „Nr. 2“ in einer Gruppe');
  const nrn = gruppen.map(g => parseInt(g.grundlage.replace(/^§§?\s*/, ''), 10));
  assert.deepEqual(nrn, [...nrn].sort((a, b) => a - b));
});

test('schemaFuer: Zuordnungen zeigen auf vorhandene Schemata', () => {
  const ids = new Set(json('schemata.json').map(s => s.id));
  for (const id of SCHEMA_IDS) assert.ok(ids.has(id), id);
  assert.equal(schemaFuer('§ 433 Abs. 2 BGB'), 'schema-kaufpreis');
  assert.equal(schemaFuer('§ 433 Abs. 1 S. 1 BGB'), null);
  assert.equal(schemaFuer('§ 179 Abs. 1 BGB'), 'schema-179');
});

test('fallPasst: alle Suchwörter, Groß-/Kleinschreibung egal', () => {
  const f = faelle.find(x => x.id === 'fall-03');
  assert.ok(fallPasst(f, ''));
  assert.ok(fallPasst(f, 'taschengeld'));
  assert.ok(fallPasst(f, '§ 110'));
  assert.ok(!fallPasst(f, 'taschengeld versteigerung-gibt-es-nicht'));
});
