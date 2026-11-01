# PROGRESS – Klausurtrainer Recht & Datenschutz

> Gedächtnis für Folgesitzungen. Neue Sitzung: „Lies AUFTRAG.md und PROGRESS.md und mach weiter.“

## Stand
- **Klausur:** 09.11.2026 (in der App vorbelegt). Lernzeit 3–5 Std. täglich, Tagesplan rechnet mit 4 Std. (`js/plan.js`, einstellbar).
- **Meilenstein:** M0–M5 abgeschlossen, Definition of Done erfüllt (Stand 19.10.2026). Weitere Arbeit = Pflege/Erweiterung.
- **Live-URL:** https://kaktulafel.github.io/klausurtrainer-recht/
- **Repo:** https://github.com/kaktulafel/klausurtrainer-recht (öffentlich, Pages via Actions; CI: test → deploy → live inkl. Offline-Test)

## Erledigt
- M0: Inventar, Themenkarte, Klausurformat, Git/.gitignore, Kernlogik + Tests, Validator, Smoke, Workflow, Live-Check
- M1: Normenregister mit amtlichem Wortlaut, 141 DS-MC, 132 Normkarten, erste Fälle, Kern-Views
- M2:
  - 18 Fälle (7 klausurgroß: 01–06, 18), 64 Wissensfragen, 19 Schemata (Puzzle + Lückenschema), 22 Drills (5/5/6/6 je Korrekturhinweis), 3 feste Probeklausuren (`klausuren.json`)
  - **alles fachlich zweitgeprüft** (drei Review-Batches, `docs/REVIEW.md`), `abdeckungPflicht: true` – Validator erzwingt die Abdeckungsziele
  - Register 269 Normen (BGB, DSGVO, BDSG, TDDDG, KI-VO, StVG, EFZG, VVG, SchwarzArbG …)
- M3:
  - Probeklausur-Simulator (`views/klausur.js`, Logik `klausur-core.js` + Tests): feste + Zufallsklausuren, Gesamttimer, Autosave, Auswertung A (Raster) / B (Punkte + Kernpunkt-Check) / C (automatisch), Note, Verlauf, SRS-Rückkopplung
  - Wiederholen (`views/wiederholen.js`): alle fälligen Karten; MC/Wissen/Normkarten direkt, übrige Typen als Links
  - Statistik (`views/statistik.js`): Quote, Übungen, zuletzt geübt je Thema, Baustellen, Verläufe
  - E2E-Flows `scripts/e2e.mjs` (Klausur komplett inkl. Reload, Wiederholen, Statistik, Export ohne Key) – in CI
  - Offline-Test `scripts/offline-check.mjs` gegen die Live-Seite (echter SW) – als CI-Job „live“ nach jedem Deploy
  - SW: network-first mit 4-s-Fallback auf Cache (Funkloch)

- M4: A11y-Scan (axe, WCAG 2.1 AA, hell/dunkel, 375 px) in CI, Fixes; KI: Zeitlimit für ganze Anfrage, Prompt-Injection-Schutz, E2E mit gemockter API (Ergebnis, 401, Key nie im DOM)
- M5: README, CLAUDE.md/AGENTS.md, docs/DATENFORMATE.md, docs/THEMENKARTE.md (generiert, `npm run docs`), Namensprüfung ohne Klartextnamen

- 31.10.2026: Bereich **„Fälle kompakt“** (`#/uebersicht`, `views/uebersicht.js`, Logik `js/kompakt.js` + Tests): Kurzgliederung aller Fälle, Index nach Anspruchsgrundlage, Schemata kompakt; erreichbar über „Mehr“ und den Gutachten-Trainer. Dabei Fehler „[object HTMLDetailsElement]“ auf `#/wissen` behoben (FIXLOG).
- 01.11.2026: Alle 18 Fälle haben neue Felder `kurzSachverhalt` und `stichpunkte` (Stichpunktlösung mit Kontext), zweitgeprüft durch zwei Review-Subagenten (REVIEW.md, kein kritischer Befund); „Fälle kompakt“ zeigt sie standardmäßig, Anspruchs-Index nutzt sie (mit Ergebnis (+)/(−)). Flaky MC-Schritt im E2E behoben (FIXLOG).
- 01.11.2026: `stichpunkte` aller Fälle auf Stichpunkt-Gutachtenstil umgestellt (OS → Voraussetzungen → Fraglich → Subsumtion → Erg.), zweitgeprüft (REVIEW.md); Validator erzwingt OS-/Erg.-Zeile je Prüfung; Anspruchs-Index zeigt den Ergebnissatz.
- 01.11.2026: **Prüfungspfade** (`data/pruefpfade.json`, `#/uebersicht/pfade`): 12 Anspruchsschemata + 6 Bausteine im Stichpunkt-Gutachtenstil mit allen Weichen aus den 18 Fällen, Wegweiser „Wer will was? → Anspruch“, Fall- und Pfadverweise; zweitgeprüft (REVIEW.md); Validator + Tests erzwingen Format und Abdeckung.
- 01.11.2026: **DS-MC pur inhaltlich** (98 Fragen geändert, 62 neu gefasst; Validator verbietet Normen in Frage/Antwort), **Cheatsheets** (`#/cheatsheets`, `data/cheatsheets.json`), **Karteikarten Recht** (`#/karteikarten`, `data/karteikarten/recht.json`, SRS `karte:`), Lernstand-Schema 3; zweitgeprüft (REVIEW.md). **Podcast-PDFs** Recht und Datenschutz: `npm run podcast` → `podcast/` (aus `docs/podcast/`).
- 01.11.2026: Offene Punkte erledigt: DSGVO-Wortlaut auf konsolidierte, berichtigte Fassung umgestellt (16 Artikel korrigiert), fall-10 § 326 Abs. 2, fall-15 § 648, MC-Schwierigkeit 39/45/16 %, kk-157 geprüft; `npm run normen` läuft wieder vollständig.

## Offen / Ideen für später
- § 38 Abs. 1 BDSG zum Jahreswechsel 2026/27 prüfen (Aufhebung geplant) → ggf. ds-mc-101, 104, 107, nk-125 anpassen
- Git-Historie enthält in alten Commits die Klartext-Namensregex des Validators (nicht umgeschrieben, siehe FIXLOG)
- Optional: weitere Fälle (z. B. zweite Erstklausur-Variante), KI-Check auch für Teil B der Probeklausur

## Nächste Schritte (exakt)
1. Bei neuen Inhalten: Format nach docs/DATENFORMATE.md → `npm run check` → Review-Subagent → `geprueft: true` → `npm run docs` → Commit → CI beobachten
2. Rechtsstand halbjährlich prüfen: `npm run normen` (amtlicher Wortlaut), docs/REVIEW.md „Rechtsstand“

## Bekannte Probleme / Hinweise
- Bash-Heredocs mit bestimmten Inhalten brechen im Tool ab → Skripte mit dem Write-Werkzeug anlegen; `\s` in Heredocs geht verloren.
- Git-Bash wandelt Argumente mit „/“ um → bei Playwright-Skripten `MSYS_NO_PATHCONV=1` setzen.
- § 38 Abs. 1 BDSG zum Jahreswechsel 2026/27 erneut prüfen (geplante Aufhebung).
