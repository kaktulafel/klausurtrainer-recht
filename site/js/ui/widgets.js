// Wiederverwendbare UI-Bausteine: Tabs, Timer, Sortierliste, Autosave-Editor, KI-Panel.
import { h, leere, md, status, toast, karte } from './dom.js';
import * as store from '../store.js';
import { woerter } from '../textcheck.js';
import { sende, extrahiereJson, schwaerze, KIFehler } from '../ai.js';

/** Tabs mit ARIA. tabs: [{id, label, render(container)}]. Gibt {element, wechsle(id)} zurück. */
export function tabs(liste, aktivId, onWechsel) {
  const leiste = h('div', { class: 'tabs', role: 'tablist' });
  const inhalt = h('div', { role: 'tabpanel' });
  const knoepfe = new Map();
  const wechsle = (id) => {
    for (const [tid, b] of knoepfe) b.setAttribute('aria-selected', String(tid === id));
    leere(inhalt);
    const t = liste.find(x => x.id === id) || liste[0];
    inhalt.setAttribute('aria-labelledby', 'tab-' + t.id);
    t.render(inhalt);
    onWechsel && onWechsel(t.id);
  };
  for (const t of liste) {
    const b = h('button', { type: 'button', role: 'tab', id: 'tab-' + t.id, 'aria-selected': 'false', onclick: () => wechsle(t.id) }, t.label);
    b.addEventListener('keydown', (e) => {
      const i = liste.indexOf(t);
      if (e.key === 'ArrowRight') { e.preventDefault(); const n = liste[(i + 1) % liste.length]; knoepfe.get(n.id).focus(); wechsle(n.id); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); const n = liste[(i - 1 + liste.length) % liste.length]; knoepfe.get(n.id).focus(); wechsle(n.id); }
    });
    knoepfe.set(t.id, b);
    leiste.append(b);
  }
  wechsle(aktivId && liste.some(x => x.id === aktivId) ? aktivId : liste[0].id);
  return { element: h('div', null, leiste, inhalt), wechsle };
}

/** Countdown-Timer. Startzeit wird im Lernstand gespeichert (übersteht Reload). */
export function timer(schluessel, minuten, { onAblauf } = {}) {
  const anzeige = h('span', { class: 'timer', 'aria-live': 'off' }, fmt(minuten * 60));
  const knopf = h('button', { type: 'button', class: 'btn klein sekundaer' }, 'Timer starten');
  const reset = h('button', { type: 'button', class: 'btn klein leise' }, 'Zurücksetzen');
  let iv = null, abgelaufen = false;
  const zustand = () => store.get().entwuerfe['timer:' + schluessel];
  const tick = () => {
    const z = zustand();
    if (!z || !z.text) { anzeige.textContent = fmt(minuten * 60); return; }
    const rest = Math.round(minuten * 60 - (Date.now() - Number(z.text)) / 1000);
    anzeige.textContent = rest >= 0 ? fmt(rest) : '−' + fmt(-rest);
    anzeige.classList.toggle('knapp', rest < 5 * 60);
    if (rest <= 0 && !abgelaufen) { abgelaufen = true; toast('Die Zeit ist abgelaufen.'); onAblauf && onAblauf(); }
  };
  const starte = () => {
    if (!zustand()?.text) store.setzeEntwurf('timer:' + schluessel, String(Date.now()));
    knopf.textContent = 'Läuft';
    knopf.disabled = true;
    clearInterval(iv); iv = setInterval(tick, 1000); tick();
  };
  knopf.addEventListener('click', starte);
  reset.addEventListener('click', () => { store.setzeEntwurf('timer:' + schluessel, ''); abgelaufen = false; clearInterval(iv); knopf.disabled = false; knopf.textContent = 'Timer starten'; tick(); });
  if (zustand()?.text) starte();
  const el = h('div', { class: 'zeile' }, h('span', { 'aria-hidden': 'true' }, '⏱'), anzeige, knopf, reset);
  return { element: el, stop: () => clearInterval(iv), starte, restSekunden: () => { const z = zustand(); return z?.text ? Math.round(minuten * 60 - (Date.now() - Number(z.text)) / 1000) : minuten * 60; } };
}

