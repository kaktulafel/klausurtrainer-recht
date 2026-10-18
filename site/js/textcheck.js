// Text-Heuristiken (rein, ohne DOM): Schlüsselbegriffe, Kernpunkte, Gutachtenstil-Hinweise, Wortzähler.

export function normalisiere(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9§ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function woerter(text) {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Prüft, ob ein Begriff im Text vorkommt. Alternativen mit "|" trennen ("Offenkundigkeit|im fremden Namen").
 * Mehrwortbegriffe: alle Wörter müssen (in Stammform, erste 5 Zeichen) vorkommen.
 */
export function enthaeltBegriff(text, begriff) {
  const t = ' ' + normalisiere(text) + ' ';
  return String(begriff).split('|').some(alt => {
    const n = normalisiere(alt);
    if (!n) return false;
    if (t.includes(' ' + n)) return true;
    const teile = n.split(' ').filter(w => w.length > 2);
    return teile.length > 0 && teile.every(w => t.includes(' ' + w.slice(0, Math.max(4, Math.min(6, w.length - 1)))));
  });
}

export function begriffCheck(begriffe, text) {
  return (begriffe || []).map(b => ({ begriff: b.split('|')[0], gefunden: enthaeltBegriff(text, b) }));
}

const UEBERLEITUNGEN = ['fraglich ist', 'fraglich', 'dies setzt voraus', 'voraussetzung', 'zunaechst', 'weiterhin', 'ferner', 'darueber hinaus', 'somit', 'folglich', 'mithin', 'daher', 'demnach', 'demzufolge', 'vorliegend', 'hier'];
const ERGEBNIS = ['ergebnis', 'somit', 'folglich', 'mithin', 'damit', 'also', 'demnach', 'zwischenergebnis'];
const DEFINITION = ['versteht man', 'versteht man unter', 'ist jede', 'ist eine', 'liegt vor wenn', 'liegt vor, wenn', 'definiert', 'bezeichnet', 'ist gegeben wenn', 'setzt voraus', 'bedeutet'];

/** Zerlegt eine Bearbeitung in Prüfungsblöcke anhand von Gliederungszeilen (A., I., 1., „Prüfung“). */
export function bloecke(text) {
  const zeilen = String(text || '').split(/\n/);
  const out = [];
  let cur = [];
  const kopf = /^\s*((?:[A-H]|[IVX]{1,4}|\d{1,2})[.)]\s|Prüfung\s*\d|Teil\s+[A-C])/;
  for (const z of zeilen) {
    if (kopf.test(z) && cur.join('').trim()) { out.push(cur.join('\n')); cur = []; }
    cur.push(z);
  }
  if (cur.join('').trim()) out.push(cur.join('\n'));
  return out;
}

function saetze(s) {
  return String(s).replace(/\n+/g, ' ').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ§])/).map(x => x.trim()).filter(Boolean);
}

/**
 * Gutachtenstil-Hinweise (Heuristik!). Liefert Liste {art:'ok'|'hinweis'|'warnung', text}.
 */
