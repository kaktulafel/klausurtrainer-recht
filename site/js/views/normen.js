// Normen-Kompass: Register (Suche, Detail mit amtlichem Wortlaut), Normkarten (Problem → Norm / Norm → Wofür),
// Zitier-Trainer und Gliederung „Wo steht was?“.
import { h, leere, karte, status, inline, md, normRegister, wortlautLaden, toast } from '../ui/dom.js';
import { selbstbewertung } from '../ui/widgets.js';
import { lade, ladeKategorie } from '../data.js';
import * as store from '../store.js';
import { parseEine, registerId, vergleicheZitat } from '../normparser.js';
import { mische } from '../grading.js';
import { heute, istFaellig } from '../srs.js';

export async function render(main, { pfad, query }) {
  const unter = pfad[1] || '';
  if (unter === 'register') return pfad[2] ? registerDetail(main, pfad[2]) : registerListe(main, query);
  if (unter === 'karten') return karten(main, query);
  if (unter === 'zitieren') return zitieren(main);
  if (unter === 'gliederung') return gliederung(main, query);
  return uebersicht(main);
}

function uebersicht(main) {
  const srs = store.get().srs;
  const anzFaellig = Object.entries(srs).filter(([k, v]) => k.startsWith('nk:') && istFaellig(v, heute())).length;
  const kachel = (href, titel, text) => h('a', { class: 'karte kachel', href }, h('h3', null, titel), h('p', { class: 'klein leise' }, text));
  main.append(h('h1', null, 'Normen-Kompass'),
    h('p', { class: 'leise lese' }, 'Gesetz ist in der Klausur erlaubt – entscheidend ist, die richtige Norm schnell zu finden und präzise zu zitieren (Absatz, Satz, Nummer, Alternative/Buchstabe).'),
    h('div', { class: 'raster zwei' },
      kachel('#/normen/karten', 'Normkarten: Problem → Norm', `Stichwort sehen, Norm nennen. ${anzFaellig} heute fällig.`),
      kachel('#/normen/karten?richtung=rueck', 'Normkarten: Norm → Wofür?', 'Norm sehen, Funktion nennen.'),
      kachel('#/normen/zitieren', 'Zitier-Trainer', 'Exakt zitieren: § 119 Abs. 1 Alt. 2 BGB, Art. 6 Abs. 1 lit. f DSGVO …'),
      kachel('#/normen/register', 'Normenregister', 'Alle Stoff-Normen mit amtlicher Überschrift, Wortlaut und Fundort.'),
      kachel('#/normen/gliederung', 'Wo steht was?', 'Gliederung von BGB und DSGVO als Blättertipp.')),
    karte(h('h2', null, 'Zitierregeln (Kurzfassung)'), md(`- Paragraph mit **§**, mehrere mit **§§**: „§§ 119, 123 BGB“.
- Absatz **Abs.**, Satz **S.**, Nummer **Nr.**, Alternative **Alt.** (Folie: „Fall“), Buchstabe **lit.** (DSGVO).
- Reihenfolge: § 119 Abs. 1 Alt. 2 BGB · § 179 Abs. 3 S. 2 BGB · Art. 6 Abs. 1 lit. f DSGVO · § 311 Abs. 2 Nr. 1 BGB.
- Kombinationen mit „i. V. m.“: § 280 Abs. 1 i. V. m. § 311 Abs. 2 i. V. m. § 241 Abs. 2 BGB.
- Gesetz immer nennen – besonders beim Wechsel zwischen BGB, DSGVO und BDSG.`, { lese: true })));
}

// ---------- Register ----------
async function registerListe(main, query) {
  const reg = [...(await normRegister()).values()];
  const suche = h('input', { type: 'search', placeholder: 'Suche: Nummer, Stichwort, Überschrift …', 'aria-label': 'Normen durchsuchen', value: query.q || '' });
  const filter = h('select', { 'aria-label': 'Gesetz filtern' }, h('option', { value: '' }, 'Alle Gesetze'), [...new Set(reg.map(n => n.gesetz))].map(g => h('option', { value: g }, g)));
  const liste = h('div');
  const zeichne = () => {
    const q = suche.value.trim().toLowerCase();
    const p = q ? parseEine(q.startsWith('§') || q.startsWith('art') ? q : (/^\d/.test(q) ? '§ ' + q : q)) : null;
    const treffer = reg.filter(n => (!filter.value || n.gesetz === filter.value) && (!q || (p && registerId(p) === n.id) || `${n.zitat} ${n.ueberschrift} ${n.kurz}`.toLowerCase().includes(q)));
    leere(liste).append(h('p', { class: 'klein leise' }, `${treffer.length} Normen`),
      ...treffer.slice(0, 300).map(n => h('a', { class: 'karte kachel', href: '#/normen/register/' + n.id },
        h('h3', null, n.zitat, ' – ', n.ueberschrift), h('p', { class: 'klein' }, n.kurz), h('p', { class: 'klein leise' }, n.lage))));
  };
  suche.addEventListener('input', zeichne); filter.addEventListener('change', zeichne);
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/normen' }, '← Normen-Kompass')), h('h1', null, 'Normenregister'), h('div', { class: 'suchfeld' }, suche, filter), liste);
  zeichne();
  suche.focus();
}

