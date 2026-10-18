# Fixlog

Jeder behobene Fehler: Datum · Fehler · Ursache · Lösung (bei ≥ 5 Versuchen zusätzlich: Versuche, Workaround).

| Datum | Fehler | Ursache | Lösung |
|---|---|---|---|
| 19.10.2026 | `node --test tests/` findet keine Tests (Node 24) | Verzeichnis als Argument wird als Modul interpretiert | Glob `"tests/*.test.mjs"` in `package.json` |
| 19.10.2026 | KI-Test: Regex `/ausschließlich …/i` passte nicht auf „AUSSCHLIESSLICH“ | `ß` hat bei `/i` keine Großform „SS“ | Test-Regex auf eindeutigen Teil („mit einem JSON-Objekt“) geändert |
| 19.10.2026 | Fehlerseite unterschied Datenfehler nicht | `DatenFehler.name` war „Error“ | `this.name = 'DatenFehler'` im Konstruktor |
| 19.10.2026 | Bash-Heredoc mit mehreren Skripten brach ab | Quoting-Problem bei verschachtelten Heredocs | Dateien einzeln mit dem Write-Werkzeug angelegt |
| 19.10.2026 | „Update verfügbar“-Banner lokal sichtbar | `.banner { display:flex }` überschrieb das `hidden`-Attribut | globale Regel `[hidden] { display:none !important }` |
| 19.10.2026 | Musterlösungen als ein Absatz | Mini-Renderer verband einfache Zeilenumbrüche | jede Zeile = eigener Absatz |
| 19.10.2026 | „nullnull“ unter der Bewertung | `Element.append(null)` fügt Text „null“ ein | null-sichere `append/prepend/replaceChildren` in `ui/dom.js`; Screenshot-Skript meldet künftig sichtbares „null/undefined/NaN“ |
| 19.10.2026 | „§ 168 S. 2, 3 BGB“ als § 3 BGB erkannt | Komma-Zahl nach Satz/Absatz als neuer Paragraph gelesen | bei einfachem „§“ Fortsetzung von Satz/Absatz; „§§ 280 I 2, 276“ bleibt Liste; Regressionstest |
| 19.10.2026 | KI-VO-Wortlaut veraltet (Art. 4, 113) | Abruf der Ursprungsfassung statt konsolidierter Fassung | Skript lädt konsolidierte Fassung 02024R1689-20260727, entfernt Änderungsmarker |
| 19.10.2026 | Wortlaut ohne Zeilenumbrüche im Register | `white-space` nur im Popover gesetzt | `.wortlaut { white-space: pre-wrap }` |
