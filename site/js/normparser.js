// Normen-Parser: erkennt Normzitate in Freitext (rein, ohne DOM – in Node testbar).
// Unterstützt u. a.: "§ 179 Abs. 2 BGB", "§179 II", "§§ 119, 123 BGB", "§ 119 I Alt. 2",
// "§ 119 Abs. 1 2. Fall", "§ 812 I 1 Alt. 1", "§§ 145 ff.", "Art. 6 Abs. 1 lit. f DSGVO",
// "Art. 6 I f DSGVO", "Art. 33, 34 DS-GVO", "§§ 26 BGB, 35 GmbHG".

const GESETZE = {
  'BGB': 'BGB', 'DSGVO': 'DSGVO', 'DS-GVO': 'DSGVO', 'BDSG': 'BDSG', 'TDDDG': 'TDDDG', 'TTDSG': 'TDDDG',
  'HGB': 'HGB', 'STVG': 'StVG', 'GMBHG': 'GmbHG', 'AKTG': 'AktG', 'KI-VO': 'KI-VO', 'KIVO': 'KI-VO',
  'GG': 'GG', 'NACHWG': 'NachwG', 'EFZG': 'EFZG', 'STGB': 'StGB', 'JUSCHG': 'JuSchG', 'KCANG': 'KCanG',
  'UWG': 'UWG', 'ZPO': 'ZPO', 'EGBGB': 'EGBGB', 'VVG': 'VVG', 'SCHWARZARBG': 'SchwarzArbG'
};
const GESETZ_RE = '(?:BGB|DS-GVO|DSGVO|BDSG|TDDDG|TTDSG|HGB|StVG|GmbHG|AktG|KI-VO|GG|NachwG|EFZG|StGB|JuSchG|KCanG|UWG|ZPO|EGBGB|VVG|SchwarzArbG)';
const ROEMISCH = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** Normalisiert die Gesetzesabkürzung (z. B. "DS-GVO" → "DSGVO"). */
export function normGesetz(g) {
  if (!g) return null;
  return GESETZE[g.toUpperCase()] || g;
}

// Ein Zitat-Block beginnt mit §, §§, Art., Artt., Artikel.
const START_RE = /(§§?|Artt?\.|Artikel)\s*(?=\d)/g;

/**
 * Extrahiert alle Normzitate aus einem Text.
 * @returns {Array<{zeichen:'§'|'Art.', nr:string, abs?:number, satz?:number, nummer?:number, alt?:number, lit?:string, ff?:boolean, gesetz:string, raw:string, index:number}>}
 */