export function stilHinweise(text) {
  const h = [];
  const t = String(text || '');
  if (woerter(t) < 40) {
    h.push({ art: 'hinweis', text: 'Der Text ist sehr kurz – für eine Bewertung des Stils fehlt Material.' });
    return h;
  }
  const n = normalisiere(t);
  const bl = bloecke(t).filter(b => woerter(b) >= 15);
  let konjunktivOk = 0, urteilsstil = 0, ohneErgebnis = 0;
  for (const b of bl) {
    const s = saetze(b.replace(/^\s*((?:[A-H]|[IVX]{1,4}|\d{1,2})[.)]|Prüfung\s*\d+:?)[^\n]*\n/, ''));
    const erster = normalisiere(s[0] || '');
    if (/\b(koennte|koennten|kommt in betracht|in betracht kommt|fraglich ist|zu pruefen ist|moeglicherweise)\b/.test(erster)) konjunktivOk++;
    else if (/\b(hat|haben) (einen|keinen) anspruch\b|\bist (wirksam|unwirksam|nichtig)\b|\bbesteht\b/.test(erster)) urteilsstil++;
    const schluss = normalisiere(s.slice(-2).join(' '));
    if (!ERGEBNIS.some(w => schluss.includes(w))) ohneErgebnis++;
  }
  if (bl.length) {
    if (konjunktivOk === bl.length) h.push({ art: 'ok', text: `Obersätze: Alle ${bl.length} Prüfungsblöcke beginnen hypothetisch („könnte …“, „fraglich ist …“).` });
    else h.push({ art: 'hinweis', text: `Obersätze: ${konjunktivOk} von ${bl.length} Prüfungsblöcken beginnen erkennbar im Konjunktiv. Formulierung: „A könnte gegen B einen Anspruch auf … aus § … haben.“` });
    if (urteilsstil) h.push({ art: 'warnung', text: `Urteilsstil am Prüfungsbeginn in ${urteilsstil} Block/Blöcken: Das Ergebnis steht vorne. Im Gutachten erst prüfen, dann feststellen.` });
    if (ohneErgebnis) h.push({ art: 'hinweis', text: `${ohneErgebnis} Prüfungsblock/-blöcke ohne erkennbaren Ergebnissatz („Somit …“, „Folglich …“, „Im Ergebnis …“).` });
    else h.push({ art: 'ok', text: 'Jeder Prüfungsblock endet mit einem Ergebnissatz.' });
  }
  const ueb = UEBERLEITUNGEN.filter(w => n.includes(w)).length;
  if (ueb >= 4) h.push({ art: 'ok', text: 'Überleitungen vorhanden („fraglich ist“, „somit“ …).' });
  else h.push({ art: 'hinweis', text: 'Wenige Überleitungen. Bausteine: „Dies setzt voraus, dass …“, „Fraglich ist, ob …“, „Somit …“.' });
  const def = DEFINITION.filter(w => n.includes(normalisiere(w))).length;
  if (def >= 2) h.push({ art: 'ok', text: 'Definitionen erkennbar („… versteht man …“, „… liegt vor, wenn …“).' });
  else h.push({ art: 'hinweis', text: 'Kaum Definitionen erkennbar. Vor der Subsumtion das Merkmal definieren: „Unter … versteht man …“.' });
  if (!/§|art\./i.test(t)) h.push({ art: 'warnung', text: 'Keine einzige Norm zitiert.' });
  return h;
}

/** Kernpunkt-Check für Wissensfragen: Kernpunkt gilt als getroffen, wenn ein Großteil seiner Stichwörter vorkommt. */
export function kernpunktCheck(kernpunkte, text, stichwoerter) {
  return (kernpunkte || []).map((kp, i) => {
    const sw = stichwoerter && stichwoerter[i] ? stichwoerter[i] : null;
    if (sw && sw.length) {
      const treffer = sw.filter(w => enthaeltBegriff(text, w)).length;
      return { kernpunkt: kp, getroffen: treffer >= Math.ceil(sw.length / 2) };
    }
    const woerter = normalisiere(kp).split(' ').filter(w => w.length > 4 && !STOP.has(w));
    if (!woerter.length) return { kernpunkt: kp, getroffen: false };
    const tn = ' ' + normalisiere(text);
    const treffer = woerter.filter(w => tn.includes(' ' + w.slice(0, 5))).length;
    return { kernpunkt: kp, getroffen: treffer / woerter.length >= 0.5 };
  });
}

const STOP = new Set(['werden', 'wurde', 'durch', 'nicht', 'einer', 'eines', 'einem', 'sowie', 'diese', 'dieser', 'immer', 'wenn', 'dass', 'oder', 'unter', 'nach', 'gegen', 'zwischen']);
