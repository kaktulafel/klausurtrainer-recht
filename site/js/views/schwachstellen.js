// Meine Schwachstellen: Drills zu den vier Korrekturhinweisen, Gutachtenstil kompakt, Klausurtaktik.
import { h, leere, karte, md, inline, status } from '../ui/dom.js';
import { autosaveEditor, selbstbewertung, ungeprueftBadge } from '../ui/widgets.js';
import { lade } from '../data.js';
import * as store from '../store.js';
import { kernpunktCheck, woerter, normalisiere } from '../textcheck.js';

const HINWEISE = {
  1: { titel: 'Anfechtung ist ein Gestaltungsrecht – Rechtsfolge § 142 Abs. 1 BGB', zitat: 'Obersatz „Anspruch auf rückwirkenden Entzug der Vollmacht aus § 167 BGB“ → Korrektor: „142“' },
  2: { titel: '§ 166 betrifft das Vertretergeschäft, nicht die Vollmachtserteilung', zitat: '„§ 166 bezieht sich auf die Wirksamkeit des Vertrages, angefochten wird jedoch die VM-Erteilung.“' },
  3: { titel: 'Anfechtung vollständig prüfen: Grund (mit Subsumtion), Erklärung, Frist, Ausschluss', zitat: '„Hier wäre eine Subsumtion unter 119 bzw. 123 angezeigt, + Erklärung, Frist.“' },
  4: { titel: '§ 142 Abs. 2 BGB: Kenntnis der Anfechtbarkeit → § 179 Abs. 1; § 122 nur bei §§ 118–120', zitat: '„Doch! Sie hat den Anfechtungsgrund durch ihre Täuschung ja schließlich gesetzt!“' }
};

export async function render(main, { pfad }) {
  const unter = pfad[1] || '';
  main.append(h('h1', null, 'Meine Schwachstellen'),
    h('div', { class: 'btn-reihe' }, [['', 'Drills'], ['stil', 'Gutachtenstil kompakt'], ['taktik', 'Klausurtaktik']].map(([k, v]) => h('a', { class: 'btn klein ' + (k === unter ? '' : 'leise'), href: '#/schwachstellen' + (k ? '/' + k : ''), 'aria-current': k === unter ? 'page' : null }, v))));
  if (unter === 'stil') return main.append(karte(md(STIL, { lese: true })));
  if (unter === 'taktik') return main.append(karte(md(TAKTIK, { lese: true })));
  const drills = await lade('drills.json');
  if (pfad[1] && pfad[1].startsWith('dr-')) return drill(main, drills.find(d => d.id === pfad[1]));
  const srs = store.get().srs;
  main.append(h('p', { class: 'leise lese' }, 'Aus deiner korrigierten Probeklausur (42/48): Gutachtenstil 18/18 – die Punkte gingen bei diesen vier inhaltlichen Stellen verloren. Jeder Drill trainiert genau einen Korrekturhinweis.'),
    ...[1, 2, 3, 4].map(n => karte(h('h2', null, `Korrekturhinweis ${n}: ${HINWEISE[n].titel}`), h('p', { class: 'klein leise' }, HINWEISE[n].zitat),
      h('ul', { class: 'ziel-liste' }, drills.filter(d => d.korrekturhinweis === n).map(d => {
        const k = srs['drill:' + d.id];
        return h('li', null, h('a', { href: '#/schwachstellen/' + d.id }, h('span', { class: 'badge' }, TYPEN[d.typ] || d.typ), ' ', d.titel, ' ', k ? status(k.letzte === 'richtig' ? 'ok' : k.letzte === 'teilweise' ? 'teil' : 'falsch', k.letzte) : null, ' ', ungeprueftBadge(d)));
      })))));
}

const TYPEN = { fehlersuche: 'Fehlersuche', lueckentext: 'Lückentext', minifall: 'Mini-Fall', anfechtung: 'Anfechtung komplett', p179: '§ 179-Variante' };

