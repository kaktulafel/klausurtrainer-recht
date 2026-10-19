// Probeklausur: Zusammenstellung (fest/zufällig) und Gesamtbewertung – rein, ohne DOM.
import { mische, note, runde, STANDARD_NOTENSCHLUESSEL } from './grading.js';

export const FORMAT = { minuten: 90, A: { punkte: 48, minuten: 55 }, B: { anzahl: 4, punkteJe: 3, minuten: 15 }, C: { anzahl: 20, punkteJe: 1, minuten: 20 } };

/**
 * Stellt eine Zufallsklausur aus geprüften Inhalten zusammen.
 * Teil A: klausurgroßer Fall (≥ 60 min); B: 4 Wissensfragen (bevorzugt „Klausurantwort“, verschiedene Themen); C: 20 MC (max. 2 je Thema).
 */
export function baueZufallsKlausur({ faelle, wissen, mc }, rnd = Math.random) {
  const ok = (x) => x && x.geprueft !== false;
  const gross = faelle.filter(f => ok(f) && f.minuten >= 60);
  if (!gross.length) throw new Error('Kein geprüfter klausurgroßer Fall vorhanden.');
  const fall = mische(gross, rnd)[0];
  const wPool = mische(wissen.filter(ok), rnd).sort((a, b) => (b.klausurantwort ? 1 : 0) - (a.klausurantwort ? 1 : 0));
  const wAus = [], wThemen = new Set();
  for (const w of wPool) { if (wAus.length >= FORMAT.B.anzahl) break; if (!wThemen.has(w.thema)) { wAus.push(w.id); wThemen.add(w.thema); } }
  for (const w of wPool) { if (wAus.length >= FORMAT.B.anzahl) break; if (!wAus.includes(w.id)) wAus.push(w.id); }
  const proThema = {}, cAus = [];
  const mPool = mische(mc.filter(ok), rnd);
  for (const q of mPool) { if (cAus.length >= FORMAT.C.anzahl) break; if ((proThema[q.thema] || 0) < 2) { cAus.push(q.id); proThema[q.thema] = (proThema[q.thema] || 0) + 1; } }
  for (const q of mPool) { if (cAus.length >= FORMAT.C.anzahl) break; if (!cAus.includes(q.id)) cAus.push(q.id); }
  return {
    id: 'zufall', titel: 'Zufallsklausur', beschreibung: 'Zufällig aus geprüften Inhalten zusammengestellt.', minuten: FORMAT.minuten,
    teile: {
      A: { titel: 'Teil A – Fallbearbeitung', fall: fall.id, punkte: fall.punkte, empfohleneMinuten: FORMAT.A.minuten },
      B: { titel: 'Teil B – Wissensfragen', wissen: wAus, punkteJe: FORMAT.B.punkteJe, empfohleneMinuten: FORMAT.B.minuten },
      C: { titel: 'Teil C – Datenschutz (Multiple Choice)', mc: cAus, punkteJe: FORMAT.C.punkteJe, empfohleneMinuten: FORMAT.C.minuten }
    }
  };
}

/** Maximalpunkte einer Klausurdefinition. */
export function maxPunkte(k) {
  return runde((k.teile.A?.punkte || 0) + (k.teile.B?.wissen.length || 0) * (k.teile.B?.punkteJe || 0) + (k.teile.C?.mc.length || 0) * (k.teile.C?.punkteJe || 0));
}

/**
 * Gesamtergebnis aus Teilpunkten. Teilpunkte werden auf [0, max] begrenzt.
 * @param {object} k  Klausurdefinition
 * @param {{A:number, B:number, C:number}} teilpunkte
 */
export function klausurErgebnis(k, teilpunkte, schluessel = STANDARD_NOTENSCHLUESSEL) {
  const max = { A: k.teile.A.punkte, B: k.teile.B.wissen.length * k.teile.B.punkteJe, C: k.teile.C.mc.length * k.teile.C.punkteJe };
  const teile = {};
  for (const t of ['A', 'B', 'C']) {
    const p = Number(teilpunkte?.[t]);
    teile[t] = { punkte: runde(Math.max(0, Math.min(isFinite(p) ? p : 0, max[t]))), max: max[t] };
  }
  const punkte = runde(teile.A.punkte + teile.B.punkte + teile.C.punkte);
  const gesamt = runde(max.A + max.B + max.C);
  return { punkte, max: gesamt, teile, ...note(punkte, gesamt, schluessel) };
}
