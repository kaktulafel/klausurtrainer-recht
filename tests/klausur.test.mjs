import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baueZufallsKlausur, klausurErgebnis, maxPunkte } from '../site/js/klausur-core.js';

const rndFix = () => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
const faelle = [{ id: 'f1', minuten: 60, punkte: 48, geprueft: true }, { id: 'f2', minuten: 25, punkte: 24, geprueft: true }, { id: 'f3', minuten: 75, punkte: 48, geprueft: false }];
const wissen = Array.from({ length: 10 }, (_, i) => ({ id: 'w' + i, thema: 't' + (i % 3), klausurantwort: i < 2, geprueft: i !== 9 }));
const mc = Array.from({ length: 40 }, (_, i) => ({ id: 'm' + i, thema: 'd' + (i % 12), geprueft: i !== 0 }));

test('Zufallsklausur: nur geprüfte, klausurgroße Fälle; 4 Wissen, 20 MC ohne Doppelte', () => {
  const k = baueZufallsKlausur({ faelle, wissen, mc }, rndFix());
  assert.equal(k.teile.A.fall, 'f1');
  assert.equal(k.teile.B.wissen.length, 4);
  assert.equal(new Set(k.teile.B.wissen).size, 4);
  assert.ok(!k.teile.B.wissen.includes('w9'));
  assert.equal(k.teile.C.mc.length, 20);
  assert.equal(new Set(k.teile.C.mc).size, 20);
  assert.ok(!k.teile.C.mc.includes('m0'));
  // max. 2 je Thema, solange genug Themen da sind
  const proThema = {};
  for (const id of k.teile.C.mc) { const t = mc.find(q => q.id === id).thema; proThema[t] = (proThema[t] || 0) + 1; }
  assert.ok(Object.values(proThema).every(n => n <= 2));
  // Wissensfragen: verschiedene Themen zuerst (3 Themen → mind. 3 verschieden)
  assert.ok(new Set(k.teile.B.wissen.map(id => wissen.find(w => w.id === id).thema)).size >= 3);
  assert.equal(maxPunkte(k), 80);
});

test('Zufallsklausur ohne geprüften großen Fall wirft verständlichen Fehler', () => {
  assert.throws(() => baueZufallsKlausur({ faelle: [faelle[1]], wissen, mc }), /klausurgroß/);
});

test('Gesamtergebnis: Begrenzung je Teil, Note', () => {
  const k = { teile: { A: { punkte: 48 }, B: { wissen: ['a', 'b', 'c', 'd'], punkteJe: 3 }, C: { mc: Array(20).fill('x'), punkteJe: 1 } } };
  const e = klausurErgebnis(k, { A: 50, B: 9, C: 15.5 });
  assert.equal(e.teile.A.punkte, 48);
  assert.equal(e.punkte, 72.5);
  assert.equal(e.max, 80);
  assert.equal(e.note, '1,3'); // 72,5 / 80 = 90,6 %
  assert.equal(klausurErgebnis(k, { A: -3, B: 'x', C: 0 }).punkte, 0);
});
