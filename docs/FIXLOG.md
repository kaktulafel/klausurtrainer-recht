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

## 19.10.2026 – Normparser deutet unbekannte Gesetze als BGB
- **Symptom:** Validator meldete „§ 115 Abs. 1 S. 1 Nr. 1 BGB nicht im Register“, obwohl im Text „… VVG“ stand.
- **Ursache:** Nach einer Normnummer ohne bekannte Gesetzesabkürzung griff der Fallback „BGB“ – auch wenn eine fremde Abkürzung folgte (VVG, SchwarzArbG, EStG …).
- **Fix:** VVG/SchwarzArbG ergänzt; zusätzlich übernimmt der Parser jede abkürzungsartige Folgezeichenkette (mind. zwei Großbuchstaben, z. B. „EStG“) als Gesetz statt BGB. Regressionstest in `tests/normparser.test.mjs`.

## 19.10.2026 – Register: leeres Feld „lage“ bei Gesetzen ohne Gliederung (EFZG)
- **Fix:** `fetch-normen.mjs` setzt `lage` auf den Gesetzesnamen, wenn die amtliche Quelle keine Gliederung liefert.

## 19.10.2026 – E2E: Locator traf versteckten Norm-Knopf
- Im MC-Aussagenblock wählte `li.aussage button` zuerst den (versteckten) Norm-Link in der Erklärung → Locator auf `.rf button` präzisiert.

## 19.10.2026 – A11y-Scan (axe-core, WCAG 2.1 AA)
- MC-Aussagenblock: `<li role="group">` brach die Listen-Semantik → Rolle auf die Richtig/Falsch-Knopfgruppe verschoben.
- Fortschrittsbalken ohne zugänglichen Namen → `aria-label`.
- Dunkelmodus: weißer Text auf hellrotem „Gefahr“-Knopf (Kontrast) → eigenes Token `--auf-falsch`.

## 19.10.2026 – KI: Zeitlimit und Prompt-Injection
- Zeitlimit galt nur bis zum Eintreffen der Header; ein hängender Antwort-Body blockierte → Limit umfasst jetzt die ganze Anfrage (Test).
- System-Prompts weisen an, Anweisungen innerhalb der Bearbeitung zu ignorieren (Test).

## 19.10.2026 – CI: A11y „scrollable-region-focusable“ nur unter Linux
- **Symptom:** a11y-Job in CI rot (Statistik-Tabelle), lokal grün.
- **Ursache:** Andere Schriftmetriken unter Linux machen die Tabelle breiter → `.scroll-x` wird scrollbar, ist aber per Tastatur nicht erreichbar.
- **Fix:** `h()` macht jeden `.scroll-x`-Bereich fokussierbar (`tabindex=0`, `role=region`, `aria-label`) – zentral statt pro Ansicht.

## 19.10.2026 – Namen im Prüfskript selbst
- **Befund (Abschluss-QA):** Die Namensprüfung in `scripts/validate.mjs` enthielt die zu verhindernden Namen als Klartext-Regex – damit standen sie im öffentlichen Repo.
- **Fix:** Prüfung über SHA-256-Hashes der (klein geschriebenen) Namen; jedes Wort jeder getrackten Datei wird gehasht und verglichen. Erkennung manuell verifiziert.
- **Hinweis:** In früheren Commits steht die alte Regex noch in der Git-Historie. Laut Auftrag wird die Historie nicht eigenmächtig umgeschrieben → im Abschlussbericht gemeldet.

## 19.10.2026 – Unnötiger Reload beim ersten Besuch
- **Symptom:** CI-Job „live“ (Offline-Check) brach mit „Execution context was destroyed“ ab.
- **Ursache:** Beim allerersten Besuch übernimmt der frisch installierte Service Worker per `clients.claim()` die Seite → `controllerchange` → die App lud sich neu. Für Nutzer:innen ein unnötiger Seitensprung kurz nach dem Öffnen.
- **Fix:** Neu laden nur, wenn vorher schon ein Controller aktiv war (= echtes Update). Offline-Check wartet robust auf den Controller.

