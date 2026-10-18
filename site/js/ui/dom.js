// DOM-Hilfen. Grundsatz: Texte nur über textContent/Textknoten – nie ungeprüftes HTML.
import { parseNormen, registerId, formatNorm } from '../normparser.js';
import { lade } from '../data.js';

/** Element erzeugen: h('button', {class:'btn', onclick: fn, 'aria-label': 'x'}, 'Text', kind2 …) */
export function h(tag, attrs, ...kinder) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'html') throw new Error('html-Attribut ist verboten');
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  haenge(el, kinder);
  return el;
}

function haenge(el, kinder) {
  for (const k of kinder.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function leere(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Inline-Text mit **fett** und automatisch verlinkten Normen. */
export function inline(text, { normen = true } = {}) {
  const frag = document.createDocumentFragment();
  const teile = String(text ?? '').split(/(\*\*[^*]+\*\*)/g);
  for (const t of teile) {
    if (!t) continue;
    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      const b = document.createElement('strong');
      b.append(normen ? mitNormen(t.slice(2, -2)) : document.createTextNode(t.slice(2, -2)));
      frag.append(b);
    } else frag.append(normen ? mitNormen(t) : document.createTextNode(t));
  }
  return frag;
}

/** Ersetzt Normzitate in einem Textstück durch Popover-Buttons. */
export function mitNormen(text) {
  const frag = document.createDocumentFragment();
  const gefunden = parseNormen(text);
  // Blöcke (gleicher Startindex) zusammenfassen
  const bloecke = new Map();
  for (const n of gefunden) {
    if (!bloecke.has(n.index)) bloecke.set(n.index, { start: n.index, raw: n.raw, normen: [] });
    bloecke.get(n.index).normen.push(n);
  }
  let pos = 0;
  for (const b of [...bloecke.values()].sort((a, c) => a.start - c.start)) {
    const start = text.indexOf(b.raw, b.start);
    if (start < pos || start < 0) continue;
    if (start > pos) frag.append(document.createTextNode(text.slice(pos, start)));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'norm';
    btn.textContent = b.raw;
    btn.dataset.normen = JSON.stringify(b.normen.map(n => ({ id: registerId(n), zitat: formatNorm(n) })));
    btn.setAttribute('aria-haspopup', 'dialog');
    frag.append(btn);
    pos = start + b.raw.length;
  }
  if (pos < text.length) frag.append(document.createTextNode(text.slice(pos)));
  return frag;
}

/**
 * Mini-Renderer für Langtexte: Absätze (Leerzeile), Listen ("- ", "• ", "1. "), Überschriften ("## "), **fett**, Normen.
 * Erzeugt ausschließlich DOM-Knoten (kein innerHTML).
 */
export function md(text, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'md' + (opts.lese ? ' lese' : '');
  const zeilen = String(text ?? '').replace(/\r/g, '').split('\n');
  let liste = null, absatz = [];
  const flushAbsatz = () => {
    if (absatz.length) { const p = document.createElement('p'); p.append(inline(absatz.join(' '), opts)); wrap.append(p); absatz = []; }
  };
  for (const z of zeilen) {
    const ul = /^\s*[-•]\s+(.*)$/.exec(z);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(z);
    const hd = /^\s*#{2,3}\s+(.*)$/.exec(z);
    if (hd) { flushAbsatz(); liste = null; const e = document.createElement('h3'); e.append(inline(hd[1], opts)); wrap.append(e); continue; }
    if (ul || ol) {
      flushAbsatz();
      const typ = ul ? 'UL' : 'OL';
      if (!liste || liste.tagName !== typ) { liste = document.createElement(typ.toLowerCase()); wrap.append(liste); }
      const li = document.createElement('li'); li.append(inline(ul ? ul[1] : ol[2], opts)); liste.append(li);
      continue;
    }
    if (!z.trim()) { flushAbsatz(); liste = null; continue; }
    if (liste) { liste = null; }
    absatz.push(z.trim());
  }
  flushAbsatz();
  return wrap;
}

/** Status-Marker mit Icon + Text (farbunabhängig). */
export function status(art, text) {
  const map = { richtig: ['ok', '✓'], ok: ['ok', '✓'], teilweise: ['teil', '◐'], teil: ['teil', '◐'], falsch: ['falsch', '✗'], fehlt: ['falsch', '✗'], zusatz: ['teil', '⚠'], info: ['info', 'ℹ'] };
  const [kl, icon] = map[art] || ['info', 'ℹ'];
  return h('span', { class: 'status ' + kl }, h('span', { 'aria-hidden': 'true' }, icon), text);
}

export function toast(text, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function karte(...kinder) { return h('section', { class: 'karte' }, ...kinder); }

export function hinweisModul(titel, text) {
  return karte(h('h2', null, titel), h('p', null, status('info', 'Hinweis'), ' ', text));
}

// ---------- Normen-Popover ----------
let popover = null;
let register = null;

async function registerLaden() {
  if (register) return register;
  try { const r = await lade('normen.json'); register = new Map(r.map(n => [n.id, n])); }
  catch { register = new Map(); }
  return register;
}

export function schliessePopover() { if (popover) { popover.remove(); popover = null; } }

export async function zeigeNormPopover(btn) {
  schliessePopover();
  const reg = await registerLaden();
  let normen = [];
  try { normen = JSON.parse(btn.dataset.normen || '[]'); } catch { /* leer */ }
  const box = h('div', { class: 'popover', role: 'dialog', 'aria-label': 'Norm: ' + btn.textContent });
  for (const n of normen) {
    const e = reg.get(n.id);
    box.append(h('h4', null, n.zitat, e && e.ueberschrift ? ' – ' + e.ueberschrift : ''));
    if (!e) { box.append(h('p', { class: 'leise' }, 'Nicht im Normenregister.')); continue; }
    if (e.kurz) box.append(h('p', null, e.kurz));
    if (e.lage) box.append(h('p', { class: 'leise klein' }, 'Fundort: ' + e.lage));
    if (e.wortlaut) {
      const d = h('details', null, h('summary', null, 'Amtlicher Wortlaut'), h('div', { class: 'wortlaut' }, e.wortlaut));
      box.append(d);
    }
    box.append(h('p', { class: 'klein' }, h('a', { href: e.link, target: '_blank', rel: 'noopener noreferrer' }, 'Gesetzestext öffnen ↗'), ' · ', h('a', { href: '#/normen/register/' + e.id }, 'Im Register')));
  }
  box.append(h('button', { type: 'button', class: 'btn klein leise', onclick: schliessePopover }, 'Schließen'));
  document.body.append(box);
  popover = box;
  const r = btn.getBoundingClientRect();
  const bw = Math.min(window.innerWidth * 0.92, 440);
  let left = Math.max(8, Math.min(r.left, window.innerWidth - bw - 8));
  let top = r.bottom + 6;
  box.style.left = left + 'px';
  box.style.top = top + 'px';
  const bh = box.getBoundingClientRect().height;
  if (top + bh > window.innerHeight - 8) box.style.top = Math.max(8, r.top - bh - 6) + 'px';
  box.querySelector('a, button')?.focus();
}

export function initNormPopover() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button.norm');
    if (btn) { e.preventDefault(); zeigeNormPopover(btn); return; }
    if (popover && !popover.contains(e.target)) schliessePopover();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliessePopover(); });
  window.addEventListener('hashchange', schliessePopover);
}