async function registerDetail(main, id) {
  const reg = await normRegister();
  const n = reg.get(id);
  if (!n) { main.append(karte(h('h1', null, 'Norm nicht im Register'), h('a', { href: '#/normen/register' }, 'Zum Register'))); return; }
  const wl = h('div', { class: 'wortlaut lese' }, 'Lädt …');
  const { daten: karten } = await ladeKategorie('normkarten').catch(() => ({ daten: [] }));
  const passende = karten.filter(k => { const p = parseEine(k.norm); return p && registerId(p) === id; });
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/normen/register' }, '← Register')),
    h('h1', null, n.zitat, h('br'), h('small', { class: 'leise' }, n.ueberschrift)),
    karte(h('p', { class: 'lese' }, n.kurz), h('p', { class: 'klein' }, h('strong', null, 'Fundort (Blättertipp): '), n.lage),
      h('p', { class: 'klein' }, h('a', { href: n.link, target: '_blank', rel: 'noopener noreferrer' }, 'Amtlicher Text online ↗'), n.geprueftAm ? ` · Wortlaut übernommen am ${n.geprueftAm} (${n.quelleWortlaut})` : '')),
    karte(h('h2', null, 'Amtlicher Wortlaut'), wl),
    passende.length ? karte(h('h2', null, 'Typische Probleme'), h('ul', null, passende.map(k => h('li', null, inline(k.problem), ' → ', h('strong', null, k.norm))))) : null);
  wl.textContent = await wortlautLaden(n);
}

// ---------- Karten ----------
async function karten(main, query) {
  const { daten } = await ladeKategorie('normkarten');
  const rueck = query.richtung === 'rueck';
  const srs = store.get().srs;
  let stapel = daten.filter(k => !query.thema || k.thema === query.thema);
  const faellig = stapel.filter(k => istFaellig(srs['nk:' + k.id], heute()));
  const neu = stapel.filter(k => !srs['nk:' + k.id]);
  stapel = query.alle ? mische(stapel) : [...mische(faellig), ...mische(neu).slice(0, 20)];
  if (!stapel.length) stapel = mische(daten).slice(0, 20);
  let i = 0;
  const buehne = h('div');
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/normen' }, '← Normen-Kompass')),
    h('h1', null, rueck ? 'Norm → Wofür?' : 'Problem → Norm'),
    h('p', { class: 'leise klein' }, `${faellig.length} fällig · ${neu.length} neu · Leertaste dreht die Karte, 1/2/3 bewertet.`), buehne);
  let tastatur;
  const zeige = () => {
    if (i >= stapel.length) { leere(buehne).append(karte(h('h2', null, 'Fertig für heute ✓'), h('div', { class: 'btn-reihe' }, h('a', { class: 'btn', href: '#/normen/karten?alle=1' + (rueck ? '&richtung=rueck' : '') }, 'Alle Karten üben'), h('a', { class: 'btn sekundaer', href: '#/normen' }, 'Zurück')))); return; }
    const k = stapel[i];
    let umgedreht = false;
    const eingabe = rueck ? null : h('input', { type: 'text', placeholder: 'Norm eingeben (optional), z. B. § 110 BGB', 'aria-label': 'Deine Norm' });
    const rueckseite = h('div', { class: 'rueck', hidden: true });
    const vorne = rueck ? h('p', { class: 'gross' }, inline(k.norm)) : h('p', { class: 'lese' }, inline(k.problem));
    const drehen = () => {
      if (umgedreht) return;
      umgedreht = true;
      const teile = [];
      if (rueck) teile.push(h('p', { class: 'lese' }, h('strong', null, 'Problem: '), inline(k.problem)));
      else {
        teile.push(h('p', { class: 'gross' }, inline(k.norm)));
        if (eingabe && eingabe.value.trim()) {
          const v = vergleicheZitat(k.norm, eingabe.value);
          teile.push(h('p', null, status(v.art, v.text)));
        }
      }
      teile.push(h('p', { class: 'klein' }, inline(k.erklaerung)));
      rueckseite.append(...teile);
      rueckseite.hidden = false;
      knopf.hidden = true;
      bewertung.hidden = false;
      bewertung.querySelector('button')?.focus();
    };
    const knopf = h('button', { type: 'button', class: 'btn', onclick: drehen }, 'Umdrehen (Leertaste)');
    const bewertung = selbstbewertung((art) => { store.srsBewertung('nk:' + k.id, art); i++; zeige(); });
    bewertung.hidden = true;
    leere(buehne).append(karte(h('p', { class: 'klein leise' }, `Karte ${i + 1} von ${stapel.length}`), vorne, eingabe, knopf, rueckseite, bewertung));
    if (eingabe) { eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); drehen(); } }); eingabe.focus(); }
    document.removeEventListener('keydown', tastatur);
    tastatur = (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === ' ' && !umgedreht) { e.preventDefault(); drehen(); }
      else if (umgedreht && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); bewertung.querySelectorAll('button')[+e.key - 1].click(); }
    };
    document.addEventListener('keydown', tastatur);
  };
  zeige();
  return () => document.removeEventListener('keydown', tastatur);
}


