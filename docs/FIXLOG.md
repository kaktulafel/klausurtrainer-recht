# Fixlog

Jeder behobene Fehler: Datum · Fehler · Ursache · Lösung (bei ≥ 5 Versuchen zusätzlich: Versuche, Workaround).

| Datum | Fehler | Ursache | Lösung |
|---|---|---|---|
| 19.10.2026 | `node --test tests/` findet keine Tests (Node 24) | Verzeichnis als Argument wird als Modul interpretiert | Glob `"tests/*.test.mjs"` in `package.json` |
| 19.10.2026 | KI-Test: Regex `/ausschließlich …/i` passte nicht auf „AUSSCHLIESSLICH“ | `ß` hat bei `/i` keine Großform „SS“ | Test-Regex auf eindeutigen Teil („mit einem JSON-Objekt“) geändert |
| 19.10.2026 | Fehlerseite unterschied Datenfehler nicht | `DatenFehler.name` war „Error“ | `this.name = 'DatenFehler'` im Konstruktor |
| 19.10.2026 | Bash-Heredoc mit mehreren Skripten brach ab | Quoting-Problem bei verschachtelten Heredocs | Dateien einzeln mit dem Write-Werkzeug angelegt |