function drill(main, d) {
  if (!d) { main.append(karte(h('p', null, 'Drill nicht gefunden.'), h('a', { href: '#/schwachstellen' }, 'Zurück'))); return; }
  const kopf = [h('p', { class: 'klein' }, h('a', { href: '#/schwachstellen' }, '← Alle Drills')), h('h2', null, d.titel, ' ', ungeprueftBadge(d)), h('p', { class: 'klein leise' }, `Korrekturhinweis ${d.korrekturhinweis} · ${TYPEN[d.typ] || d.typ}`)];
  const ziel = h('div');
  const bewertung = () => h('div', null, h('h3', null, 'Selbstbewertung'), selbstbewertung((art) => { store.srsBewertung('drill:' + d.id, art); location.hash = '#/schwachstellen'; }));
  if (d.typ === 'lueckentext') {
    const teile = d.aufgabe.split(/(\{\{[^}]+\}\})/g);
    const felder = [];
    const absatz = h('p', { class: 'lese' }, teile.map(t => {
      const m = /^\{\{([^}]+)\}\}$/.exec(t);
      if (!m) return inline(t);
      const inp = h('input', { type: 'text', 'aria-label': `Lücke ${felder.length + 1}`, size: String(Math.max(6, m[1].split('|')[0].length)) });
      inp.style.width = 'auto'; inp.style.minHeight = '36px'; inp.style.display = 'inline-block'; inp.style.margin = '2px 4px';
      felder.push({ inp, loesungen: m[1].split('|') });
      return inp;
    }));
    main.append(...kopf, karte(absatz, h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: () => {
      let ok = 0;
      for (const f of felder) {
        const v = normalisiere(f.inp.value).replace(/\s+/g, '');
        const treffer = f.loesungen.some(l => normalisiere(l).replace(/\s+/g, '') === v || (v.length > 3 && normalisiere(l).replace(/\s+/g, '').includes(v)));
        if (treffer) ok++;
        f.inp.classList.toggle('ok', treffer);
        f.inp.setAttribute('aria-invalid', String(!treffer));
        f.inp.title = treffer ? 'richtig' : 'Lösung: ' + f.loesungen[0];
        if (!treffer) f.inp.after(h('span', { class: 'status falsch klein' }, '✗ ', f.loesungen[0]));
      }
      leere(ziel).append(h('p', null, status(ok === felder.length ? 'ok' : ok >= felder.length / 2 ? 'teil' : 'falsch', `${ok} von ${felder.length} Lücken richtig`)), h('p', { class: 'klein' }, 'Lösung: ', inline(d.antwort)), bewertung());
    } }, 'Prüfen')), ziel));
    return;
  }
  const ed = autosaveEditor('drill:' + d.id, { label: 'Deine Lösung', platzhalter: 'Antwort hier formulieren …', zeilen: 8 });
  ed.textarea.style.minHeight = '180px';
  main.append(...kopf, karte(h('div', { class: 'lese' }, md(d.aufgabe)), ed.textarea, ed.info,
    h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: (e) => {
      ed.sichern();
      e.target.hidden = true;
      const text = ed.wert();
      const teile = [h('h3', null, 'Musterlösung'), md(d.antwort, { lese: true })];
      if (woerter(text) >= 3) {
        const kc = kernpunktCheck(d.kernpunkte, text, d.stichwoerter);
        teile.push(h('h3', null, 'Kernpunkt-Check ', h('span', { class: 'badge' }, 'automatisch – nur Hinweis')), h('ul', { class: 'themenliste' }, kc.map(k => h('li', null, status(k.getroffen ? 'ok' : 'fehlt', k.getroffen ? 'drin' : 'fehlt?'), ' ', inline(k.kernpunkt)))));
      } else teile.push(h('h3', null, 'Kernpunkte'), h('ul', null, d.kernpunkte.map(k => h('li', null, inline(k)))));
      teile.push(bewertung());
      ziel.append(...teile);
    } }, 'Lösung zeigen')), ziel));
}

