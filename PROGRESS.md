# PROGRESS – Klausurtrainer Recht & Datenschutz

> Gedächtnis für Folgesitzungen. Neue Sitzung: „Lies AUFTRAG.md und PROGRESS.md und mach weiter.“

## Stand
- **Meilenstein:** M1 (MVP) abgeschlossen → weiter mit M2 (Inhalte komplett)
- **Live-URL:** https://kaktulafel.github.io/klausurtrainer-recht/
- **Repo:** https://github.com/kaktulafel/klausurtrainer-recht (öffentlich, Pages via Actions)

## Erledigt
- M0: Inventar, Themenkarte (`site/data/themen.json`), Klausurformat, Git/.gitignore, Kernlogik + Tests, Validator, Smoke, Workflow, Live-Check grün
- M1:
  - Normenregister: 241 Normen mit amtlichem Wortlaut (`npm run normen` → gesetze-im-internet.de / EUR-Lex; KI-VO konsolidiert 27.07.2026), aufgeteilt in `data/wortlaut/*.json`
  - Datenschutz-MC: 141 Fragen (alle Themen, inkl. Aussagenblöcke/Zuordnung) – **fachlich zweitgeprüft**
  - Normkarten: 132 (Recht + DS) – **geprüft**
  - Fälle: fall-01 (Probeklausur, **geprüft**), fall-02 (Versprecher Versteigerung), fall-03 (Taschengeld Raten), fall-04 (gekündigter Einkäufer) – 02–04 im Review
  - Views: Dashboard (Countdown, Tagesplan, Ampel, Top-5, Serie), Gutachten-Trainer (geführt, Klausurmodus mit Timer/Autosave/Gerüst/Bausteinen, Skizzen-Sprint, Bewertung mit Raster/Normen-/Begriff-/Stil-Check, KI-Panel, Lösung), MC (Üben/Prüfung/Fehler/fällig, Tasten), Normen-Kompass (Karten beide Richtungen, Zitier-Trainer, Register, Gliederung), Einstellungen (Datum, MC-Regel, Notenschlüssel, Theme, Export/Import Datei+Text, Reset, KI-Key)
  - Werkzeuge: `scripts/screens.mjs` (Playwright-Screenshots 375 px hell/dunkel + Desktop, meldet Konsolenfehler, Überlauf, sichtbares „null“), `scripts/index-aktualisieren.mjs`

## Offen (Meilensteine)
- M2: restliche Fälle (Ziel ≥ 15; geplant fall-05 … fall-18, s. u.), 60+ Wissensfragen, ≥ 10 Schemata mit Puzzle/Lückenschema, 20 Drills (je ≥ 5 pro Korrekturhinweis), 3 Klausuren; `abdeckungPflicht: true`; Reviews
- M3: Probeklausur-Simulator, Wiederholen-View (alle fälligen Karten), Statistik-View, Schemata-View, Wissen-View, Schwachstellen-View; PWA-Test offline
- M4: KI-Korrektur-Feinschliff (Wissensfragen-KI), Design/A11y, E2E mit Playwright in CI
- M5: Abschluss-QA, README, CLAUDE.md

## Geplante Fälle (M2)
- fall-05 Gamer-Abo (Minderjährige + § 110 + § 812; Übungsklausur faelle-3 f) – klausurgroß
- fall-06 Kombination Anfechtung (§ 123 Täuschung/§ 119 Abs. 2) + Rücktritt/Widerruf (faelle-8) – klausurgroß
- fall-07 Winken in der Weinauktion + abhandengekommene WE (faelle-1) – Kurzfall
- fall-08 E-Mail spätabends + Widerruf § 130 Abs. 1 S. 2, Boten (faelle-2) – Kurzfall
- fall-09 Obstkiste § 241a + verspätete Annahme (faelle-5 b, c) – Kurzfall
- fall-10 Gattungsschuld § 243/§ 447 + AGB-Kollision § 155 (faelle-5 d, e) – Kurzfall
- fall-11 § 134 / § 138 Abs. 2 + § 812 (faelle-4) – Kurzfall
- fall-12 c.i.c. Malware/Fake-Bewertungen (faelle-7 a, b) – Kurzfall
- fall-13 Zahngold § 110 + § 812 (faelle-7 c, Bewertungsschema des Dozenten) – Kurzfall/klausurnah
- fall-14 Delikt § 823 Abs. 1 Schadensposten (faelle-7 f, g) – Kurzfall
- fall-15 Rücktritt Werkstatt § 323, § 325 (faelle-9) – Kurzfall
- fall-16 Bote/Vertreter, Anscheinsvollmacht, § 181 (faelle-6 a, d, e) – Kurzfall
- fall-17 Vorschul-Schuhe (Bote, § 104, § 187) (faelle-3 a–c) – Kurzfall
- fall-18 Kombination Stellvertretung + Minderjährigkeit + Anfechtung – klausurgroß

## Nächste Schritte (exakt)
1. Review-Ergebnis zu fall-02–04 einarbeiten → `geprueft: true`
2. M2-Inhalte schreiben (Fälle, Wissen, Schemata, Drills, Klausuren), je Batch Review-Subagent
3. Views: wissen, schemata, schwachstellen, klausur, wiederholen, statistik

## Bekannte Probleme / Hinweise
- Bash-Heredocs mit bestimmten Inhalten brechen im Tool ab → Skripte mit dem Write-Werkzeug anlegen.
- Git-Bash wandelt Argumente mit „/“ um → bei `screens.mjs` `MSYS_NO_PATHCONV=1` setzen.
- § 38 Abs. 1 BDSG zum Jahreswechsel 2026/27 erneut prüfen (geplante Aufhebung).
