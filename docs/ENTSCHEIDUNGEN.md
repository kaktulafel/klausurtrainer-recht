# Entscheidungen & Annahmen

| Datum | Entscheidung | Begründung |
|---|---|---|
| 19.10.2026 | Git-Identität nur lokal im Repo auf `kaktulafel` / `148534889+kaktulafel@users.noreply.github.com` gesetzt | Öffentliches Repo: private E-Mail-Adresse soll nicht in Commits erscheinen. |
| 19.10.2026 | Repo-Name `klausurtrainer-recht`, öffentlich | Vorgabe; GitHub Pages braucht (ohne Pro) ein öffentliches Repo. Materialien sind per `.gitignore` ausgeschlossen. |
| 19.10.2026 | Quellen-IDs `material:<kurz-id>` statt Dateinamen | Dateinamen enthalten teils Personennamen; Zuordnung in `INVENTAR.md`. |
| 19.10.2026 | Klausurformat: A Fall 48 P. / B Wissen 12 P. / C DS-MC 20 P., 90 min | Probeklausur hatte 48 P. für den Fall; Rest als begründete Annahme (siehe `KLAUSURFORMAT.md`). |
| 19.10.2026 | MC-Standardregel „Teilpunkte mit Abzug, min. 0 je Frage“ | Echte Regel unbekannt; an Hochschulen verbreitet und streng genug. Umschaltbar. |
| 19.10.2026 | Wortlaut der Normen wird per Skript (`npm run normen`) aus gesetze-im-internet.de (XML) und EUR-Lex (HTML) übernommen | Internetzugang vorhanden; amtliche Werke sind frei verwendbar (§ 5 UrhG); niemals Normtext aus dem Gedächtnis. |
| 19.10.2026 | `index.json` → `"abdeckungPflicht": false` bis Meilenstein M2 | Früh live gehen (M0/M1) trotz noch fehlender Inhalte; ab M2 auf `true`, dann bricht `npm run check` bei unterdeckten A-Themen und < 5 Drills je Korrekturhinweis ab. |
| 19.10.2026 | E2E: zunächst Node-Smoke-Test (`npm run smoke`), Playwright-Prüfung zusätzlich, falls Browser installierbar | Smoke-Test läuft ohne Browser in CI und lokal; deckt HTTP-200 aller Routen-Module und Daten ab. |
| 19.10.2026 | Lehrstuhl-Fehler in den Folien (z. B. Erfüllung „§ 346“) werden in den Inhalten **korrigiert** zitiert (§ 362) und in `REVIEW.md` vermerkt | Gesetz ist erlaubt; die Klausur wird am Gesetz korrigiert. |
| 19.10.2026 | Fiktive Personen in Fällen erhalten eigene Namen (nicht die Namen aus den Übungsblättern) | Vorgabe: Übungsfälle in eigenen Worten mit eigenen Namen. |
| 19.10.2026 | Datenschutz-Themen ohne Materialbeleg (Cookies § 25 TDDDG, Drittland) als „zusatz“ (Gewicht C) | Stoffumfang = Materialien; Zusatz nur ergänzend. |
