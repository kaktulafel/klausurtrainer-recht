// Hash-Router: "#/faelle/fall-03?modus=klausur" → { pfad: ['faelle','fall-03'], query: {modus:'klausur'} }

export function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  const [pfadTeil, queryTeil = ''] = h.split('?');
  const pfad = pfadTeil.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } });
  const query = {};
  for (const p of queryTeil.split('&').filter(Boolean)) {
    const [k, v = ''] = p.split('=');
    try { query[decodeURIComponent(k)] = decodeURIComponent(v); } catch { query[k] = v; }
  }
  return { pfad, query };
}

let routen = {};
let aufraeumen = null;

/** routen: { start: fn, faelle: fn, … } – Schlüssel = erstes Pfadsegment ('' → start). */
export function starte(r, rendern) {
  routen = r;
  const los = async () => {
    const { pfad, query } = parseHash(location.hash);
    const name = pfad[0] || 'start';
    if (typeof aufraeumen === 'function') { try { aufraeumen(); } catch { /* ignore */ } }
    aufraeumen = null;
    markiereNav(name);
    const view = routen[name] || routen['404'];
    aufraeumen = await rendern(view, { pfad, query, name });
  };
  window.addEventListener('hashchange', los);
  return los();
}

export function markiereNav(name) {
  const gruppe = { wiederholen: 'start', statistik: 'start', einstellungen: 'mehr', info: 'mehr', schemata: 'mehr', wissen: 'mehr', klausur: 'mehr', schwachstellen: 'mehr' };
  document.querySelectorAll('[data-nav]').forEach(a => {
    const n = a.getAttribute('data-nav');
    const aktiv = n === name || (a.closest('.unten-nav') && gruppe[name] === n);
    if (aktiv) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

export function geh(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; }
