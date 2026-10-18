import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enthaeltBegriff, begriffCheck, stilHinweise, kernpunktCheck, woerter, bloecke } from '../site/js/textcheck.js';

test('Begriffe: Umlaute, Alternativen, Mehrwort', () => {
  assert.ok(enthaeltBegriff('Die Offenkundigkeit war gegeben.', 'Offenkundigkeit'));
  assert.ok(enthaeltBegriff('Er handelte im fremden Namen', 'Offenkundigkeit|im fremden Namen'));
  assert.ok(enthaeltBegriff('negatives Interesse', 'Vertrauensschaden|negatives Interesse'));
  assert.ok(enthaeltBegriff('schwebende Unwirksamkeit', 'schwebend unwirksam'));
  assert.ok(enthaeltBegriff('Geschaeftsfaehigkeit', 'Geschäftsfähigkeit'));
  assert.equal(enthaeltBegriff('Genehmigung', 'Anfechtung'), false);
  assert.deepEqual(begriffCheck(['Zuschlag', 'Genehmigung'], 'Durch den Zuschlag'), [{ begriff: 'Zuschlag', gefunden: true }, { begriff: 'Genehmigung', gefunden: false }]);
});

const gutachten = `A. Anspruch MK gegen J aus § 433 Abs. 2 BGB
MK könnte gegen J einen Anspruch auf Zahlung von 4.500 € aus § 433 Abs. 2 BGB haben. Dies setzt einen wirksamen Kaufvertrag voraus. Fraglich ist, ob J wirksam vertreten wurde. Unter Vertretungsmacht versteht man die Befugnis, für einen anderen zu handeln. Vorliegend fehlte sie. Somit besteht kein Anspruch.
B. Anspruch MK gegen N aus § 179 BGB
MK könnte gegen N einen Anspruch aus § 179 Abs. 1 BGB haben. Dies setzt voraus, dass N als Vertreterin ohne Vertretungsmacht handelte. Eine Vollmacht liegt vor, wenn sie durch Rechtsgeschäft erteilt wurde. Folglich haftet N.`;

test('Stilhinweise: gutes Gutachten', () => {
  const h = stilHinweise(gutachten);
  assert.ok(h.some(x => x.art === 'ok' && /Obersätze/.test(x.text)));
  assert.ok(h.some(x => x.art === 'ok' && /Ergebnissatz/.test(x.text)));
  assert.ok(!h.some(x => x.art === 'warnung'));
});

test('Stilhinweise: Urteilsstil wird gewarnt', () => {
  const urteil = `A. Anspruch\nMK hat einen Anspruch gegen J aus § 433 Abs. 2 BGB, weil der Vertrag wirksam ist und N Vollmacht hatte und alles passt und deshalb gezahlt werden muss nach dem Gesetz.\nB. Anspruch\nN ist nichtig und haftet sofort, weil sie gelogen hat und keine Vollmacht hatte und das Gericht das so sieht, deshalb muss sie zahlen.`;
  const h = stilHinweise(urteil);
  assert.ok(h.some(x => x.art === 'warnung' && /Urteilsstil/.test(x.text)));
});

test('Stilhinweise: zu kurz und ohne Normen', () => {
  assert.match(stilHinweise('kurz')[0].text, /sehr kurz/);
  const ohne = 'Der Käufer könnte einen Anspruch haben. '.repeat(10);
  assert.ok(stilHinweise(ohne).some(x => /Keine einzige Norm/.test(x.text)));
});

test('Blöcke und Wortzähler', () => {
  assert.equal(bloecke(gutachten).length, 2);
  assert.equal(woerter('  eins zwei\ndrei '), 3);
  assert.equal(woerter(''), 0);
});

test('Kernpunkte', () => {
  const r = kernpunktCheck(['Taschengeld § 110 BGB', 'Leistung vollständig bewirkt'], 'Nach § 110 gilt der Vertrag als wirksam, wenn die Leistung bewirkt ist.', [['§ 110', 'Taschengeld|Mittel'], ['bewirkt', 'vollständig']]);
  assert.equal(r[0].getroffen, true);
  assert.equal(r[1].getroffen, true);
  assert.equal(kernpunktCheck(['Anfechtungsfrist unverzüglich'], 'nichts dazu')[0].getroffen, false);
});
