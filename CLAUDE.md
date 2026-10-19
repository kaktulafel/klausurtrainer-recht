# Regeln für Agent-Sitzungen

Einstieg: `AUFTRAG.md` (Spezifikation) und `PROGRESS.md` (Stand, nächste Schritte) lesen, dann weitermachen.

## Struktur
- `site/`: die ausgelieferte Seite (Vanilla JS als ES-Module, kein Framework, kein CDN, nur relative Pfade)
  - `js/*.js`: reine, testbare Logik
  - `js/views/*.js`: Bereiche, lazy geladen über `app.js`
  - `js/ui/`: DOM-Helfer und Widgets
  - `data/`: Inhalte als JSON, Formate in `docs/DATENFORMATE.md`
  - `sw.js`: Service Worker; jede JS/CSS-Datei muss in `SHELL` stehen, der Validator prüft das
- `scripts/`: Node-Werkzeuge (Validator, Server, Smoke, E2E, A11y, Normen-Abruf, Live- und Offline-Check)
- `tests/*.test.mjs`: node:test
- `docs/`: Inventar, Themenkarte, Klausurformat, Datenformate, Entscheidungen, Review, Fixlog

## Pflichtregeln
- **Vor jedem Commit `npm run check`.** Bei UI-Änderungen zusätzlich `npm run e2e` und `npm run a11y`; in Git-Bash mit `MSYS_NO_PATHCONV=1`.
- **Inhalte nur mit korrektem Normzitat.** Jede zitierte Norm muss im Register stehen, und Wortlaut gibt es nur aus amtlicher Quelle über `npm run normen`, nie aus dem Gedächtnis.
- **Neue Inhalte** werden zuerst mit `geprueft: false` angelegt. Dann folgt ein Fach-Review durch einen frischen Subagenten, dessen Befunde in `docs/REVIEW.md` landen. Erst danach `geprueft: true`. Probeklausuren nur aus geprüften Inhalten.
- **Nie committen:** Materialdateien (PDF/PPTX/DOCX/ZIP/Scans), Namen von Dozierenden oder Kommilitonen, wörtliche Kopien von Übungsblättern, API-Keys. Originaldateien im Projektordner nicht verschieben oder umbenennen.
- **Sicherheit:**
  - Texte nur über `textContent` bzw. `h()`/`md()`, nie per innerHTML; KI-Antworten nie als HTML.
  - Der API-Key erscheint nie in Logs, Fehlermeldungen oder Exporten.
  - CSP und `noindex` bleiben unangetastet.
  - Speicherschlüssel und Caches tragen nur das Präfix `nk-recht:` bzw. `nk-recht-`.
- **Reparaturschleife:** Fehler selbst beheben, Ursache und Fix in `docs/FIXLOG.md` dokumentieren. Tests nie abschwächen, Inhalte nie löschen, nur damit es grün wird.
- Annahmen in `docs/ENTSCHEIDUNGEN.md` festhalten; nach jedem Meilenstein `PROGRESS.md` aktualisieren.

## Deployment-Ablauf
1. `npm run check` (+ e2e/a11y) lokal grün.
2. Commit und Push auf `main`.
3. `gh run watch` verfolgen; die Jobs `test`, `deploy` und `live` müssen grün sein.
4. Bei Bedarf `npm run live-check -- https://kaktulafel.github.io/klausurtrainer-recht/ --warten`.

Repo-Sichtbarkeit nie eigenmächtig ändern.

## Bekannte Stolpersteine
- Bash-Heredocs verlieren `\` (z. B. `\s` in Regex) → Dateien mit dem Write-/Edit-Werkzeug schreiben.
- `§ 38 Abs. 1 BDSG` (20-Personen-Schwelle) zum Jahreswechsel 2026/27 auf Aufhebung prüfen.