## 31.10.2026 – „[object HTMLDetailsElement]“ auf der Wissensfragen-Seite
- **Symptom:** Die Themenliste unter `#/wissen` erschien als Kette „[object HTMLDetailsElement],…“ (auch live).
- **Ursache:** Der null-sichere `append`/`prepend`/`replaceChildren` aus `ui/dom.js` reichte Arrays unverändert weiter; das native `append` macht daraus Text. `h()` entfaltet Arrays, `append` nicht – leicht zu verwechseln.
- **Fix:** Der Wrapper entfaltet Arrays jetzt wie `h()` (`flat(Infinity)`). E2E prüft zusätzlich auf sichtbares „[object …]“ (vorher nur „[object Object]“, daher unentdeckt).

## 01.11.2026 – E2E: MC-Schritt flaky bei Optionen mit Normzitat
- **Symptom:** „MC beantworten → Feedback sichtbar“ scheiterte gelegentlich mit Timeout bei „Antwort prüfen“ (ca. 3 von 40 Läufen nachgestellt).
- **Ursache:** Der Test klickte die Mitte von `label.option`. Enthält der Optionstext ein Normzitat (z. B. „Art. 13 DSGVO“), traf der Klick den Norm-Knopf; dessen Popover überdeckte danach „Antwort prüfen“.
- **Fix:** Der Test klickt das Eingabefeld (`label.option input`) statt der Label-Mitte (an beiden Stellen). 60 nachgestellte Läufe ohne Fehler. Kein App-Fehler: Für Nutzer:innen ist das Popover gewollt.

## 01.11.2026 – `npm run normen` löschte bei gescheitertem EUR-Lex-Abruf den Wortlaut
- **Symptom:** Der Abruf meldete „Nicht gefunden: Art. 1 DSGVO …“ und schrieb trotzdem: Wortlaut-Dateien, `normen.json` und `index.json` verloren den DSGVO-Text.
- **Ursache:** Das Skript prüfte fehlende Normen erst nach dem Schreiben und leerte vorher den Ordner `wortlaut/`.
- **Fix:** Dateien per Git wiederhergestellt, nur `§ 641 BGB` (amtlicher Text aus demselben Abruf) übernommen. Das Skript bricht jetzt vor dem Schreiben ab, wenn eine Norm fehlt.

## 01.11.2026 – Cheatsheet-Karte: E2E zählte vor dem Laden
- **Symptom:** „Suche filtert nicht (0 → 1)“ im neuen E2E-Schritt; davor „Karteikarte nicht gespeichert“.
- **Ursache:** Der Test zählte, bevor die Ansicht gerendert war, und las den Lernstand vor dem verzögerten Speichern.
- **Fix:** Der Test wartet auf `.cs-e` und auf den gespeicherten Stand. Kein App-Fehler.

## 01.11.2026 – Register: unberichtigter DSGVO-Text und Abrufreste
- **Symptom:** Art. 83 Abs. 1 lautete „Absätzen 5 und 6“, Art. 15 Abs. 4 verwies auf „Absatz 1b“; kivo-art-113 endete mit „<div“; kivo-art-4 enthielt Art. 4a; Wörter klebten aneinander („Zivildienstleistende.Bewerberinnen“).
- **Ursache:** Abruf der Ursprungsfassung statt der konsolidierten; Artikel-Regex ohne Buchstaben; Schnitt mitten im Tag; `</DL>` ohne Umbruch.
- **Fix:** `fetch-normen.mjs` lädt die konsolidierte Fassung, erkennt `art_4a`, schneidet sauber, entfernt Änderungsmarker und Fußnoten und setzt Umbrüche. Die vorherigen Handkorrekturen sind damit überflüssig; ein neuer Abruf reproduziert das saubere Ergebnis.

## 02.11.2026 – Cheatsheets und Karteikarten am Desktop nicht erreichbar
- **Symptom:** Kein Button führte zu den neuen Bereichen.
- **Ursache:** Beide waren nur unter „Mehr“ eingehängt, und „Mehr“ gibt es nur in der Handy-Leiste. Die Desktop-Navigation und die Startseite kannten sie nicht. Die E2E-Tests riefen die Routen direkt auf und bemerkten das nicht.
- **Fix:** Einträge in der Desktop-Navigation (auch „Mehr“), Kacheln auf der Startseite, Links im Gutachten-Trainer. Neuer E2E-Schritt klickt die Bereiche auf Handy und Desktop an.