export function fmt(sek) {
  const s = Math.max(0, Math.floor(sek));
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Sortierliste (touch-tauglich über Auf/Ab-Knöpfe + Tastatur Alt+↑/↓).
 * @returns {{element, reihenfolge(): string[], markiere(richtige: string[])}}
 */
export function sortierListe(elemente, beschriftung = 'Reihenfolge') {
  let liste = [...elemente];
  const ul = h('ol', { class: 'sortierliste', 'aria-label': beschriftung });
  const live = h('p', { class: 'sr', 'aria-live': 'polite' });
  const zeichne = (fokusIndex) => {
    leere(ul);
    liste.forEach((t, i) => {
      const hoch = h('button', { type: 'button', class: 'btn klein leise', 'aria-label': `„${t}“ nach oben`, disabled: i === 0, onclick: () => schiebe(i, -1) }, '↑');
      const runter = h('button', { type: 'button', class: 'btn klein leise', 'aria-label': `„${t}“ nach unten`, disabled: i === liste.length - 1, onclick: () => schiebe(i, 1) }, '↓');
      const li = h('li', { tabindex: '0', dataset: { text: t } }, h('span', { class: 'leise', 'aria-hidden': 'true' }, (i + 1) + '.'), h('span', { class: 'txt' }, t), h('span', { class: 'pfeile' }, hoch, runter));
      li.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); schiebe(i, -1); } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); schiebe(i, 1); } });
      ul.append(li);
    });
    if (fokusIndex !== undefined) ul.children[fokusIndex]?.focus();
  };
  const schiebe = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    live.textContent = `„${liste[j]}“ ist jetzt an Position ${j + 1}.`;
    zeichne(j);
  };
  zeichne();
  return {
    element: h('div', null, h('p', { class: 'klein leise' }, 'Mit ↑/↓ verschieben (Tastatur: Alt + Pfeiltaste).'), ul, live),
    reihenfolge: () => [...liste],
    markiere: (richtig) => { [...ul.children].forEach((li, i) => { const ok = richtig[i] === liste[i]; li.classList.toggle('ok', ok); li.classList.toggle('falsch', !ok); const s = li.querySelector('.leise'); s.textContent = (ok ? '✓ ' : '✗ ') + (i + 1) + '.'; }); }
  };
}

/** Textfeld mit Autosave (alle 3 s und beim Verlassen) und Wortzähler. */
export function autosaveEditor(schluessel, { platzhalter = '', klasse = '', label = 'Antwort', zeilen } = {}) {
  const ta = h('textarea', { class: klasse, placeholder: platzhalter, 'aria-label': label, spellcheck: 'true', rows: zeilen || undefined });
  ta.value = store.entwurf(schluessel);
  const info = h('span', { class: 'klein leise', 'aria-live': 'off' });
  let geaendert = false, iv;
  const zaehle = () => { info.textContent = `${woerter(ta.value)} Wörter${geaendert ? ' · ungespeichert' : ' · gespeichert'}`; };
  const sichern = () => { if (geaendert) { store.setzeEntwurf(schluessel, ta.value); store.speichereJetzt(); geaendert = false; zaehle(); } };
  ta.addEventListener('input', () => { geaendert = true; zaehle(); });
  ta.addEventListener('blur', sichern);
  iv = setInterval(sichern, 3000);
  window.addEventListener('pagehide', sichern);
  zaehle();
  const einfuegen = (text) => {
    const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    ta.focus();
    const pos = s + text.length;
    ta.setSelectionRange(pos, pos);
    geaendert = true; zaehle();
  };
  return { textarea: ta, info, wert: () => ta.value, einfuegen, sichern, stop: () => { sichern(); clearInterval(iv); window.removeEventListener('pagehide', sichern); } };
}