const STIL = `## Gutachtenstil kompakt
Der Stil wird eigens bepunktet (Probeklausur: **18 von 48 Punkten**). Deine Form wurde voll bepunktet – behalte sie bei.

### Aufbau jeder Prüfung
1. **Obersatz** (Konjunktiv): „A könnte gegen B einen Anspruch auf Zahlung von 4.500 € aus § 433 Abs. 2 BGB haben.“
2. **Voraussetzungen**: „Dies setzt voraus, dass …“
3. **Definition**: „Unter … versteht man …“
4. **Subsumtion**: „Vorliegend …“ – mit Tatsachen aus dem Sachverhalt.
5. **Ergebnis**: „Somit / Folglich / Mithin …“

### Formulierungsbausteine
- Einstieg Gestaltungsrecht: „J könnte die Vollmacht durch Anfechtung gemäß § 142 Abs. 1 BGB rückwirkend beseitigt haben.“
- Problem markieren: „Fraglich ist, ob …“ · „Problematisch ist allein …“
- Unproblematisches knapp: „Ein Kaufvertrag ist unproblematisch geschlossen worden.“
- Zwischenergebnis: „Somit liegt ein Anfechtungsgrund vor.“
- Gegenansicht: „Teilweise wird vertreten … Dagegen spricht … Dem ist zu folgen.“

### Gutachten- vs. Urteilsstil
- **Gutachtenstil** (Ergebnis am Ende): „N könnte als Vertreterin ohne Vertretungsmacht gehandelt haben. Dann müsste ihr die Vertretungsmacht gefehlt haben. … Somit handelte N ohne Vertretungsmacht.“
- **Urteilsstil** (Ergebnis vorn): „N handelte ohne Vertretungsmacht, denn die Vollmacht wurde wirksam angefochten.“
- Urteilsstil ist im Gutachten nur für **Unproblematisches** in Ordnung.

### Schwerpunktsetzung
- Unproblematisches in einem Satz (Urteilsstil erlaubt).
- Probleme ausführlich: Definition, Argumente, ggf. Streit, Ergebnis.
- Jede Prüfung bekommt einen **Ergebnissatz** – auch Teilprüfungen (Zwischenergebnis).

### Checkliste vor Abgabe
- Jede Fallfrage beantwortet? Jede Prüfung mit Obersatz und Ergebnis?
- Normen präzise (Abs., S., Nr., Alt.) – Gesetz liegt vor dir!
- Anfechtung immer vollständig: Grund + Erklärung (§ 143) + Frist (§§ 121/124) + Ausschluss (§ 144) + Rechtsfolge (§ 142 Abs. 1).`;

const TAKTIK = `## Klausurtaktik (90 Minuten)
### Zeitplan (Vorschlag)
- **Teil A Fall (55 min):** 5 min Sachverhalt zweimal lesen · 10 min Skizze · 35 min ausformulieren · 5 min Kontrolle.
- **Teil B Wissen (15 min):** knapp, aber mit Norm und Beispiel.
- **Teil C Datenschutz-MC (20 min):** zügig – leichte Fragen zuerst, Unsicheres markieren und am Ende zurückkehren.

### Fall lösen
1. **Sachverhalt zweimal lesen** – beim zweiten Mal Personen, Daten, Beträge, Erklärungen markieren.
2. **Fallfrage genau lesen**: Was ist gefragt (Anspruch? Wirksamkeit? Eigentum?)
3. **Wer will was von wem woraus?** – je Personenbeziehung einen Obersatz.
4. **Skizze vor Ausformulierung**: Gliederung mit Normen, Problemschwerpunkte markieren.
5. **Gesetz nutzen**: Normen im Gesetz nachlesen und präzise zitieren (Abs., S., Nr., Alt.). Tipp: Inhaltsübersicht und Überschriften des BGB als Wegweiser (Normen-Kompass: „Wo steht was?“).
6. Jede Tatsache im Sachverhalt hat einen Zweck – wenn du eine nicht verwendet hast, prüfe, wofür sie gedacht ist (z. B. Datum → Frist; Alter → Geschäftsfähigkeit; Brief an Dritten → Rechtsschein).

### MC-Strategie
- Standardannahme der App: Teilpunkte mit Abzug für falsche Kreuze – **raten lohnt sich dann nicht**, wenn du unsicher bist; bei „alles oder nichts“ dagegen immer etwas ankreuzen.
- Auf Signalwörter achten (**nicht**, **immer**, **nur**, **unverzüglich**, „binnen 72 Stunden“).
- Zahlen sicher: 72 h (Art. 33), 1 Monat (Art. 12 Abs. 3), 16 Jahre (Art. 8), 20 Personen (§ 38 BDSG), 10 Mio./2 % und 20 Mio./4 % (Art. 83 Abs. 4/5).`;
