# PROGRESS – Klausurtrainer Recht & Datenschutz

> Gedächtnis für Folgesitzungen. Neue Sitzung: „Lies AUFTRAG.md und PROGRESS.md und mach weiter.“

## Stand
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
