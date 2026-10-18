import { h, karte, md } from '../ui/dom.js';
export function render(main) {
  main.append(h('h1', null, 'Info & Quellen'), karte(md(`Diese App ist ein privates Lernwerkzeug zur Vorbereitung auf die Nachklausur „Recht & Datenschutz“.

## Rechtsstand
Maßgeblich ist geltendes Recht (Stand **19.10.2026**): BGB, DSGVO, BDSG, TDDDG (bis Mai 2024: TTDSG), KI-Verordnung in der Fassung der VO (EU) 2026/1744 („Digital-Omnibus-Verordnung zur KI“, in Kraft seit 27.07.2026 – u. a. neuer Art. 4 zur KI-Kompetenz, verschobene Hochrisiko-Pflichten). Noch nicht beschlossene Reformen (DSGVO-Teil des „Digital Omnibus“, geplante Aufhebung der 20-Personen-Schwelle in § 38 Abs. 1 BDSG) sind nur als Hinweis vermerkt und nie Lösung einer Frage.

## Quellen
- Amtliche Normtexte: gesetze-im-internet.de (BGB, BDSG, TDDDG, HGB, StVG) und EUR-Lex (DSGVO, KI-VO). Amtliche Werke sind gemeinfrei (§ 5 UrhG).
- Fälle, Fragen und Musterlösungen sind eigene Formulierungen auf Grundlage der Lehrveranstaltung; Kursmaterialien selbst werden nicht veröffentlicht.

## Hinweise
- Keine Rechtsberatung.
- Lernstand bleibt nur in diesem Browser (Export/Import in den Einstellungen).
- Bei Problemen nach einem Update: Seite mit \`?reset-sw\` aufrufen (setzt den Offline-Cache zurück).`, { lese: true })));
}
