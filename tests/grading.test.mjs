import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bewerteMC, note, rasterSumme, mische, validiereNotenschluessel } from '../site/js/grading.js';

const single = { typ: 'single', optionen: [{ id: 'a', korrekt: true }, { id: 'b', korrekt: false }, { id: 'c', korrekt: false }, { id: 'd', korrekt: false }] };
const multi = { typ: 'multi', optionen: [{ id: 'a', korrekt: true }, { id: 'b', korrekt: true }, { id: 'c', korrekt: false }, { id: 'd', korrekt: false }] };

test('Single Choice: nur exakt richtig gibt Punkte', () => {
  assert.equal(bewerteMC(single, ['a']).punkte, 1);
  assert.equal(bewerteMC(single, ['b']).punkte, 0);
  assert.equal(bewerteMC(single, ['a', 'b']).punkte, 0);
  assert.equal(bewerteMC(single, []).status, 'falsch');
});

test('Multi: alles-oder-nichts', () => {
  assert.equal(bewerteMC(multi, ['a', 'b'], 'alles-oder-nichts').punkte, 1);
  assert.equal(bewerteMC(multi, ['a'], 'alles-oder-nichts').punkte, 0);
});

test('Multi: Teilpunkte ohne Abzug', () => {
  assert.equal(bewerteMC(multi, ['a'], 'teilpunkte').punkte, 0.75);
  assert.equal(bewerteMC(multi, ['a', 'c'], 'teilpunkte').punkte, 0.5);
  assert.equal(bewerteMC(multi, [], 'teilpunkte').punkte, 0.5);
});

test('Multi: Abzug (Standard), nie negativ', () => {
  assert.equal(bewerteMC(multi, ['a', 'b'], 'abzug').punkte, 1);
  assert.equal(bewerteMC(multi, ['a'], 'abzug').punkte, 0.5);   // 3 richtig entschieden, 1 falsch → (3-1)/4
  assert.equal(bewerteMC(multi, ['a', 'c'], 'abzug').punkte, 0); // 2 - 2
  assert.equal(bewerteMC(multi, ['c', 'd'], 'abzug').punkte, 0); // wäre negativ
  assert.equal(bewerteMC(multi, ['a'], 'abzug').status, 'teilweise');
});

test('Multi: Minuspunkte', () => {
  assert.equal(bewerteMC(multi, ['a', 'b'], 'minuspunkte').punkte, 1);
  assert.equal(bewerteMC(multi, ['a', 'c'], 'minuspunkte').punkte, 0);
  assert.equal(bewerteMC(multi, ['a'], 'minuspunkte').punkte, 0.5);
  assert.equal(bewerteMC(multi, ['c'], 'minuspunkte').punkte, 0);
});

test('Aussagenblock wird wie Multi bewertet', () => {
  const f = { typ: 'aussagen', optionen: [{ id: '1', korrekt: true }, { id: '2', korrekt: false }, { id: '3', korrekt: true }] };
  assert.equal(bewerteMC(f, ['1', '3'], 'alles-oder-nichts').punkte, 1);
  assert.equal(bewerteMC(f, ['1'], 'teilpunkte').punkte, 0.67);
});

test('Zuordnung', () => {
  const f = { typ: 'zuordnung', paare: [{ id: 'p1', loesung: 'b' }, { id: 'p2', loesung: 'c' }] };
  assert.equal(bewerteMC(f, { p1: 'b', p2: 'c' }, 'abzug').punkte, 1);
  assert.equal(bewerteMC(f, { p1: 'b', p2: 'a' }, 'abzug').punkte, 0);
  assert.equal(bewerteMC(f, { p1: 'b' }, 'teilpunkte').punkte, 0.5);
  assert.equal(bewerteMC(f, { p1: 'b' }, 'alles-oder-nichts').punkte, 0);
});

test('Maximalpunkte skalieren', () => {
  assert.equal(bewerteMC(multi, ['a'], 'abzug', 2).punkte, 1);
});

test('Notenschlüssel: Grenzwerte inklusive', () => {
  assert.equal(note(95, 100).note, '1,0');
  assert.equal(note(94.99, 100).note, '1,3');
  assert.equal(note(90, 100).note, '1,3');
  assert.equal(note(85, 100).note, '1,7');
  assert.equal(note(80, 100).note, '2,0');
  assert.equal(note(75, 100).note, '2,3');
  assert.equal(note(70, 100).note, '2,7');
  assert.equal(note(65, 100).note, '3,0');
  assert.equal(note(60, 100).note, '3,3');
  assert.equal(note(55, 100).note, '3,7');
  assert.equal(note(50, 100).note, '4,0');
  assert.equal(note(49.99, 100).note, '5,0');
  assert.equal(note(0, 100).note, '5,0');
});

test('Notenschlüssel: krumme Maxima und Rundung', () => {
  assert.equal(note(42, 48).note, '1,7');   // 87,5 %
  assert.equal(note(24, 48).note, '4,0');   // genau 50 %
  assert.equal(note(45.6, 48).note, '1,0'); // 95 % trotz Gleitkomma
  assert.equal(note(76, 80).note, '1,0');
  assert.equal(note(60, 0).note, '5,0');
  assert.equal(note(200, 100).note, '1,0');
  assert.equal(note(42, 48).bestanden, true);
});

test('Notenschlüssel validieren', () => {
  assert.equal(validiereNotenschluessel([{ ab: 50, note: '4,0' }, { ab: 0, note: '5,0' }]), true);
  assert.equal(validiereNotenschluessel([{ ab: 50, note: '4,0' }]), false);
  assert.equal(validiereNotenschluessel('x'), false);
});

test('Rastersumme begrenzt je Kriterium', () => {
  const raster = [{ id: 'r1', punkte: 2 }, { id: 'r2', punkte: 3 }];
  assert.deepEqual(rasterSumme(raster, { r1: true, r2: 5 }), { summe: 5, max: 5 });
  assert.deepEqual(rasterSumme(raster, { r2: 1.5 }), { summe: 1.5, max: 5 });
  assert.deepEqual(rasterSumme(raster, { r1: -3 }), { summe: 0, max: 5 });
});

test('Mischen behält alle Elemente', () => {
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const a = mische([1, 2, 3, 4, 5], rnd);
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5]);
});