export function parseNormen(text, opts = {}) {
  if (typeof text !== 'string' || !text) return [];
  const result = [];
  START_RE.lastIndex = 0;
  let m;
  while ((m = START_RE.exec(text))) {
    const zeichen = m[1].startsWith('§') ? '§' : 'Art.';
    const mehrfach = m[1] === '§§' || m[1] === 'Artt.';
    const startIdx = m.index;
    let pos = m.index + m[0].length;
    const items = [];
    let pending = [];
    let cur = null;
    // Tokens innerhalb des Blocks verarbeiten
    for (;;) {
      const rest = text.slice(pos);
      let t;
      if (!cur || cur._closed) {
        // neue Normnummer erwartet
        t = /^(\d+[a-z]?)(?![\d])/.exec(rest);
        if (!t) break;
        cur = { zeichen, nr: t[1] };
        items.push(cur); pending.push(cur);
        pos += t[0].length;
        continue;
      }
      // Qualifizierer
      if ((t = /^\s*(?:Abs\.?|Absatz)\s*(\d+)/.exec(rest))) { cur.abs = +t[1]; cur._letzte = 'abs'; pos += t[0].length; continue; }
      if ((t = /^\s*(?:S\.|Satz)\s*(\d+)/.exec(rest))) { cur.satz = +t[1]; cur._letzte = 'satz'; pos += t[0].length; continue; }
      // "§ 168 S. 2, 3" bzw. "§ 119 Abs. 1, 2" (einfaches §): Fortsetzung von Satz/Absatz, kein neuer Paragraph
      if (cur._letzte && (t = /^\s*(?:,|und)\s*(\d)(?![\d.a-z])(?!\s*(?:Abs|Absatz|S\.|Satz))/.exec(rest))) { pos += t[0].length; continue; }
      if ((t = /^\s*(?:Nr\.?|Nummer)\s*(\d+)/.exec(rest))) { cur.nummer = +t[1]; pos += t[0].length; continue; }
      if ((t = /^\s*(?:Alt\.?|Alternative|Var\.?|Fall)\s*(\d+)/.exec(rest))) { cur.alt = +t[1]; pos += t[0].length; continue; }
      if ((t = /^,?\s*(\d+)\.\s*(?:Alt\.?|Alternative|Var\.?|Variante|Fall)(?![a-zäöü])/.exec(rest))) { cur.alt = +t[1]; pos += t[0].length; continue; }
      if ((t = /^\s*(?:lit\.?|Buchst\.?|Buchstabe)\s*([a-z])\)?(?![a-zäöü])/.exec(rest))) { cur.lit = t[1]; pos += t[0].length; continue; }
      if ((t = /^\s*(?:Hs\.?|Halbsatz|UAbs\.?|Unterabsatz)\s*(\d+)/.exec(rest))) { pos += t[0].length; continue; }
      if ((t = /^\s*(ff?\.)/.exec(rest))) { cur.ff = true; pos += t[0].length; continue; }
      if (cur.abs === undefined && (t = /^\s+(X|IX|VIII|VII|VI|V|IV|III|II|I)(?![A-Za-z0-9äöüÄÖÜ])/.exec(rest))) {
        cur.abs = ROEMISCH[t[1]]; pos += t[0].length; continue;
      }
      // "Art. 6 I f" bzw. "Art. 6 Abs. 1 f" – einzelner Kleinbuchstabe nach Absatz = lit.
      if (cur.abs !== undefined && cur.lit === undefined && zeichen === 'Art.' && (t = /^\s+([a-f])(?![A-Za-zäöüß0-9])/.exec(rest))) {
        cur.lit = t[1]; pos += t[0].length; continue;
      }
      // "§ 812 I 1" – nackte Zahl direkt nach römischem/arabischem Absatz = Satz
      if (cur.abs !== undefined && cur.satz === undefined && (t = /^\s+(\d)(?![\d.a-zA-Z])/.exec(rest))) {
        // nicht verwechseln mit "§§ 280 I 2, 276" – trotzdem Satz (übliche Schreibweise)
        cur.satz = +t[1]; pos += t[0].length; continue;
      }
      // Gesetzesbezeichnung
      if ((t = new RegExp('^\\s*(' + GESETZ_RE + ')(?![A-Za-z])').exec(rest))) {
        const g = normGesetz(t[1]);
        for (const p of pending) p.gesetz = g;
        pending = [];
        cur._closed = true;
        pos += t[0].length;
        // Danach kann die Liste weitergehen ("§§ 26 BGB, 35 GmbHG")
        const n = /^\s*(?:,|und|sowie|bzw\.|oder|\/)\s*(?=\d)/.exec(text.slice(pos));
        if (n) { pos += n[0].length; continue; }
        break;
      }
      // Listentrenner zur nächsten Nummer
      if ((t = /^\s*(?:,|und|sowie|bzw\.|oder|\/|–|-)\s*(?=\d+[a-z]?(?![\d]))/.exec(rest))) {
        // "–" nur als Bereich "§§ 104–113": beide Endpunkte erfassen
        cur._closed = true;
        pos += t[0].length;
        continue;
      }
      // Unbekannte Gesetzesabkürzung (z. B. "EStG", "BetrVG"): nicht still als BGB deuten
      if ((t = /^\s+([A-ZÄÖÜ][a-zäöü]*[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*)(?![A-Za-zÄÖÜäöü])/.exec(rest))) {
        for (const p of pending) p.gesetz = t[1];
        pending = [];
        pos += t[0].length;
      }
      break;
    }
    const raw = text.slice(startIdx, pos).trim();
    const fallback = zeichen === '§' ? (opts.defaultParagraph || 'BGB') : (opts.defaultArtikel || 'DSGVO');
    for (const it of items) {
      delete it._closed; delete it._letzte;
      if (!it.gesetz) it.gesetz = fallback;
      it.raw = raw;
      it.index = startIdx;
      result.push(it);
    }
    START_RE.lastIndex = Math.max(pos, startIdx + 1);
  }
  return result;
}

/** Registerschlüssel auf Ebene Paragraph/Artikel, z. B. "BGB § 179", "DSGVO Art. 6". */
export function normKey(n) {
  return `${n.gesetz} ${n.zeichen} ${n.nr}`;
}

/** Register-ID im Normenregister, z. B. "bgb-179", "dsgvo-art-6", "bdsg-38". */
export function registerId(n) {
  const g = n.gesetz.toLowerCase().replace(/[^a-z0-9]/g, '');
  return n.zeichen === 'Art.' ? `${g}-art-${n.nr}` : `${g}-${n.nr}`;
}

