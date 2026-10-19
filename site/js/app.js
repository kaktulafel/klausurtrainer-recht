// Einstieg: Fehler-Handler, Lernstand, Theme, Service Worker, Router.
import * as store from './store.js';
import { starte } from './router.js';
import { h, leere, karte, initNormPopover, toast } from './ui/dom.js';

const main = document.getElementById('main');
const VERSION = document.querySelector('meta[name="app-version"]')?.content || 'dev';
const IST_DEV = VERSION === '__APP_VERSION__' || ['localhost', '127.0.0.1', ''].includes(location.hostname);

// ---------- Notfall-Schalter ?reset-sw ----------
if (new URLSearchParams(location.search).has('reset-sw')) {
  resetSW().finally(() => { location.replace(location.pathname + location.hash); });
}

async function resetSW() {
  try {
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    if ('caches' in window) for (const k of await caches.keys()) if (k.startsWith('nk-recht-')) await caches.delete(k);
  } catch { /* ignore */ }
}

// ---------- Globaler Fehler-Handler: Fehlerkarte statt weißer Seite ----------
let fehlerGezeigt = false;
function zeigeFehler(err) {
  if (fehlerGezeigt) return;
  fehlerGezeigt = true;
  const msg = String((err && (err.message || err.reason?.message)) || err || 'Unbekannter Fehler').replace(/sk-ant-[A-Za-z0-9_\-]+/g, 'sk-ant-***');
  leere(main).append(karte(
    h('h1', null, 'Da ist etwas schiefgelaufen'),
    h('p', null, 'Dein Lernstand ist nicht verloren. Du kannst neu laden, den Lernstand sichern oder den Cache zurücksetzen.'),
    h('div', { class: 'btn-reihe' },
      h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Neu laden'),
      h('button', { class: 'btn sekundaer', type: 'button', onclick: exportNotfall }, 'Lernstand exportieren'),
      h('button', { class: 'btn leise', type: 'button', onclick: () => resetSW().then(() => location.reload()) }, 'Cache zurücksetzen')),
    h('details', null, h('summary', null, 'Technische Details'), h('pre', null, msg))
  ));
  main.querySelector('.karte').classList.add('fehlerkarte');
}
function exportNotfall() {
  try {
    const blob = new Blob([store.exportText()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'lernstand-nk-recht.json' });
    document.body.append(a); a.click(); a.remove();
  } catch { toast('Export nicht möglich.'); }
}
window.addEventListener('error', (e) => { if (e.error || e.message) zeigeFehler(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => zeigeFehler(e.reason));

// ---------- Theme ----------
function wendeThemeAn(t) {
  const root = document.documentElement;
  if (t === 'hell') root.setAttribute('data-theme', 'light');
  else if (t === 'dunkel') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}
document.getElementById('theme-btn')?.addEventListener('click', () => {
  const dunkelAktiv = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  const neu = dunkelAktiv ? 'hell' : 'dunkel';
  store.update(z => { z.einstellungen.theme = neu; });
  wendeThemeAn(neu);
});

// ---------- Service Worker ----------
function registriereSW() {
  if (IST_DEV || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const zeigeUpdate = () => {
      const b = document.getElementById('update-banner');
      b.hidden = false;
      document.getElementById('update-btn').onclick = () => {
        store.speichereJetzt();
        if (reg.waiting) reg.waiting.postMessage({ typ: 'skipWaiting' });
        else location.reload();
      };
    };
    if (reg.waiting && navigator.serviceWorker.controller) zeigeUpdate();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) zeigeUpdate(); });
    });
    // regelmäßig nach Updates suchen
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(() => {});
  // Neu laden nur bei einem Update (es gab schon einen Controller) – nicht beim allerersten Besuch,
  // wenn der frisch installierte SW per clients.claim() die Seite übernimmt.
  const hatteController = !!navigator.serviceWorker.controller;
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatteController && !neuGeladen) { neuGeladen = true; location.reload(); } });
}

// ---------- Views (lazy) ----------
const VIEWS = {
  start: 'dashboard', faelle: 'faelle', mc: 'mc', normen: 'normen', schemata: 'schemata', wissen: 'wissen',
  klausur: 'klausur', schwachstellen: 'schwachstellen', wiederholen: 'wiederholen', statistik: 'statistik',
  einstellungen: 'einstellungen', mehr: 'mehr', info: 'info', '404': 'nichtgefunden'
};
const routen = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v]));

async function rendern(viewName, ctx) {
  leere(main);
  main.append(h('p', { class: 'laden' }, 'Lädt …'));
  let mod;
  try { mod = await import(`./views/${viewName}.js`); }
  catch (e) {
    leere(main).append(karte(h('h1', null, 'Modul nicht verfügbar'), h('p', null, 'Dieser Bereich konnte nicht geladen werden (offline?). Andere Bereiche funktionieren weiter.'), h('a', { class: 'btn', href: '#/' }, 'Zur Startseite')));
    return null;
  }
  leere(main);
  window.scrollTo(0, 0);
  try {
    const cleanup = await mod.render(main, ctx);
    if (!ctx.query.nofocus) main.focus({ preventScroll: true });
    return cleanup;
  } catch (e) {
    if (e && e.name === 'DatenFehler' || (e && /Datendatei|Keine Daten/.test(e.message))) {
      leere(main).append(karte(h('h1', null, 'Daten fehlen'), h('p', null, e.message), h('a', { class: 'btn', href: '#/' }, 'Zur Startseite')));
      return null;
    }
    throw e;
  }
}

// ---------- Start ----------
document.getElementById('app-version').textContent = IST_DEV ? 'lokal' : VERSION;
const { meldung } = store.init();
wendeThemeAn(store.einstellungen().theme);
if (meldung) {
  const b = document.getElementById('hinweis-banner');
  b.textContent = meldung; b.hidden = false;
}
initNormPopover();
registriereSW();
starte(routen, rendern);
