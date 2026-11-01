import { h } from '../ui/dom.js';
const EINTRAEGE = [
  ['#/karteikarten', 'Karteikarten Recht', 'Alles Rechtswissen als Frage und Antwort, mit Wiederholung'],
  ['#/cheatsheets', 'Cheatsheets', 'Anspruchsgrundlagen, Merkmale, Schemata, Definitionen, Fristen'],
  ['#/uebersicht', 'Fälle kompakt', 'Alle Fälle mit Ansprüchen und Tatbestandsmerkmalen auf einen Blick'],
  ['#/schemata', 'Prüfungsschemata', 'Aufklappbar, mit Puzzle und Lückenschema'],
  ['#/wissen', 'Wissensfragen', 'Klausurstil, mit Selbstbewertung und Wiederholung'],
  ['#/klausur', 'Probeklausur-Simulator', 'Komplette Klausuren mit Timer und Note'],
  ['#/schwachstellen', 'Meine Schwachstellen', 'Drills, Gutachtenstil kompakt, Klausurtaktik'],
  ['#/wiederholen', 'Heute fällig', 'Spaced Repetition über alle Kartentypen'],
  ['#/statistik', 'Statistik', 'Trefferquoten je Thema, Verlauf'],
  ['#/einstellungen', 'Einstellungen', 'Klausurdatum, MC-Regel, Export/Import, KI'],
  ['#/info', 'Info & Quellen', 'Rechtsstand, Urheberrecht, Hinweise']
];
export function render(main) {
  main.append(h('h1', null, 'Mehr'), h('div', { class: 'raster zwei' },
    EINTRAEGE.map(([href, t, s]) => h('a', { class: 'karte kachel', href }, h('h3', null, t), h('p', { class: 'leise klein' }, s)))));
}
