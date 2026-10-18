import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNormen, normenCheck, formatNorm, registerId, parseEine } from '../site/js/normparser.js';

const kurz = (t) => parseNormen(t).map(formatNorm);

test('einfaches Zitat mit Absatz', () => {
  assert.deepEqual(kurz('nach § 179 Abs. 2 BGB haftet'), ['§ 179 Abs. 2 BGB']);
});

test('ohne Leerzeichen und römischer Absatz', () => {
  assert.deepEqual(kurz('§179 II'), ['§ 179 Abs. 2 BGB']);
  assert.deepEqual(kurz('§ 142 I BGB'), ['§ 142 Abs. 1 BGB']);
});

test('Liste §§ 119, 123 BGB', () => {
  assert.deepEqual(kurz('§§ 119, 123 BGB'), ['§ 119 BGB', '§ 123 BGB']);
});

test('Alternative in verschiedenen Schreibweisen', () => {
  assert.deepEqual(kurz('§ 119 I Alt. 2'), ['§ 119 Abs. 1 Alt. 2 BGB']);
  assert.deepEqual(kurz('§ 119 Abs. 1 Alt. 2 BGB'), ['§ 119 Abs. 1 Alt. 2 BGB']);
  assert.deepEqual(kurz('§ 119 Abs. 1 2. Fall BGB'), ['§ 119 Abs. 1 Alt. 2 BGB']);
  assert.deepEqual(kurz('§ 119 I, 2. Fall'), ['§ 119 Abs. 1 Alt. 2 BGB']);
});

test('Satz nach römischem Absatz', () => {
  assert.deepEqual(kurz('§ 812 I 1 Alt. 1 BGB'), ['§ 812 Abs. 1 S. 1 Alt. 1 BGB']);
  assert.deepEqual(kurz('§ 280 Abs. 1 S. 2 BGB'), ['§ 280 Abs. 1 S. 2 BGB']);
});

test('Buchstaben-Paragraphen', () => {
  assert.deepEqual(kurz('§ 241a BGB und § 312g Abs. 1 BGB'), ['§ 241a BGB', '§ 312g Abs. 1 BGB']);
});

test('DSGVO-Artikel in Lang- und Kurzform', () => {
  assert.deepEqual(kurz('Art. 6 Abs. 1 lit. f DSGVO'), ['Art. 6 Abs. 1 lit. f DSGVO']);
  assert.deepEqual(kurz('Art. 6 I f DSGVO'), ['Art. 6 Abs. 1 lit. f DSGVO']);
  assert.deepEqual(kurz('Art. 6 I lit. f DSGVO'), ['Art. 6 Abs. 1 lit. f DSGVO']);
  assert.deepEqual(kurz('Art. 33, 34 DS-GVO'), ['Art. 33 DSGVO', 'Art. 34 DSGVO']);
  assert.deepEqual(kurz('Artikel 30 DSGVO'), ['Art. 30 DSGVO']);
});

test('Standardgesetz: § → BGB, Art. → DSGVO', () => {
  const r = parseNormen('§ 110 und Art. 8');
  assert.equal(r[0].gesetz, 'BGB');
  assert.equal(r[1].gesetz, 'DSGVO');
});

test('andere Gesetze und gemischte Listen', () => {
  assert.deepEqual(kurz('§ 38 Abs. 1 BDSG'), ['§ 38 Abs. 1 BDSG']);
  assert.deepEqual(kurz('§ 25 TDDDG'), ['§ 25 TDDDG']);
  assert.deepEqual(kurz('§ 25 TTDSG'), ['§ 25 TDDDG']);
  assert.deepEqual(kurz('§§ 26 BGB, 35 GmbHG'), ['§ 26 BGB', '§ 35 GmbHG']);
  assert.deepEqual(kurz('Art. 3 Nr. 1 KI-VO'), ['Art. 3 Nr. 1 KI-VO']);
});

