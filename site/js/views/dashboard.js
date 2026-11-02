// Dashboard: Countdown, Tagesplan als Gliederung, direkte Einstiege, Top-5-Schwachstellen, Fortschritt je Thema, Lernserie.
import { h, karte, status } from '../ui/dom.js';
import * as store from '../store.js';
import { alleInhalte } from '../inhalte.js';
import { themenStatistik, schwachstellen, tagesplan } from '../plan.js';
import { heute, addTage, faelligeIds, tageZwischen } from '../srs.js';
import { serieLaenge } from '../storage-core.js';

// Nur die Anzeige ist umsortiert (Karten und MC zuerst); plan.js rechnet unverändert.
const RANG = { wiederholung: 0, karten: 1, mc: 2, wissen: 3, normen: 4, schemata: 5, drill: 6, taktik: 7, klausur: 8, fall: 9, skizze: 10 };

export async function render(main) {
  const z = store.get();
  const inh = await alleInhalte();
  const tag = heute();
  const stat = themenStatistik(inh.themen, z.srs, inh.itemThema, z.versuche.faelle);
  const schwach = schwachstellen(stat, 5);
  const faellig = faelligeIds(Object.fromEntries(Object.entries(z.srs).filter(([k]) => inh.itemThema[k])), tag).length;
  const ungesehen = (praefix, liste) => liste.filter(x => !z.srs[praefix + x.id]).length;
  const bearbeitet = new Set(z.versuche.faelle.map(v => v.fallId));
  const faelleOffen = inh.faelle.filter(f => !bearbeitet.has(f.id)).sort((a, b) => {
    const prio = (f) => -Math.max(...f.themen.map(t => schwach.findIndex(s => s.id === t) >= 0 ? 5 - schwach.findIndex(s => s.id === t) : 0));
    return prio(a) - prio(b) || a.id.localeCompare(b.id);
  });
  const plan = tagesplan({
    heute: tag, klausurdatum: z.einstellungen.klausurdatum, faellig,
    ungeseheneMC: ungesehen('mc:', inh.mc), ungeseheneWissen: ungesehen('wissen:', inh.wissen), ungeseheneNormkarten: ungesehen('nk:', inh.normkarten), ungeseheneKarten: ungesehen('karte:', inh.karteikarten),
    faelleOffen, faelleAlle: inh.faelle, schwach, tagesminuten: z.einstellungen.tagesminuten
  });
  const serie = serieLaenge(z.serie, tag, addTage);

  const klausurTag = z.einstellungen.klausurdatum ? new Date(z.einstellungen.klausurdatum + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : null;
  const endspurt = plan.phase === 'endspurt';
  // Der Endspurt behält seine Reihenfolge: Dort steht die Probeklausur bewusst an ihrer Stelle.
  const ziele = endspurt ? plan.ziele : [...plan.ziele].sort((a, b) => (RANG[a.art] ?? 5) - (RANG[b.art] ?? 5));

  const gesamt = { mc: inh.mc.length, wissen: inh.wissen.length, nk: inh.normkarten.length, faelle: inh.faelle.length };
  const geuebt = { mc: gesamt.mc - ungesehen('mc:', inh.mc), wissen: gesamt.wissen - ungesehen('wissen:', inh.wissen), nk: gesamt.nk - ungesehen('nk:', inh.normkarten), faelle: bearbeitet.size };

  main.append(
    h('h1', null, ueberschrift(klausurTag, plan.tageBis)),
    endspurt ? h('h2', null, 'Endspurt: Wiederholung + Probeklausur') : null,
    klausurTag && plan.tageBis > 0 && !endspurt ? h('p', { class: 'obersatz' }, `Du könntest die Nachklausur am ${klausurTag} bestehen.`, ziele.length ? ' Dies setzt heute voraus:' : '') : null,
    !klausurTag ? h('p', null, 'Trage dein Klausurdatum ein, dann rechnet die App Tagesziele aus. ', h('a', { href: '#/einstellungen' }, 'Klausurdatum festlegen')) : null,
    ziele.length ? h('ol', { class: 'ziel-liste' }, ziele.map(zl => {
      const inhalt = [h('span', { class: 'ziel-text' }, zl.text), zl.minuten >= 1 ? h('span', { class: 'ziel-zeit' }, dauer(Math.round(zl.minuten))) : null];
      return h('li', null, zl.link ? h('a', { href: zl.link }, inhalt) : h('span', { class: 'ziel-ohne' }, inhalt));
    })) : h('p', null, 'Alles erledigt – gönn dir eine Pause oder schreibe eine Probeklausur.'),
    plan.minuten ? h('p', { class: 'klein leise' }, `Ergebnis: ca. ${dauer(plan.minuten)} von ${dauer(z.einstellungen.tagesminuten)} Lernzeit. Die Lernzeit änderst du in den Einstellungen.`) : null,
    karte(h('h2', null, 'Direkt lernen'),
      h('ul', { class: 'einstiege' },
        einstieg('#/karteikarten', 'Karteikarten', `${ungesehen('karte:', inh.karteikarten)} neu`),
        einstieg('#/cheatsheets', 'Cheatsheets', 'Ansprüche, Schemata, Fristen'),
        einstieg('#/uebersicht', 'Fälle kompakt', `${gesamt.faelle} Fälle, Prüfungspfade`),
        einstieg('#/mc', 'Datenschutz-MC', `${ungesehen('mc:', inh.mc)} neu von ${gesamt.mc}`))),
    h('div', { class: 'stand' },
      h('span', null, `Lernserie: ${serie} ${serie === 1 ? 'Tag' : 'Tage'}`),
      h('span', null, `Heute fällig: ${faellig}`),
      h('a', { class: 'btn klein sekundaer', href: '#/wiederholen' }, 'Wiederholen')),
    h('div', { class: 'raster zwei' },
      karte(h('h2', null, 'Top-5-Schwachstellen'),
        h('ol', { class: 'themenliste' }, schwach.map(s => h('li', null, h('span', { class: 'ampel ' + s.ampel, 'aria-hidden': 'true' }), h('span', null, s.titel, ' ', h('span', { class: 'badge' + gewichtKlasse(s.gewicht) }, s.gewicht)), h('span', { class: 'q' }, s.quote === null ? 'neu' : `${Math.round(s.quote * 100)} %`)))),
        h('a', { class: 'btn klein sekundaer', href: '#/schwachstellen' }, 'Zu den Drills')),
      karte(h('h2', null, 'Fortschritt'),
        h('ul', { class: 'themenliste' },
          h('li', null, 'Fälle bearbeitet', h('span', { class: 'q' }, `${geuebt.faelle} / ${gesamt.faelle}`)),
          h('li', null, 'Datenschutz-Fragen gesehen', h('span', { class: 'q' }, `${geuebt.mc} / ${gesamt.mc}`)),
          h('li', null, 'Wissensfragen gesehen', h('span', { class: 'q' }, `${geuebt.wissen} / ${gesamt.wissen}`)),
          h('li', null, 'Normkarten gesehen', h('span', { class: 'q' }, `${geuebt.nk} / ${gesamt.nk}`)),
          h('li', null, 'Probeklausuren geschrieben', h('span', { class: 'q' }, String(z.versuche.klausuren.length)))),
        h('a', { class: 'btn klein leise', href: '#/statistik' }, 'Statistik je Thema'))),
    h('details', { class: 'klappe' }, h('summary', null, 'Fortschritt je Thema'),
      h('p', { class: 'klein leise' }, 'Ampel: ', status('ok', 'ab 80 %'), ' ', status('teil', '55–79 %'), ' ', status('falsch', 'unter 55 %'), ' Leerer Kreis: noch nicht geübt.'),
      ['recht', 'datenschutz'].map(b => h('div', null, h('h3', null, b === 'recht' ? 'Recht (BGB)' : 'Datenschutz'),
        h('ul', { class: 'themenliste' }, inh.themen.filter(t => t.bereich === b).map(t => {
          const s = stat[t.id];
          return h('li', null, h('span', { class: 'ampel ' + s.ampel, role: 'img', 'aria-label': ampelText(s.ampel) }), h('span', null, t.titel, ' ', h('span', { class: 'badge' + gewichtKlasse(t.gewicht) }, t.gewicht)), h('span', { class: 'q' }, s.quote === null ? '–' : `${Math.round(s.quote * 100)} %`));
        }))))),
    h('h2', null, 'Weitere Bereiche'),
    h('div', { class: 'raster zwei' },
      kachel('#/schemata', 'Prüfungsschemata', 'Aufklappbar, Puzzle, Lückenschema'),
      kachel('#/wissen', 'Wissensfragen', 'Klausurstil mit Kernpunkt-Check'),
      kachel('#/normen', 'Normen-Kompass', 'Normkarten, Zitier-Trainer, Register'),
      kachel('#/klausur', 'Probeklausur', 'Komplette Klausur mit Timer und Note'),
      kachel('#/faelle', 'Gutachten-Trainer', 'Fälle im Gutachtenstil: geführt, Klausurmodus, Skizze'),
      kachel('#/mehr', 'Mehr', 'Schwachstellen, Statistik, Einstellungen'))
  );
}

function ueberschrift(klausurTag, tageBis) {
  if (!klausurTag) return 'Dein Lernstand';
  if (tageBis > 1) return `Noch ${tageBis} Tage`;
  if (tageBis === 1) return 'Noch 1 Tag';
  return tageBis === 0 ? 'Heute! Viel Erfolg 🍀' : 'Dein Lernstand';
}
function gewichtKlasse(g) { return g === 'A' ? ' a' : g === 'B' ? ' b' : ''; }
function ampelText(a) { return { gruen: 'gut', gelb: 'mittel', rot: 'schwach', grau: 'nicht geübt' }[a]; }
function einstieg(href, titel, text) { return h('li', null, h('a', { href }, h('strong', null, titel), h('span', null, text))); }
function kachel(href, titel, text) { return h('a', { class: 'karte kachel', href }, h('h3', null, titel), h('p', { class: 'klein leise' }, text)); }

function dauer(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} Std. ${m} min` : `${h} Std.`;
}
