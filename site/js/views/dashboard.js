// Dashboard: Countdown, Tagesplan, Fortschritt je Thema (Ampel), Top-5-Schwachstellen, Lernserie.
import { h, karte, status } from '../ui/dom.js';
import * as store from '../store.js';
import { alleInhalte } from '../inhalte.js';
import { themenStatistik, schwachstellen, tagesplan } from '../plan.js';
import { heute, addTage, faelligeIds, tageZwischen } from '../srs.js';
import { serieLaenge } from '../storage-core.js';

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
    ungeseheneMC: ungesehen('mc:', inh.mc), ungeseheneWissen: ungesehen('wissen:', inh.wissen), ungeseheneNormkarten: ungesehen('nk:', inh.normkarten),
    faelleOffen, schwach, tagesminuten: z.einstellungen.tagesminuten
  });
  const serie = serieLaenge(z.serie, tag, addTage);

  const countdown = z.einstellungen.klausurdatum
    ? karte(h('p', { class: 'klein leise' }, 'Bis zur Nachklausur'), h('p', { class: 'gross' }, plan.tageBis > 0 ? `${plan.tageBis} Tage` : plan.tageBis === 0 ? 'Heute! Viel Erfolg 🍀' : 'vorbei'),
        h('p', { class: 'klein' }, new Date(z.einstellungen.klausurdatum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))
    : karte(h('p', null, 'Trage dein Klausurdatum ein – dann rechnet die App Tagesziele aus.'), h('a', { class: 'btn', href: '#/einstellungen' }, 'Klausurdatum festlegen'));

  const gesamt = { mc: inh.mc.length, wissen: inh.wissen.length, nk: inh.normkarten.length, faelle: inh.faelle.length };
  const geuebt = { mc: gesamt.mc - ungesehen('mc:', inh.mc), wissen: gesamt.wissen - ungesehen('wissen:', inh.wissen), nk: gesamt.nk - ungesehen('nk:', inh.normkarten), faelle: bearbeitet.size };

  main.append(
    h('h1', null, 'Dein Lernstand'),
    h('div', { class: 'raster drei' },
      countdown,
      karte(h('p', { class: 'klein leise' }, 'Lernserie'), h('p', { class: 'gross' }, `${serie} ${serie === 1 ? 'Tag' : 'Tage'}`), h('p', { class: 'klein' }, serie ? 'Dranbleiben!' : 'Heute starten – jeder Tag zählt.')),
      karte(h('p', { class: 'klein leise' }, 'Heute fällig'), h('p', { class: 'gross' }, String(faellig)), h('a', { class: 'btn klein', href: '#/wiederholen' }, 'Wiederholen'))),
    karte(h('h2', null, plan.phase === 'endspurt' ? 'Endspurt: Wiederholung + Probeklausur' : 'Tagesplan'),
      plan.ziele.length ? h('ul', { class: 'ziel-liste' }, plan.ziele.map(zl => h('li', null, zl.link ? h('a', { href: zl.link }, zl.text) : h('span', null, zl.text)))) : h('p', null, 'Alles erledigt – gönn dir eine Pause oder schreibe eine Probeklausur.')),
    h('div', { class: 'raster zwei' },
      karte(h('h2', null, 'Top-5-Schwachstellen'),
        h('ol', { class: 'themenliste' }, schwach.map(s => h('li', null, h('span', { class: 'ampel ' + s.ampel, 'aria-hidden': 'true' }), h('span', null, s.titel, ' ', h('span', { class: 'badge' + (s.gewicht === 'A' ? ' a' : '') }, s.gewicht)), h('span', { class: 'q' }, s.quote === null ? 'noch nicht geübt' : `${Math.round(s.quote * 100)} %`)))),
        h('a', { class: 'btn klein sekundaer', href: '#/schwachstellen' }, 'Zu den Drills')),
      karte(h('h2', null, 'Fortschritt'),
        h('ul', { class: 'themenliste' },
          h('li', null, 'Fälle bearbeitet', h('span', { class: 'q' }, `${geuebt.faelle} / ${gesamt.faelle}`)),
          h('li', null, 'Datenschutz-Fragen gesehen', h('span', { class: 'q' }, `${geuebt.mc} / ${gesamt.mc}`)),
          h('li', null, 'Wissensfragen gesehen', h('span', { class: 'q' }, `${geuebt.wissen} / ${gesamt.wissen}`)),
          h('li', null, 'Normkarten gesehen', h('span', { class: 'q' }, `${geuebt.nk} / ${gesamt.nk}`)),
          h('li', null, 'Probeklausuren geschrieben', h('span', { class: 'q' }, String(z.versuche.klausuren.length)))),
        h('a', { class: 'btn klein leise', href: '#/statistik' }, 'Statistik je Thema'))),
    karte(h('h2', null, 'Fortschritt je Thema'),
      h('p', { class: 'klein leise' }, 'Ampel: ', status('ok', '≥ 80 %'), ' ', status('teil', '55–79 %'), ' ', status('falsch', '< 55 %'), ' · grau = noch nicht geübt'),
      ['recht', 'datenschutz'].map(b => h('div', null, h('h3', null, b === 'recht' ? 'Recht (BGB)' : 'Datenschutz'),
        h('ul', { class: 'themenliste' }, inh.themen.filter(t => t.bereich === b).map(t => {
          const s = stat[t.id];
          return h('li', null, h('span', { class: 'ampel ' + s.ampel, role: 'img', 'aria-label': ampelText(s.ampel) }), h('span', null, t.titel, ' ', h('span', { class: 'badge' + (t.gewicht === 'A' ? ' a' : t.gewicht === 'B' ? ' b' : '') }, t.gewicht)), h('span', { class: 'q' }, s.quote === null ? '–' : `${Math.round(s.quote * 100)} %`));
        }))))),
    h('div', { class: 'raster drei' },
      kachel('#/faelle', 'Gutachten-Trainer', 'Fälle im Gutachtenstil – geführt, Klausurmodus, Skizze'),
      kachel('#/mc', 'Datenschutz-MC', `${gesamt.mc} Fragen, Übungs- und Prüfungsmodus`),
      kachel('#/normen', 'Normen-Kompass', 'Normkarten, Zitier-Trainer, Register'),
      kachel('#/klausur', 'Probeklausur', 'Komplette Klausur mit Timer und Note'),
      kachel('#/schemata', 'Prüfungsschemata', 'Aufklappbar, Puzzle, Lückenschema'),
      kachel('#/wissen', 'Wissensfragen', 'Klausurstil mit Kernpunkt-Check'))
  );
}

function ampelText(a) { return { gruen: 'gut', gelb: 'mittel', rot: 'schwach', grau: 'nicht geübt' }[a]; }
function kachel(href, titel, text) { return h('a', { class: 'karte kachel', href }, h('h3', null, titel), h('p', { class: 'klein leise' }, text)); }