test('ff. und Bereich', () => {
  assert.deepEqual(kurz('§§ 145 ff. BGB'), ['§ 145 ff. BGB']);
  assert.deepEqual(kurz('§§ 104–113 BGB'), ['§ 104 BGB', '§ 113 BGB']);
});

test('i. V. m. wird als zwei Zitate erkannt', () => {
  assert.deepEqual(kurz('§ 280 Abs. 1 i. V. m. § 311 Abs. 2 Nr. 1 BGB'), ['§ 280 Abs. 1 BGB', '§ 311 Abs. 2 Nr. 1 BGB']);
});

test('keine Fehlerkennung bei Beträgen und Text ohne Normen', () => {
  assert.deepEqual(parseNormen('Er zahlte 4.500 € am 3. Mai.'), []);
  assert.deepEqual(parseNormen(''), []);
  assert.deepEqual(parseNormen(null), []);
});

test('registerId', () => {
  assert.equal(registerId(parseEine('§ 179 Abs. 2 BGB')), 'bgb-179');
  assert.equal(registerId(parseEine('Art. 6 DSGVO')), 'dsgvo-art-6');
  assert.equal(registerId(parseEine('Art. 4 KI-VO')), 'kivo-art-4');
});

test('Normen-Check: ok, teil, fehlt, zusatz', () => {
  const r = normenCheck(['§ 179 Abs. 2 BGB', '§ 142 Abs. 2 BGB', '§ 123 BGB', '§ 177 BGB'],
    'Haftung nach § 179 II, wegen § 142 BGB; Anfechtung nach §§ 119, 123 BGB');
  const s = Object.fromEntries(r.ergebnisse.map(e => [e.zitat, e.status]));
  assert.equal(s['§ 179 Abs. 2 BGB'], 'ok');
  assert.equal(s['§ 142 Abs. 2 BGB'], 'teil');
  assert.equal(s['§ 123 BGB'], 'ok');
  assert.equal(s['§ 177 BGB'], 'fehlt');
  assert.deepEqual(r.zusatz, ['§ 119 BGB']);
});

import { vergleicheZitat } from '../site/js/normparser.js';
test('Zitier-Trainer: Vergleich', () => {
  assert.equal(vergleicheZitat('§ 119 Abs. 1 Alt. 2 BGB', '§ 119 I Alt. 2').art, 'ok');
  assert.equal(vergleicheZitat('§ 119 Abs. 1 Alt. 2 BGB', '§ 119 Abs. 1 BGB').art, 'teil');
  assert.equal(vergleicheZitat('§ 119 Abs. 1 Alt. 2 BGB', '§ 119 Abs. 2 BGB').art, 'falsch');
  assert.equal(vergleicheZitat('§ 119 Abs. 1 Alt. 2 BGB', '§ 123 BGB').art, 'falsch');
  assert.equal(vergleicheZitat('Art. 6 Abs. 1 lit. f DSGVO', 'Art. 6 I f').art, 'ok');
  assert.equal(vergleicheZitat('§ 38 Abs. 1 BDSG', '§ 38 Abs. 1').art, 'ok');
  assert.equal(vergleicheZitat('§ 110 BGB', 'Taschengeld').ok, false);
  assert.equal(vergleicheZitat('§ 179 BGB', '§ 179 Abs. 1 BGB').ok, true);
});

test('Fortsetzung „S. 2, 3“ und „Abs. 1, 2“ bei einfachem §', () => {
  assert.deepEqual(kurz('§ 168 S. 2, 3 BGB'), ['§ 168 S. 2 BGB']);
  assert.deepEqual(kurz('§ 119 Abs. 1, 2 BGB'), ['§ 119 Abs. 1 BGB']);
  assert.deepEqual(kurz('§§ 280 I 2, 276 BGB'), ['§ 280 Abs. 1 S. 2 BGB', '§ 276 BGB']);
  assert.deepEqual(kurz('§ 171 Abs. 2, § 173 BGB'), ['§ 171 Abs. 2 BGB', '§ 173 BGB']);
});