/** Formatiert ein geparstes Zitat in Langform ("§ 179 Abs. 2 S. 1 BGB"). */
export function formatNorm(n) {
  let s = `${n.zeichen} ${n.nr}`;
  if (n.abs !== undefined) s += ` Abs. ${n.abs}`;
  if (n.satz !== undefined) s += ` S. ${n.satz}`;
  if (n.nummer !== undefined) s += ` Nr. ${n.nummer}`;
  if (n.lit !== undefined) s += ` lit. ${n.lit}`;
  if (n.alt !== undefined) s += ` Alt. ${n.alt}`;
  if (n.ff) s += ' ff.';
  return `${s} ${n.gesetz}`;
}

/** Parst genau ein Zitat (für erwartete Normen in den Daten). */
export function parseEine(zitat) {
  const r = parseNormen(zitat);
  return r.length ? r[0] : null;
}

/**
 * Normen-Check: vergleicht erwartete Normen mit den im Nutzertext gefundenen.
 * Status je erwarteter Norm: 'ok' (genannt, Absatz passt oder nicht verlangt),
 * 'teil' (Paragraph genannt, aber Absatz/Satz/lit. fehlt oder weicht ab), 'fehlt'.
 * Zusätzlich genannte Normen (nicht erwartet) werden als 'zusatz' gemeldet.
 */
export function normenCheck(erwartet, nutzerText) {
  const gefunden = parseNormen(nutzerText);
  const erw = erwartet.map(z => ({ zitat: z, n: parseEine(z) })).filter(e => e.n);
  const ergebnisse = erw.map(({ zitat, n }) => {
    const passend = gefunden.filter(g => normKey(g) === normKey(n));
    if (!passend.length) return { zitat, status: 'fehlt' };
    const genau = passend.some(g => detailPasst(n, g));
    return { zitat, status: genau ? 'ok' : 'teil', gefunden: passend.map(formatNorm) };
  });
  const erwKeys = new Set(erw.map(e => normKey(e.n)));
  const zusatzMap = new Map();
  for (const g of gefunden) {
    const k = normKey(g);
    if (!erwKeys.has(k) && !zusatzMap.has(k)) zusatzMap.set(k, formatNorm({ ...g, abs: undefined, satz: undefined, nummer: undefined, lit: undefined, alt: undefined, ff: false }));
  }
  return { ergebnisse, zusatz: [...zusatzMap.values()] };
}

function detailPasst(soll, ist) {
  for (const f of ['abs', 'satz', 'nummer', 'lit', 'alt']) {
    if (soll[f] !== undefined && ist[f] !== soll[f]) return false;
  }
  return true;
}

/** Vergleicht ein Nutzerzitat mit dem Soll (Paragraph + alle verlangten Details). */
export function vergleicheZitat(soll, eingabe) {
  const s = parseEine(soll);
  const ist = parseNormen(eingabe, { defaultParagraph: s?.gesetz || 'BGB', defaultArtikel: s?.gesetz || 'DSGVO' });
  if (!ist.length) return { art: 'falsch', text: 'Keine Norm erkannt.', ok: false };
  const gleich = ist.find(n => registerId(n) === registerId(s));
  if (!gleich) return { art: 'falsch', text: `Falsche Norm (du: ${formatNorm(ist[0])}).`, ok: false };
  const felder = ['abs', 'satz', 'nummer', 'lit', 'alt'];
  const fehlt = felder.filter(f => s[f] !== undefined && gleich[f] === undefined);
  const falsch = felder.filter(f => s[f] !== undefined && gleich[f] !== undefined && gleich[f] !== s[f]);
  const zuviel = felder.filter(f => s[f] === undefined && gleich[f] !== undefined);
  if (falsch.length) return { art: 'falsch', text: `Richtige Norm, aber ${falsch.map(name).join(', ')} falsch (du: ${formatNorm(gleich)}).`, ok: false };
  if (fehlt.length) return { art: 'teil', text: `Richtige Norm, aber ${fehlt.map(name).join(', ')} fehlt.`, ok: false };
  if (zuviel.length) return { art: 'teil', text: `Richtig – deine Angabe (${formatNorm(gleich)}) ist genauer als verlangt; prüfe sie im Gesetz.`, ok: true };
  return { art: 'ok', text: 'Exakt richtig zitiert.', ok: true };
}
function name(f) { return { abs: 'Absatz', satz: 'Satz', nummer: 'Nummer', lit: 'Buchstabe (lit.)', alt: 'Alternative' }[f]; }