/** Gestufte Tipps: Knopf zeigt nacheinander Tipp 1, 2, 3. */
export function gestufteTipps(tipps) {
  const liste = h('ol', { class: 'klein' });
  let n = 0;
  const knopf = h('button', { type: 'button', class: 'btn klein leise' }, `Tipp 1 von ${tipps.length}`);
  knopf.addEventListener('click', () => {
    if (n >= tipps.length) return;
    liste.append(h('li', null, md(tipps[n])));
    n++;
    knopf.textContent = n < tipps.length ? `Tipp ${n + 1} von ${tipps.length}` : 'Alle Tipps gezeigt';
    knopf.disabled = n >= tipps.length;
  });
  return h('div', null, knopf, liste);
}

/** Selbstbewertung richtig/teilweise/falsch (Tasten 1–3). */
export function selbstbewertung(onWahl) {
  const mk = (art, text, taste) => h('button', { type: 'button', class: 'btn ' + (art === 'richtig' ? '' : 'sekundaer'), onclick: () => onWahl(art), dataset: { taste } }, status(art, text), h('span', { class: 'sr' }, ` (Taste ${taste})`));
  return h('div', { class: 'btn-reihe', role: 'group', 'aria-label': 'Selbstbewertung' }, mk('richtig', 'Gewusst', '1'), mk('teilweise', 'Teilweise', '2'), mk('falsch', 'Nicht gewusst', '3'));
}

/**
 * KI-Panel: Button „KI-Korrektur“ (nur mit Key sichtbar), ruft baueRequest(apiKey, modell) auf,
 * normalisiert die Antwort und rendert sie über render(ergebnis) – nie als HTML.
 */
export function kiPanel({ titel = 'KI-Korrektur (optional)', baueRequest, normalisiere, render, hinweis }) {
  const key = store.apiKey();
  if (!key) return null;
  const ziel = h('div', { 'aria-live': 'polite' });
  const knopf = h('button', { type: 'button', class: 'btn sekundaer' }, '✨ KI-Korrektur anfordern');
  knopf.addEventListener('click', async () => {
    knopf.disabled = true;
    leere(ziel).append(h('p', null, 'Die KI korrigiert … (kann 30–90 Sekunden dauern)'));
    try {
      const req = baueRequest(store.apiKey(), store.einstellungen().kiModell);
      const { text, gekuerzt } = await sende(req);
      leere(ziel);
      if (gekuerzt) ziel.append(h('p', null, status('teil', 'Hinweis'), ' Die Antwort wurde wegen der Längenbegrenzung abgeschnitten (max_tokens).'));
      const obj = extrahiereJson(text);
      if (!obj) {
        ziel.append(h('p', null, status('falsch', 'Antwort nicht auswertbar'), ' Die KI hat kein gültiges JSON geliefert. Rohtext:'), h('pre', { class: 'ki-roh' }, schwaerze(text)));
        return;
      }
      let erg;
      try { erg = normalisiere(obj); }
      catch (e) { ziel.append(h('p', null, status('falsch', e.message)), h('pre', { class: 'ki-roh' }, schwaerze(text))); return; }
      render(ziel, erg);
    } catch (e) {
      leere(ziel).append(h('p', null, status('falsch', 'Fehler'), ' ', e instanceof KIFehler ? e.message : 'Unerwarteter Fehler bei der KI-Anfrage.'));
    } finally {
      knopf.disabled = false;
    }
  });
  return karte(h('h3', null, titel), hinweis ? h('p', { class: 'klein leise' }, hinweis) : null,
    h('p', { class: 'klein leise' }, 'Dein Text wird an die Claude-API gesendet (mit deinem Key). Die KI kann irren – die Offline-Bewertung bleibt maßgeblich.'), knopf, ziel);
}

export function themenBadges(ids, themenMap) {
  return h('span', { class: 'zeile' }, ids.map(id => h('span', { class: 'badge' + (themenMap?.get(id)?.gewicht === 'A' ? ' a' : '') }, themenMap?.get(id)?.titel || id)));
}

export function ungeprueftBadge(obj) {
  return obj && obj.geprueft === false ? h('span', { class: 'badge warn', title: 'Inhalt noch nicht fachlich zweitgeprüft' }, 'ungeprüft') : null;
}
