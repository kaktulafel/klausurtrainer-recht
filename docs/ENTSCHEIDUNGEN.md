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
| 19.10.2026 | KI-VO-Wortlaut aus der konsolidierten EUR-Lex-Fassung (Stand 27.07.2026) | VO (EU) 2026/1744 hat Art. 4 und Art. 113 geändert; Ursprungsfassung wäre irreführend. |
| 19.10.2026 | Fiktive Personen in Fällen erhalten eigene Namen (nicht die Namen aus den Übungsblättern) | Vorgabe: Übungsfälle in eigenen Worten mit eigenen Namen. |
| 31.10.2026 | „Fälle kompakt“ (`#/uebersicht`) wird zur Laufzeit aus den geprüften Lösungsskizzen und Schemata erzeugt, ohne eigene Datendatei | Keine neuen Rechtsinhalte, die ein eigenes Fach-Review bräuchten; die Übersicht bleibt automatisch aktuell, wenn Fälle ergänzt werden. Anspruchsgrundlagen werden per Muster „Anspruch X gegen Y … aus § …“ aus der obersten Skizzenebene gelesen (`js/kompakt.js`, getestet). |
| 01.11.2026 | „Fälle kompakt“ erhält mit `pruefpfade.json` doch eine eigene Datendatei (Prüfungspfade) | Die Pfade fassen die Weichen aller Fälle abstrakt zusammen und sind damit neue Rechtsinhalte → eigene Datei mit Fach-Review statt Laufzeit-Erzeugung. Abdeckung aller Anspruchsgrundlagen und Fälle wird getestet, damit neue Fälle nicht ohne Pfad bleiben. |
| 01.11.2026 | DS-MC „pur inhaltlich“: keine Normen in Frage und Antwort, Normen nur in der Erklärung; IDs bleiben, nur der Lernstand neu gefasster Fragen wird zurückgesetzt | Auftrag des Nutzers: Die DSGVO darf mit, Artikelabfragen sind Zeitverschwendung. Stabile IDs halten die Probeklausuren und die Abdeckung je Thema stabil. Schwierigkeit neu eingestuft: 39/45/16 % (Ziel ca. 40/40/20). |
| 01.11.2026 | DSGVO-Wortlaut aus der konsolidierten Fassung, Abruf über publications.europa.eu statt eur-lex.europa.eu | Die Ursprungsfassung enthält Fehler, die später berichtigt wurden (z. B. Art. 83 Abs. 1). EUR-Lex selbst sperrt Skripte (HTTP 202 ohne Inhalt). Der Link in der App zeigt weiter auf die Verordnung bei EUR-Lex. |
| 01.11.2026 | „Karteikarten für alle Rechtsdinge“ = BGB-Teil, nicht Datenschutz; Schemata kommen als automatisch erzeugte Karten dazu | Der Datenschutzteil ist MC und hat den Trainer dort. Generierte Schemakarten bleiben mit den geprüften Schemata synchron. |
| 01.11.2026 | Podcast-PDFs liegen unter `podcast/` und sind nicht im Repo; die Quelltexte in `docs/podcast/` schon (`npm run podcast`) | PDFs sind per `.gitignore` ausgeschlossen; so lassen sie sich jederzeit neu erzeugen. |
| 02.11.2026 | Klausurdatum 09.11.2026 als Standard; Migration füllt nur ein leeres Datum | Termin vom Nutzer genannt. Ein selbst gesetztes Datum im Browser wird nicht überschrieben. |
| 19.10.2026 | Datenschutz-Themen ohne Materialbeleg (Cookies § 25 TDDDG, Drittland) als „zusatz“ (Gewicht C) | Stoffumfang = Materialien; Zusatz nur ergänzend. |
