#!/usr/bin/env node
// Erzeugt aus docs/cheatsheet/*.md ein dichtes, dreispaltiges Druck-PDF (höchstens 5 Seiten A4). Ausgabe: druck/ (per .gitignore nicht im Repo).
// Format der Quelle: "# " Titel, "~ " Untertitel, "## " Abschnitt, "### " Kasten, "1. " Merkmal, "- " Punkt, "  - " Unterpunkt,
// "F: " Fälle-Zeile, "! " Merke-Zeile, sonst Absatz. Inline: **fett**, (+) und (−) werden farbig.
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

export function html(md) {
  const aus = [];
  let liste = null, kasten = false;
  const zu = () => { if (liste) { aus.push(liste === 'ol' ? '</li></ol>' : '</li></ul>'); liste = null; } };
  const kastenZu = () => { zu(); if (kasten) { aus.push('</section>'); kasten = false; } };
  let unter = false;
  for (const roh of md.split('\n')) {
    if (!roh.trim()) continue;
    const z = roh.trimEnd();
    if (z.startsWith('  - ')) {
      if (!liste) { aus.push('<ul><li>'); liste = 'ul'; }
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
    } else if (z.startsWith('F: ')) { zu(); aus.push(`<p class="faelle"><b>Fälle</b> ${inline(z.slice(3))}</p>`); }
    else if (z.startsWith('! ')) { zu(); aus.push(`<p class="merke">${inline(z.slice(2))}</p>`); }
    else { zu(); aus.push(`<p>${inline(z)}</p>`); }
  }
  if (unter) aus.push('</li></ul>');
  kastenZu();
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 7mm 7mm 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.8pt; line-height: 1.27; color: #111; hyphens: auto; }
    h1 { font-size: 13pt; margin: 0 0 1pt; color: #123c69; }
    .unter-titel { margin: 0 0 3pt; color: #444; font-size: 7.4pt; }
    main { column-count: 3; column-gap: 3.2mm; column-rule: 0.4pt solid #ccc; }
    h2 { font-size: 9pt; margin: 3pt 0 2pt; padding: 1pt 3pt; background: #123c69; color: #fff; break-after: avoid; }
    .kasten { border-left: 1.6pt solid #4a7fb5; padding: 0 0 0 3pt; margin: 0 0 3pt; }
    h3 { font-size: 8.2pt; margin: 0 0 1pt; color: #123c69; break-after: avoid; }
    p { margin: 0 0 1.5pt; }
    ol, ul { margin: 0 0 1.5pt; padding-left: 9pt; }
    ul.unter { margin: 0; padding-left: 8pt; list-style: circle; }
    li { margin: 0 0 0.6pt; }
    .faelle { background: #f1f5fa; padding: 1pt 2pt; margin: 1pt 0 1.5pt; }
    .faelle > b:first-child { color: #4a7fb5; text-transform: uppercase; font-size: 6.6pt; letter-spacing: .3pt; margin-right: 1pt; }
    .merke { border: 0.5pt solid #d9a400; background: #fff8e1; padding: 1pt 2pt; }
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
