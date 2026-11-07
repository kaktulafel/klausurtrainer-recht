#!/usr/bin/env node
// Erzeugt aus docs/cheatsheet/*.md ein zweispaltiges Druck-PDF (höchstens 5 Seiten A4). Ausgabe: druck/ (per .gitignore nicht im Repo).
// Format der Quelle: "# " Titel, "~ " Untertitel, "## " Abschnitt, "### " Kasten, "1. " Merkmal, "- " Punkt, "  - " Unterpunkt,
// "F: " Fall-Zeile (aufeinanderfolgende bilden eine Fälle-Liste, der Fallverweis am Anfang wird fett), "! " Merke-Zeile, sonst Absatz.
// Inline: **fett**, (+) und (−) werden farbig.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = join(WURZEL, 'docs', 'cheatsheet');
const ZIEL = join(WURZEL, 'druck');
const MAX_SEITEN = 5;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/(§§?|Art\.|Abs\.|S\.|Nr\.|Alt\.|lit\.) (?=\d|[a-f]\b)/g, '$1 ')
  .replace(/ (BGB|DSGVO|BDSG|StVG|VVG|EFZG|SchwarzArbG|TDDDG)\b/g, ' $1')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\(\+\)/g, '<span class="ja">(+)</span>')
  .replace(/\(−\)/g, '<span class="nein">(−)</span>');
const fallZeile = (s) => {
  const m = s.match(/^(F\d+(?:\/\d+)?(?: (?:Teil \d|Frage \d))?(?:, F\d+(?:\/\d+)?)*)\s+(.*)$/);
  return m ? `<span class="ref">${esc(m[1])}</span><span>${inline(m[2])}</span>` : `<span></span><span>${inline(s)}</span>`;
};

export function html(md) {
  const aus = [];
  let liste = null, kasten = false, unter = false;
  const zu = () => {
    if (unter) { aus.push('</li></ul>'); unter = false; }
    if (liste) { aus.push({ ol: '</li></ol>', ul: '</li></ul>', f: '</li></ul></div>' }[liste]); liste = null; }
  };
  const kastenZu = () => { zu(); if (kasten) { aus.push('</section>'); kasten = false; } };
  for (const roh of md.split('\n')) {
    if (!roh.trim()) continue;
    const z = roh.trimEnd();
    if (z.startsWith('  - ') && (liste === 'ol' || liste === 'ul')) {
      if (!unter) { aus.push('<ul class="unter">'); unter = true; } else aus.push('</li>');
      aus.push(`<li>${inline(z.slice(4))}`);
      continue;
    }
    if (unter) { aus.push('</li></ul>'); unter = false; }
    if (z.startsWith('# ')) { kastenZu(); aus.push(`<h1>${inline(z.slice(2))}</h1>`); }
    else if (z.startsWith('~ ')) { kastenZu(); aus.push(`<p class="unter-titel">${inline(z.slice(2))}</p>`); }
    else if (z.startsWith('## ')) { kastenZu(); aus.push(`<h2>${inline(z.slice(3))}</h2>`); }
    else if (z.startsWith('### ')) { kastenZu(); aus.push(`<section class="kasten"><h3>${inline(z.slice(4))}</h3>`); kasten = true; }
    else if (/^\d+\. /.test(z)) {
      if (liste !== 'ol') { zu(); aus.push('<ol><li>'); liste = 'ol'; } else aus.push('</li><li>');
      aus.push(inline(z.replace(/^\d+\. /, '')));
    } else if (z.startsWith('- ')) {
      if (liste !== 'ul') { zu(); aus.push('<ul><li>'); liste = 'ul'; } else aus.push('</li><li>');
      aus.push(inline(z.slice(2)));
    } else if (z.startsWith('F: ')) {
      if (liste !== 'f') { zu(); aus.push('<div class="faelle"><ul><li class="label">Fälle</li><li>'); liste = 'f'; } else aus.push('</li><li>');
      aus.push(fallZeile(z.slice(3)));
    } else if (z.startsWith('! ')) { zu(); aus.push(`<p class="merke">${inline(z.slice(2))}</p>`); }
    else { zu(); aus.push(`<p>${inline(z)}</p>`); }
  }
  kastenZu();
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 10mm 10mm 11mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.4pt; line-height: 1.38; color: #1a1a1a; hyphens: auto; }
    h1 { font-size: 14pt; margin: 0 0 2pt; color: #123c69; }
    .unter-titel { margin: 0 0 6pt; color: #555; font-size: 8pt; }
    main { column-count: 2; column-gap: 7mm; column-rule: 0.4pt solid #d5d5d5; }
    h2 { font-size: 10pt; margin: 6pt 0 4pt; padding: 2pt 5pt; background: #123c69; color: #fff; break-after: avoid; }
    h2:first-child { margin-top: 0; }
    .kasten { border-left: 2pt solid #4a7fb5; padding: 0 0 0 5pt; margin: 0 0 7pt; }
    h3 { font-size: 9.2pt; margin: 0 0 2pt; color: #123c69; break-after: avoid; }
    p { margin: 0 0 3pt; }
    ol, ul { margin: 0 0 3pt; padding-left: 12pt; }
    ul.unter { margin: 1pt 0 0; padding-left: 10pt; list-style: circle; }
    li { margin: 0 0 1.5pt; }
    .faelle { background: #f1f5fa; padding: 2pt 4pt 1pt; margin: 3pt 0; border-radius: 2pt; }
    .faelle ul { list-style: none; padding-left: 0; margin: 0; }
    .faelle li { display: grid; grid-template-columns: minmax(34pt, max-content) 1fr; column-gap: 5pt; margin-bottom: 1pt; break-inside: avoid; }
    .faelle li.label { display: block; color: #4a7fb5; text-transform: uppercase; font-size: 7pt; letter-spacing: .4pt; font-weight: 700; break-after: avoid; }
    .ref { font-weight: 700; color: #123c69; white-space: nowrap; }
    .merke { border: 0.6pt solid #d9a400; background: #fff8e1; padding: 2pt 4pt; margin: 3pt 0; }
    .ja { color: #17703a; font-weight: 700; } .nein { color: #b3261e; font-weight: 700; }
  </style></head><body>${aus.slice(0, 2).join('')}<main>${aus.slice(2).join('\n')}</main></body></html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(ZIEL, { recursive: true });
  let browser;
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { browser = await chromium.launch(channel ? { channel } : {}); break; } catch { /* nächster */ }
  }
  const seite = await browser.newPage();
  let fehler = false;
  for (const datei of readdirSync(QUELLE).filter(d => d.endsWith('.md'))) {
    await seite.setContent(html(readFileSync(join(QUELLE, datei), 'utf8')));
    const aus = join(ZIEL, `${datei.replace(/\.md$/, '')}.pdf`);
    const pdf = await seite.pdf({ path: aus, preferCSSPageSize: true, printBackground: true });
    const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(seiten <= MAX_SEITEN ? '✓' : '✗', aus, `(${seiten} Seiten)`);
    if (seiten > MAX_SEITEN) fehler = true;
  }
  await browser.close();
  if (fehler) { console.error(`Mehr als ${MAX_SEITEN} Seiten.`); process.exit(1); }
}
