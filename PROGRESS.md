# PROGRESS – Klausurtrainer Recht & Datenschutz

> Gedächtnis für Folgesitzungen. Neue Sitzung: „Lies AUFTRAG.md und PROGRESS.md und mach weiter.“

## Stand
- **Meilenstein:** M2 (Inhalte) und M3 (Simulator, Wiederholen, Statistik, Offline) abgeschlossen → weiter mit M4 (KI-Feinschliff, Design/A11y) und M5 (Doku, Abschluss-QA)
- **Live-URL:** https://kaktulafel.github.io/klausurtrainer-recht/
- **Repo:** https://github.com/kaktulafel/klausurtrainer-recht (öffentlich, Pages via Actions)

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

## Offen
- M4: KI-Korrektur-Feinschliff, A11y-Durchgang (Tastatur, Kontraste, Fokus), Design-Check 375 px aller Views
- M5: README.md, CLAUDE.md/AGENTS.md, docs/DATENFORMATE.md, docs/THEMENKARTE.md, Abschluss-QA, Abschlussbericht

## Nächste Schritte (exakt)
1. CI-Lauf mit neuem Job „live“ prüfen
2. A11y/Design: alle Views per `scripts/screens.mjs` (375 px hell/dunkel) ansehen, Tastaturbedienung prüfen
3. KI-Panel: Fehlertexte, Kosten-/Datenschutzhinweis, Test mit gemocktem fetch
4. Doku (M5) schreiben, Abschlussbericht

## Bekannte Probleme / Hinweise
- Bash-Heredocs mit bestimmten Inhalten brechen im Tool ab → Skripte mit dem Write-Werkzeug anlegen; `\s` in Heredocs geht verloren.
- Git-Bash wandelt Argumente mit „/“ um → bei Playwright-Skripten `MSYS_NO_PATHCONV=1` setzen.
- § 38 Abs. 1 BDSG zum Jahreswechsel 2026/27 erneut prüfen (geplante Aufhebung).