// ---------- Zitier-Trainer ----------
async function zitieren(main) {
  const { daten } = await ladeKategorie('normkarten');
  const genau = mische(daten.filter(k => { const p = parseEine(k.norm); return p && ['abs', 'satz', 'nummer', 'lit', 'alt'].some(f => p[f] !== undefined); })).slice(0, 15);
  let i = 0, richtig = 0;
  const buehne = h('div');
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/normen' }, '← Normen-Kompass')), h('h1', null, 'Zitier-Trainer'),
    h('p', { class: 'leise lese' }, 'Zitiere so genau wie möglich – mit Absatz, Satz, Nummer, Alternative bzw. lit. Nutze das Gesetz (Register-Link nach der Antwort).'), buehne);
  const zeige = () => {
    if (i >= genau.length) { leere(buehne).append(karte(h('p', { class: 'gross' }, `${richtig} / ${genau.length} exakt`), h('a', { class: 'btn', href: '#/normen/zitieren' }, 'Neue Runde'))); return; }
    const k = genau[i];
    const inp = h('input', { type: 'text', 'aria-label': 'Zitat', placeholder: 'z. B. § 119 Abs. 1 Alt. 2 BGB' });
    const ziel = h('div', { 'aria-live': 'polite' });
    const weiter = h('button', { type: 'button', class: 'btn', hidden: true, onclick: () => { i++; zeige(); } }, 'Weiter');
    const pruef = h('button', { type: 'button', class: 'btn', onclick: () => {
      const v = vergleicheZitat(k.norm, inp.value);
      if (v.ok) richtig++;
      store.srsBewertung('zitat:' + k.id, v.art === 'ok' ? 'richtig' : v.art === 'teil' ? 'teilweise' : 'falsch');
      leere(ziel).append(h('p', null, status(v.art, v.text)), h('p', null, 'Lösung: ', h('strong', null, inline(k.norm))), h('p', { class: 'klein leise' }, inline(k.erklaerung)));
      pruef.hidden = true; weiter.hidden = false; weiter.focus();
    } }, 'Prüfen');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (pruef.hidden ? weiter : pruef).click(); } });
    leere(buehne).append(karte(h('p', { class: 'klein leise' }, `Aufgabe ${i + 1} von ${genau.length}`), h('p', { class: 'lese' }, inline(k.problem)), inp, h('div', { class: 'btn-reihe' }, pruef, weiter), ziel));
    inp.focus();
  };
  zeige();
}

// ---------- Gliederung ----------
async function gliederung(main, query) {
  const reg = [...(await normRegister()).values()];
  const gesetze = [...new Set(reg.map(n => n.gesetz))];
  const g = query.gesetz || 'BGB';
  const baum = new Map();
  for (const n of reg.filter(x => x.gesetz === g)) {
    const teile = n.lage.split(' › ').slice(1);
    let knoten = baum;
    for (const t of teile) { if (!knoten.has(t)) knoten.set(t, new Map()); knoten = knoten.get(t); }
    (knoten.normen ||= []).push(n);
  }
  const zeichne = (map, tiefe) => [...map.entries()].map(([titel, kind]) => h('details', { class: 'knoten', open: tiefe < 1 },
    h('summary', null, titel),
    ...(kind.normen || []).map(n => h('div', { class: 'knoten-blatt' }, h('a', { href: '#/normen/register/' + n.id }, n.zitat), ' – ', n.ueberschrift)),
    ...zeichne(kind, tiefe + 1)));
  main.append(h('p', { class: 'klein' }, h('a', { href: '#/normen' }, '← Normen-Kompass')), h('h1', null, 'Wo steht was?'),
    h('div', { class: 'btn-reihe' }, gesetze.map(x => h('a', { class: 'btn klein ' + (x === g ? '' : 'leise'), href: '#/normen/gliederung?gesetz=' + encodeURIComponent(x) }, x))),
    g === 'BGB' ? karte(md(`**Aufbau des BGB (5 Bücher):** 1. Allgemeiner Teil (§§ 1–240) · 2. Schuldrecht (§§ 241–853; Allgemeiner und Besonderer Teil) · 3. Sachenrecht (§§ 854–1296) · 4. Familienrecht (§§ 1297–1921) · 5. Erbrecht (§§ 1922–2385).`)) : null,
    karte(...zeichne(baum, 0)));
}
