# Klausurtrainer Recht & Datenschutz

Statische Lern-Website für die Nachklausur „Recht & Datenschutz“. Sie trainiert BGB-Fallbearbeitung im Gutachtenstil, Wissensfragen, Normen-Finden, Datenschutz-Multiple-Choice und komplette Probeklausuren. Sie läuft im Browser, am Handy und offline.

**Live:** https://kaktulafel.github.io/klausurtrainer-recht/

> Lernhilfe, keine Rechtsberatung. Rechtsstand: siehe Fußzeile der Seite bzw. `docs/REVIEW.md`.

## Funktionen
- **Dashboard & Lernplan:** Countdown zum Klausurdatum, Tagesplan (in den letzten zwei Tagen Wiederholung und Probeklausur), Lernserie, Ampel je Thema, Top-5-Schwachstellen.
- **Gutachten-Trainer:** 18 Fälle (7 klausurgroß) in fünf Modi:
  - geführt (Anspruchsgrundlagen, Obersatz, Prüfungsreihenfolge, gestufte Tipps)
  - Klausurmodus mit Timer, Autosave, Gerüst und Formulierungsbausteinen
  - Skizzen-Sprint
  - Bewertung (Punkteraster, Normen-, Begriffs- und Stil-Check)
  - Musterlösung
- **Datenschutz-MC:** 141 Fragen (Single, Multi, Aussagenblöcke, Zuordnung). Modi: Üben, Prüfung, Nur Fehler, Heute fällig. Vier Bewertungsregeln stehen zur Wahl.
- **Normen-Kompass:** 132 Normkarten (beide Richtungen), Zitier-Trainer, Register mit 269 Normen und amtlichem Wortlaut (offline), Gliederung. Jedes Normzitat im Text ist anklickbar.
- **Schemata:** 19 Prüfungsschemata, jeweils mit Puzzle und Lückenschema.
- **Wissensfragen:** 64 Fragen mit Musterantwort und automatischem Kernpunkt-Check.
- **Probeklausur-Simulator:** 3 feste Klausuren und Zufallsklausuren, 90 min / 80 P. (A Fall 48 P. · B Wissen 12 P. · C MC 20 P.), Auswertung mit Note und Verlauf.
- **Meine Schwachstellen:** 22 Drills zu den vier Korrekturhinweisen, Gutachtenstil kompakt, Klausurtaktik.
- **Wiederholen & Statistik:** Spaced Repetition über alle Kartentypen; Quote, Übungen und „zuletzt geübt“ je Thema.
- **KI-Korrektur (optional):** Claude-API direkt aus dem Browser mit eigenem API-Key, nur in den Einstellungen sichtbar. Der Key bleibt im Browser (wahlweise nur für die Sitzung) und ist nie Teil des Exports.
- **Lernstand:** wird automatisch im Browser gespeichert. Export und Import als Datei oder Text, mit Backup bei defekten Daten.

## Am Handy nutzen
Seite öffnen und „Zum Home-Bildschirm hinzufügen“ wählen (Safari: Teilen-Menü; Chrome: ⋮-Menü). Nach dem ersten Besuch funktioniert alles offline, auch der Gesetzeswortlaut.

**Update / Cache-Probleme:** Gibt es eine neue Version, erscheint ein Hinweis „Neue Version verfügbar“. Hängt die Seite trotzdem an einer alten Version, die Adresse mit `?reset-sw` öffnen: https://kaktulafel.github.io/klausurtrainer-recht/?reset-sw. Das leert nur die Caches dieser App; der Lernstand bleibt erhalten.

## Lokal entwickeln
Voraussetzung: Node.js ≥ 20. Für E2E, A11y und Screenshots zusätzlich `npm ci` und `npx playwright install chromium`.

| Befehl | Zweck |
|---|---|
| `npm run serve` | lokaler Server → http://localhost:8080/ |
| `npm run check` | Validierung aller Daten, Normzitate und Sicherheitsregeln + Unit-Tests (**vor jedem Commit**) |
| `npm run smoke` | alle Seiten und Daten liefern HTTP 200 |
| `npm run e2e` | Playwright-Flows: Probeklausur komplett, Wiederholen, Statistik, KI (gemockt), Export ohne Key |
| `npm run a11y` | axe-core, WCAG 2.1 AA, 375 px hell/dunkel |
| `npm run normen` | Normenregister: amtlichen Wortlaut neu laden (gesetze-im-internet.de, EUR-Lex) |
| `npm run docs` | `docs/THEMENKARTE.md` aus `themen.json` erzeugen |
| `npm run live-check -- <url> --warten` | Live-Seite: Version = aktueller Commit, alle Dateien erreichbar |
| `npm run offline-check -- <url>` | Live-Seite offline mit echtem Service Worker testen |
| `node scripts/screens.mjs tmp/screens "#/route"` | Screenshots 375 px hell/dunkel + Desktop |

## Inhalte ergänzen
1. Inhalt im passenden Format unter `site/data/` anlegen; alle Formate stehen in [`docs/DATENFORMATE.md`](docs/DATENFORMATE.md).
2. Neue Normen ins Register (`normen.json`: `zitat` + `kurz`) und `npm run normen` ausführen.
3. Bei neuen Dateien `node scripts/index-aktualisieren.mjs` ausführen.
4. `npm run check`, dann ein fachliches Review. Erst danach `geprueft: true` setzen und den Befund in `docs/REVIEW.md` eintragen.

## Deployment
Jeder Push auf `main` löst `.github/workflows/pages.yml` aus und durchläuft drei Jobs:
1. **test:** check, smoke, e2e, a11y
2. **deploy:** Version stempeln, dann GitHub Pages
3. **live:** Live-Check auf den Commit-SHA und Offline-Test

Materialdateien (PDF, PPTX, DOCX, Scans) gehören **nie** ins Repo. `.gitignore` und `npm run check` erzwingen das.

## Dokumentation
- [`docs/INVENTAR.md`](docs/INVENTAR.md): ausgewertete Materialien
- [`docs/THEMENKARTE.md`](docs/THEMENKARTE.md): Themen, Gewichtung, Abdeckung
- [`docs/KLAUSURFORMAT.md`](docs/KLAUSURFORMAT.md): Format und Bewertungsannahmen
- [`docs/DATENFORMATE.md`](docs/DATENFORMATE.md): JSON-Formate
- [`docs/ENTSCHEIDUNGEN.md`](docs/ENTSCHEIDUNGEN.md): getroffene Annahmen
- [`docs/REVIEW.md`](docs/REVIEW.md): Fach-Review, Materialfehler, Rechtsstand
- [`docs/FIXLOG.md`](docs/FIXLOG.md): gefundene und behobene Fehler
- [`PROGRESS.md`](PROGRESS.md): Stand und nächste Schritte
