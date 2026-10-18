import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bewerte, istFaellig, faelligeIds, addTage, tageZwischen, quote, neueKarte } from '../site/js/srs.js';
import { ladeZustand, importiere, exportiere, leererZustand, SCHEMA, markiereLerntag, serieLaenge } from '../site/js/storage-core.js';
import { tagesplan, themenStatistik, schwachstellen } from '../site/js/plan.js';

test('Datumshilfen', () => {
  assert.equal(addTage('2026-02-27', 2), '2026-03-01');
  assert.equal(addTage('2026-12-31', 1), '2027-01-01');
  assert.equal(tageZwischen('2026-10-19', '2026-10-29'), 10);
  assert.equal(tageZwischen('2026-03-28', '2026-03-30'), 2); // Zeitumstellung egal
});

test('SRS: richtig steigt im Fach, Fälligkeit nach Intervall', () => {
  let k = bewerte(null, 'richtig', '2026-10-19');
  assert.equal(k.fach, 1); assert.equal(k.faellig, '2026-10-20');
  k = bewerte(k, 'richtig', '2026-10-20');
  assert.equal(k.fach, 2); assert.equal(k.faellig, '2026-10-22');
  for (let i = 0; i < 10; i++) k = bewerte(k, 'richtig', '2026-11-01');
  assert.equal(k.fach, 6); assert.equal(k.faellig, '2026-12-01');
});

test('SRS: falsch → Fach 1, heute fällig; teilweise → morgen', () => {
  let k = bewerte(bewerte(bewerte(null, 'richtig', '2026-10-01'), 'richtig', '2026-10-02'), 'falsch', '2026-10-05');
  assert.equal(k.fach, 1); assert.equal(k.faellig, '2026-10-05'); assert.equal(k.letzte, 'falsch');
  assert.ok(istFaellig(k, '2026-10-05'));
  k = bewerte(k, 'teilweise', '2026-10-05');
  assert.equal(k.faellig, '2026-10-06');
  assert.equal(istFaellig(k, '2026-10-05'), false);
  assert.equal(quote(k), (0 + 2 + 0.5) / 4);
});

test('SRS: neue Karten sind nicht fällig; Sortierung', () => {
  assert.equal(istFaellig(neueKarte(), '2026-10-19'), false);
  const ids = faelligeIds({ a: { faellig: '2026-10-18', fach: 3 }, b: { faellig: '2026-10-10', fach: 1 }, c: { faellig: '2026-10-25', fach: 1 } }, '2026-10-19');
  assert.deepEqual(ids, ['b', 'a']);
});

test('Storage: leer → neu', () => {
  assert.equal(ladeZustand(null).status, 'neu');
  assert.equal(ladeZustand('').zustand.schema, SCHEMA);
});

test('Storage: kaputtes JSON → defekt + Backup', () => {
  const r = ladeZustand('{kaputt');
  assert.equal(r.status, 'defekt'); assert.equal(r.backup, '{kaputt'); assert.equal(r.zustand.schema, SCHEMA);
});

test('Storage: falscher Typ / neuere Version → defekt', () => {
  assert.equal(ladeZustand('[1,2]').status, 'defekt');
  assert.equal(ladeZustand('"text"').status, 'defekt');
  assert.equal(ladeZustand(JSON.stringify({ schema: 99 })).status, 'defekt');
  assert.equal(ladeZustand(JSON.stringify({ foo: 1 })).status, 'defekt');
});

test('Storage: Migration v1 → v2 behält Daten', () => {
  const v1 = { version: 1, einstellungen: { klausurdatum: '2026-11-02' }, karten: { 'mc:x': { anzahl: 2, richtig: 1, fach: 1 } }, entwuerfe: { 'fall-01': { text: 'Hallo' } }, verlauf: [{ fallId: 'fall-01', punkte: 30, max: 48 }] };
  const r = ladeZustand(JSON.stringify(v1));
  assert.equal(r.status, 'migriert');
  assert.equal(r.zustand.schema, 2);
  assert.equal(r.zustand.einstellungen.klausurdatum, '2026-11-02');
  assert.equal(r.zustand.einstellungen.mcRegel, 'abzug');
  assert.equal(r.zustand.srs['mc:x'].richtig, 1);
  assert.equal(r.zustand.entwuerfe['fall-01'].text, 'Hallo');
  assert.equal(r.zustand.versuche.faelle.length, 1);
});

