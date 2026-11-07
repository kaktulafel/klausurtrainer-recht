#!/usr/bin/env node
// Erzeugt aus docs/podcast/*.md je ein PDF als Quelle für NotebookLM. Ausgabe: podcast/ (per .gitignore nicht im Repo).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = join(WURZEL, 'docs', 'podcast');
const ZIEL = join(WURZEL, 'podcast');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(md) {
  const teile = md.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    if (b.startsWith('### ')) return `<h3>${esc(b.slice(4))}</h3>`;
    if (b.startsWith('## ')) return `<h2>${esc(b.slice(3))}</h2>`;
    if (b.startsWith('# ')) return `<h1>${esc(b.slice(2))}</h1>`;
    return `<p>${esc(b)}</p>`;
  });
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.5; color: #111; }
    h1 { font-size: 20pt; margin: 0 0 12pt; } h2 { font-size: 14pt; margin: 16pt 0 6pt; break-after: avoid; } h3 { font-size: 12pt; margin: 12pt 0 4pt; break-after: avoid; }
    p { margin: 0 0 8pt; }
  </style></head><body>${teile.join('\n')}</body></html>`;
}

mkdirSync(ZIEL, { recursive: true });
let browser;
for (const channel of [undefined, 'msedge', 'chrome']) {
  try { browser = await chromium.launch(channel ? { channel } : {}); break; } catch { /* nächster */ }
}
const seite = await browser.newPage();
for (const datei of readdirSync(QUELLE).filter(d => d.endsWith('.md'))) {
  await seite.setContent(html(readFileSync(join(QUELLE, datei), 'utf8')));
  const aus = join(ZIEL, `podcast-${datei.replace(/\.md$/, '')}.pdf`);
  await seite.pdf({ path: aus, format: 'A4', margin: { top: '22mm', bottom: '22mm', left: '24mm', right: '24mm' } });
  console.log('✓', aus);
}
await browser.close();
