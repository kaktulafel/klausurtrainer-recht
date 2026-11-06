import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUR_UEBERSCHRIFT, zeilen, ergebnisVon, anspruchAus, ohneGliederung, gruppiereAnsprueche, schemaFuer, SCHEMA_IDS, fallPasst } from '../site/js/kompakt.js';

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

test('ergebnisVon: Ergebnissatz der Prüfung, nicht der nächsten', () => {
  const zz = [
    { ebene: 1, text: 'A. X gegen Y aus § 433 Abs. 2 BGB' }, { ebene: 2, text: '**OS:** X könnte …' }, { ebene: 2, text: '**Erg.:** Folglich hat X keinen Anspruch.' },
    { ebene: 1, text: 'B. Y gegen X aus § 122 Abs. 1 BGB' }, { ebene: 2, text: '**OS:** Y könnte …' }
  ];
  assert.equal(ergebnisVon(zz, 0), 'Folglich hat X keinen Anspruch.');
  assert.equal(ergebnisVon(zz, 3), null);
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
  assert.ok(gruppen.every(g => g.eintraege.every(e => /^Folglich\b/.test(e.ergebnis || ''))), 'jeder Anspruch hat einen Ergebnissatz „Folglich …“');
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

const pfade = json('pruefpfade.json');

test('Prüfungspfade: jede Anspruchsgrundlage aus den Fällen hat einen Pfad', () => {
  const grundlagen = new Set(pfade.flatMap(p => p.grundlagen || []));
  for (const g of gruppiereAnsprueche(faelle).gruppen) assert.ok(grundlagen.has(g.grundlage), `kein Prüfungspfad für ${g.grundlage}`);
});

test('Prüfungspfade: jeder Fall ist bei seinen Ansprüchen verwiesen, weitere Prüfungen bei einem Pfad', () => {
  const alleBezuege = new Set(pfade.flatMap(p => p.zeilen.flatMap(z => z.faelle || [])));
  for (const e of gruppiereAnsprueche(faelle).sonstige) assert.ok(alleBezuege.has(e.fallId), `${e.fallId}: „${e.text}“ ohne Pfad`);
  for (const g of gruppiereAnsprueche(faelle).gruppen) {
    const p = pfade.find(x => (x.grundlagen || []).includes(g.grundlage));
    const bezug = new Set(p.zeilen.flatMap(z => z.faelle || []));
    for (const e of g.eintraege) assert.ok(bezug.has(e.fallId), `${p.id}: Fall ${e.fallId} (${g.grundlage}) fehlt im Pfad`);
  }
});

test('Prüfungspfade: Gutachtenstil – OS am Anfang, Erg. am Ende, Verweise gültig', () => {
  const ids = new Set(pfade.map(p => p.id));
  for (const p of pfade) {
    assert.match(p.zeilen[0].text, /^\*\*OS:\*\* .*\bkönnte\b/, p.id);
    assert.match(p.zeilen.at(-1).text, /^\*\*Erg\.:\*\* Folglich /, p.id);
    for (const z of p.zeilen) if (z.verweis) assert.ok(ids.has(z.verweis), `${p.id} → ${z.verweis}`);
  }
});

const { schemaPunkte, eintragPasst, stapelAuswaehlen } = await import('../site/js/karteikarten.js');

test('Karteikarten: jedes Rechtsthema dabei, Paragraphen nur in der Normenzeile', () => {
  const karten = json('karteikarten/recht.json');
  for (const t of json('themen.json').themen.filter(x => x.bereich === 'recht')) assert.ok(karten.some(k => k.thema === t.id), t.id);
  // Zitate als Formulierungsbeispiel in „…“ sind erlaubt (Obersatz).
  const ohneZitate = (s) => s.replace(/„[^“]*“/g, '');
  for (const k of karten) assert.doesNotMatch(ohneZitate(k.vorne + ' ' + k.hinten), /§|Art\.\s*\d/, k.id);
});

test('Cheatsheets: Schemapunkte mit allen Hauptpunkten und Normen', () => {
  const a = json('schemata.json').find(s => s.id === 'schema-anfechtung');
  assert.equal(schemaPunkte(a).length, a.knoten.length);
  assert.match(schemaPunkte(a)[1], /§ 119 Abs\. 1 Alt\. 2 BGB/);
});

test('Karteikarten: Auswahl nach Thema und Modus, Unbekanntes zuerst', () => {
  const k = [{ id: 'a', thema: 'x' }, { id: 'b', thema: 'x' }, { id: 'c', thema: 'y' }];
  const srs = { 'karte:a': { fach: 3, letzte: 'richtig', faellig: '2026-11-01' }, 'karte:b': { fach: 1, letzte: 'falsch', faellig: '2026-12-01' } };
  assert.deepEqual(stapelAuswaehlen(k, srs, { themen: ['x'], n: 1 }).map(x => x.id), ['b']);
  assert.equal(stapelAuswaehlen(k, srs, { n: 9 })[0].id, 'c');
  assert.deepEqual(stapelAuswaehlen(k, srs, { modus: 'faellig', heute: '2026-11-02', n: 9 }).map(x => x.id), ['a']);
  assert.deepEqual(stapelAuswaehlen(k, srs, { modus: 'schwach', n: 9 }).map(x => x.id), ['b']);
});

test('Cheatsheets: jede Anspruchsgrundlage aus den Fällen steht im Blatt, Suche greift', () => {
  const blatt = json('cheatsheets.json').find(b => b.id === 'cs-ansprueche');
  const pfade = new Set(blatt.eintraege.map(e => e.pfad).filter(Boolean));
  for (const p of json('pruefpfade.json').filter(x => x.art === 'anspruch')) assert.ok(pfade.has(p.id), p.id);
  const e = blatt.eintraege[0];
  assert.ok(eintragPasst(e, '§ 433 zug'));
  assert.ok(!eintragPasst(e, 'Täuschung'));
});