test('Storage: Teilschäden werden repariert, Gültiges bleibt', () => {
  const z = leererZustand();
  z.srs = { ok: { anzahl: 1, richtig: 1 }, kaputt: 'x' };
  z.versuche = { faelle: 'nix' };
  z.entwuerfe = { a: { text: 'bleibt' } };
  const r = ladeZustand(JSON.stringify(z));
  assert.equal(r.status, 'repariert');
  assert.ok(r.zustand.srs.ok); assert.equal(r.zustand.srs.kaputt, undefined);
  assert.deepEqual(r.zustand.versuche.faelle, []);
  assert.equal(r.zustand.entwuerfe.a.text, 'bleibt');
});

test('Export/Import Rundreise, fremde Daten und Keys werden abgelehnt', () => {
  const z = leererZustand(); z.entwuerfe.x = { text: 'Gutachten' };
  const zur = importiere('\n  ' + exportiere(z) + '  \n');
  assert.equal(zur.entwuerfe.x.text, 'Gutachten');
  assert.throws(() => importiere('kein json'), /JSON/);
  assert.throws(() => importiere(JSON.stringify({ app: 'andere', schema: 2 })), /kein Export/);
  const mitKey = leererZustand(); mitKey.einstellungen.x = 'sk-ant-abc123';
  assert.throws(() => importiere(exportiere(mitKey)), /API-Key/);
  assert.throws(() => importiere(''), /Kein Text/);
});

test('Lernserie', () => {
  let s = [];
  for (const t of ['2026-10-16', '2026-10-17', '2026-10-18']) s = markiereLerntag(s, t);
  assert.equal(serieLaenge(s, '2026-10-19', addTage), 3);
  s = markiereLerntag(s, '2026-10-19');
  assert.equal(serieLaenge(s, '2026-10-19', addTage), 4);
  assert.equal(serieLaenge(s, '2026-10-22', addTage), 0);
});

test('Lernplan: letzte zwei Tage = Wiederholung + Probeklausur', () => {
  const p = tagesplan({ heute: '2026-10-19', klausurdatum: '2026-10-21', faellig: 12 });
  assert.equal(p.phase, 'endspurt');
  assert.ok(p.ziele.some(z => z.art === 'klausur'));
  assert.ok(p.ziele.some(z => z.art === 'wiederholung'));
  assert.equal(tagesplan({ heute: '2026-10-21', klausurdatum: '2026-10-21' }).phase, 'klausurtag');
  assert.equal(tagesplan({ heute: '2026-10-22', klausurdatum: '2026-10-21' }).phase, 'vorbei');
});

test('Lernplan: Aufbauphase verteilt neue Inhalte auf Lerntage', () => {
  const p = tagesplan({ heute: '2026-10-01', klausurdatum: '2026-10-22', ungeseheneMC: 140, ungeseheneWissen: 60, faellig: 3, faelleOffen: [{ id: 'fall-01', titel: 'X' }] });
  assert.equal(p.phase, 'aufbau');
  const mc = p.ziele.find(z => z.art === 'mc');
  assert.equal(mc.anzahl, 8); // 140 / 19 Lerntage
  assert.ok(p.ziele.find(z => z.art === 'fall'));
});

test('Statistik und Schwachstellen', () => {
  const themen = [{ id: 'a', titel: 'A', gewicht: 'A' }, { id: 'b', titel: 'B', gewicht: 'C' }];
  const st = themenStatistik(themen, { 'mc:1': { anzahl: 2, richtig: 2, teilweise: 0, zuletzt: '2026-10-01' }, 'mc:2': { anzahl: 2, richtig: 0, teilweise: 0, zuletzt: '2026-10-02' } }, { 'mc:1': 'b', 'mc:2': 'a' });
  assert.equal(st.a.quote, 0); assert.equal(st.a.ampel, 'rot');
  assert.equal(st.b.quote, 1); assert.equal(st.b.ampel, 'gruen');
  assert.equal(schwachstellen(st, 1)[0].id, 'a');
});
