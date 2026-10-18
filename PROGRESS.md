# PROGRESS – Klausurtrainer Recht & Datenschutz

> Gedächtnis für Folgesitzungen. Neue Sitzung: „Lies AUFTRAG.md und PROGRESS.md und mach weiter.“

## Stand
- **Meilenstein:** M0 (Setup) in Arbeit
- Live-URL: _noch nicht_ 

## Erledigt
- Alle 19 Materialdateien gelesen (Text + Bilder + Scan) → `docs/INVENTAR.md`
- `site/data/themen.json` (Themenkarte maschinenlesbar), `docs/KLAUSURFORMAT.md`, `docs/ENTSCHEIDUNGEN.md`
- Kernlogik (rein, getestet): `normparser.js`, `grading.js`, `srs.js`, `storage-core.js`, `ai.js`, `textcheck.js`, `plan.js`
- 56 Unit-Tests grün; `scripts/validate.mjs`, `scripts/smoke.mjs`, `serve.mjs`, `stamp-version.mjs`, `live-check.mjs`
- App-Shell (index.html, CSS hell/dunkel, Router, Store, Fehlerkarte, SW, Manifest)

## Offen (Meilensteine)
- M0: Commit, Repo, Pages, erstes Deployment, Live-Check
- M1: Dashboard, DS-MC ≥ 40, Fall 01 (Probeklausur) + 3 Fälle, Normen-Kompass + Register (Wortlaut via `npm run normen`), Export
- M2: Inhalte komplett (15 Fälle, 60 Wissen, 120+ MC, 100 Normkarten, ≥ 10 Schemata, 20 Drills, 3 Klausuren), `abdeckungPflicht: true`
- M3: Simulator, SRS, Statistik, Lernplan, PWA
- M4: KI-Korrektur-UI, Feinschliff
- M5: Abschluss-QA

## Nächste Schritte (exakt)
1. `git add -A && git status` prüfen (keine PDFs!), Commit, `gh repo create klausurtrainer-recht --public --source . --remote origin --push`
2. Pages auf Actions stellen, Lauf beobachten, Live-Check

## Bekannte Probleme
- keine
