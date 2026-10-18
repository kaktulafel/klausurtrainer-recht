# AUFTRAG: Klausurtrainer „Recht & Datenschutz" (Nachklausur)

> Dieser Auftrag ist vollständig und verbindlich. Arbeite ihn **autonom** ab, bis die Definition of Done (Abschnitt 13) erfüllt ist – auch wenn das lange dauert. Hör nicht nach dem MVP auf.
> Speichere diesen Text zuerst unverändert als `AUFTRAG.md` im Projektordner (falls er dort noch nicht liegt). Lies `AUFTRAG.md` und `PROGRESS.md` erneut, sobald dein Kontext zusammengefasst wurde oder du unsicher bist, wo du stehst.

---

## 0. Ziel in einem Satz

Baue aus den Lernmaterialien in diesem Ordner eine statische Lern-Website (HTML/CSS/JavaScript), mit der ich gezielt für meine Nachklausur trainiere – Falllösung im Gutachtenstil, Wissensfragen, Normen finden, Datenschutz-Multiple-Choice, komplette Probeklausuren –, teste und repariere sie selbstständig und veröffentliche sie dauerhaft über GitHub Pages.

---

## 1. Arbeitsregeln

1. **Keine Rückfragen**, außer du bist hart blockiert (z. B. fehlende GitHub-Anmeldung). Dann: Frage einmal klar stellen, sofort mit allem anderen weitermachen, Frage im Abschlussbericht wiederholen.
2. Bei Unklarheiten die vernünftigste Annahme treffen und in `docs/ENTSCHEIDUNGEN.md` notieren.
3. Lege zu Beginn eine Aufgabenliste an (Meilensteine M0–M5 aus Abschnitt 11 mit Unteraufgaben) und hake sie ab.
4. **Früh live, dann ausbauen:** erst Gerüst + Deployment (Live-URL sichern), dann MVP, dann Vollausbau.
5. Nach jedem Meilenstein: `npm run check` → Commit mit sprechender Message → Push → CI und Live-Check abwarten → `PROGRESS.md` aktualisieren.
6. `PROGRESS.md` ist dein Gedächtnis: Stand, erledigt, offen, exakte nächste Schritte, bekannte Probleme – so, dass eine neue Sitzung mit „Lies PROGRESS.md und mach weiter" nahtlos fortsetzen kann. Merkst du, dass die Sitzung endet (Kontext, Zeit): sofort committen und PROGRESS.md aktualisieren.
7. Fehler behebst du selbst (Abschnitt 9). Nie Tests abschwächen oder Inhalte löschen, nur damit etwas grün wird.
8. Ich arbeite in VS Code; das Terminal kann PowerShell, bash oder zsh sein. Hilfsskripte deshalb in Node.js schreiben, nicht als Shell-Skripte.

---

## 2. Kontext: die Klausur

- **Nachklausur** im Fach Recht & Datenschutz. Mein Stand: solide (Probeklausur 42/48). Ziel: sicher bestehen und die Note verbessern.
- **Teil Recht (BGB):** Großteil Fallbearbeitung im Gutachtenstil, dazu einige Wissensfragen.
- **Teil Datenschutz:** ausschließlich Multiple Choice, eher leicht.
- **Hilfsmittel: Gesetzestexte erlaubt.** → Schwerpunkt: die richtige Norm schnell finden, präzise zitieren (`§ 179 Abs. 2 BGB`, `Art. 6 Abs. 1 lit. f DSGVO`), Schemata sicher anwenden, sauber subsumieren. Auswendiglernen von Paragraphen ist nur Bonus.
- **Was in der Erstklausur drankam** (laut Kommilitonen; in der Nachklausur ist eine Variation wahrscheinlich):
  - Taschengeldparagraph mit Normnennung (§ 110 BGB; Minderjährigenrecht §§ 104–113 BGB).
  - Wissensfrage: Arten von Schuldverhältnissen (drei nennen).
  - Ein Fall, in dem eine Person einer anderen einen falschen Betrag bzw. ein falsches Gebot zuruft (je nach Sachverhalt: Versteigerung § 156, Erklärungsirrtum § 119 Abs. 1 Alt. 2, Inhaltsirrtum, Auslegung §§ 133, 157, ggf. § 118 → Anfechtung, § 122).
  - Datenschutz-MC war nicht schwer.
- **Niveau-Referenz – meine korrigierte Probeklausur** (gescannt im Materialordner; den Sachverhalt findest du ebenfalls dort):
  - Fall: J bevollmächtigt N, auf einer Versteigerung des Versteigerers MK für ihn ein Modell zu ersteigern; N hatte J getäuscht; J ficht die Vollmacht an und verweigert die Genehmigung. Meine Gliederung: Prüfung 1 Anfechtung der Vollmacht · Prüfung 2 Anspruch MK gegen J aus § 433 Abs. 2 BGB (scheitert: N ohne Vertretungsmacht, Genehmigung nach § 177 Abs. 1 verweigert) · Prüfung 3 Anspruch MK gegen N aus § 179 BGB. Details stehen im Sachverhalt.
  - Bewertung 42/48: **Gutachtenstil 18/18** (wird separat bepunktet – 18 von 48 Punkten!), Anfechtung/Vertretung/Kaufpreisanspruch 17/22, § 179 BGB 7/8. Randbemerkungen: „guter Obersatz" (§ 433 Abs. 2), „Perfekt!" (§ 177), „konsequent gelöst", „GA-Stil wird von Ihnen vollständig beherrscht!".
  - **Meine Form wurde voll bepunktet – übernimm sie für Musterlösungen und Vorlagen:** je Prüfung *Obersatz → Tatbestandsmerkmale mit Definition → Subsumtion → Ergebnis*.
  - **Korrekturhinweise = mein Fehlerprofil** (handschriftlich, hier transkribiert; gezielt trainieren):
    1. Mein Obersatz lautete „Anspruch auf rückwirkenden Entzug der Vollmacht aus § 167 BGB" → Korrektor: „142". Anfechtung ist ein **Gestaltungsrecht**, kein Anspruch; Rechtsfolge § 142 Abs. 1 BGB (ex tunc).
    2. „§ 166 bezieht sich auf die Wirksamkeit des Vertrages, angefochten wird jedoch die VM-Erteilung." → § 166 (Willensmängel/Wissen beim Vertretergeschäft) nicht mit der Anfechtung der Vollmachtserteilung vermischen.
    3. „Hier wäre eine Subsumtion unter § 119 bzw. 123 angezeigt, + Erklärung, Frist." → Anfechtung immer vollständig prüfen: Anfechtungsgrund mit echter Subsumtion, Anfechtungserklärung (§ 143, richtiger Anfechtungsgegner), Frist (§ 121 bzw. § 124), kein Ausschluss (§ 144), Rechtsfolge.
    4. Zu meiner Aussage, N habe den Mangel ihrer Vertretungsmacht nicht gekannt: „Doch! Sie hat den Anfechtungsgrund durch ihre Täuschung ja schließlich gesetzt!" → Wer die Anfechtbarkeit kannte, wird nach § 142 Abs. 2 BGB so behandelt, als hätte er die Nichtigkeit gekannt → Haftung nach § 179 Abs. 1 statt Abs. 2. Prüfe am Sachverhalt außerdem meinen Regress über § 122 analog: § 122 erfasst nur §§ 118–120 (nicht § 123) und ist bei Kenntnis der Anfechtbarkeit nach § 122 Abs. 2 ausgeschlossen.

---

## 3. Materialien einlesen (Schritt 1, vor allem anderen)

1. Durchsuche den kompletten Projektordner rekursiv nach Lernmaterial: PDF, DOCX, PPTX, XLSX, TXT, MD, Bilder (PNG/JPG/HEIC), ZIP (in einen Arbeitsordner entpacken, der ebenfalls nicht committet wird).
2. Lies **jede** Datei vollständig. Gescannte PDFs ohne Textebene (z. B. die Probeklausur): Seiten als Bild ansehen (dein Datei-Lesewerkzeug kann PDF-Seiten und Bilder anzeigen) oder OCR nutzen (`ocrmypdf`/`tesseract`, falls installiert). Handschrift sorgfältig lesen. Unlesbares im Inventar vermerken, nicht raten.
3. `docs/INVENTAR.md`: je Datei Titel, Art (Vorlesung/Übung/Probeklausur/Lösung), Themen, Aufgabentypen, Niveau, Besonderheiten (Punkte, Zeitangaben, Bewertungsregeln, Korrekturhinweise).
4. `docs/THEMENKARTE.md` und maschinenlesbar `site/data/themen.json`: alle prüfungsrelevanten Themen aus den Materialien mit Gewicht **A** (zentral/sehr wahrscheinlich), **B**, **C**, Kernnormen, Fundstelle im Material und Zielmengen je Inhaltstyp. A-Themen bekommen die meisten Inhalte. Die Themen der Erstklausur (Abschnitt 2) sind mindestens A.
5. `docs/KLAUSURFORMAT.md`: Aufbau, Punkte, Dauer, Aufgabentypen und MC-Bewertungsregel, soweit aus den Materialien ableitbar; Rest als begründete Annahme (Default: Teil A Fallbearbeitung ≈ 48 P. wie die Probeklausur, Teil B Wissensfragen, Teil C Datenschutz-MC; 90 Minuten; Gutachtenstil ≈ 35–40 % der Fallpunkte).
6. Stoffumfang = Materialien. Was du zum Verständnis ergänzt, kennzeichnest du als „Zusatz" (geringeres Gewicht, nie Schwerpunkt einer Probeklausur). Musterlösungen des Dozenten in den Materialien nutzt du zur Kalibrierung von Niveau und Stil.

---

## 4. Veröffentlichung, Urheberrecht, Privatsphäre (Pflicht)

GitHub-Pages-Seiten sind öffentlich erreichbar. Deshalb:

- Materialdateien kommen **nie** ins Repo: vor dem ersten Commit `.gitignore` anlegen (Kursmaterial-Endungen wie `*.pdf`, `*.pptx`, `*.docx`, `*.zip`, Scans/Fotos außerhalb von `site/`, Entpack-/Arbeitsordner, `node_modules/`, `.env*`). Originaldateien nicht verschieben oder umbenennen. Vor jedem Commit `git status` prüfen; zusätzlich prüft `npm run check` per `git ls-files`, dass nichts davon getrackt ist.
- Keine Scans, keine Namen von Dozierenden oder Kommilitonen, keine wörtlichen Kopien ganzer Übungsblätter auf der Seite. Übungsfälle **in eigenen Worten** nacherzählen (gleiche Rechtsprobleme, gleiche Schwierigkeit, eigene Namen) und eigene Musterlösungen schreiben.
- Auf allen Seiten `<meta name="robots" content="noindex, nofollow">`, dazu `site/robots.txt` mit `Disallow: /`.
- Liegen Materialdateien schon in einem früheren Commit: die Git-Historie nicht eigenmächtig umschreiben, sondern im Abschlussbericht melden.

---

## 5. Technik (verbindlich)

- **Statisch, ohne Framework, ohne Build-Zwang:** HTML5, CSS, Vanilla-JavaScript (ES-Module). Keine Laufzeit-Abhängigkeiten von CDNs (offline-fähig), Systemschriften. Dev-Abhängigkeiten nur für Tests.
- **Struktur** (Details anpassbar, Prinzip beibehalten):

```
site/                    ← nur dieser Ordner wird veröffentlicht
  index.html  404.html  robots.txt  manifest.webmanifest  sw.js  version.json
  css/   js/ (app, router, store, srs, grading, normparser, ai, ui/…)   data/   icons/
scripts/   validate.mjs  serve.mjs  stamp-version.mjs  live-check.mjs
tests/     *.test.mjs (node:test)    e2e/ (Playwright, optional)
docs/      INVENTAR.md  THEMENKARTE.md  KLAUSURFORMAT.md  DATENFORMATE.md
           ENTSCHEIDUNGEN.md  REVIEW.md  FIXLOG.md
.github/workflows/pages.yml
AUFTRAG.md  PROGRESS.md  README.md  CLAUDE.md (bzw. AGENTS.md)  package.json ("type": "module")
```

- `package.json`-Skripte: `serve`, `validate`, `test`, `check` (= validate + test), `e2e` (falls eingerichtet), `live-check`.
- **Daten aufteilen:** ein Fall pro Datei, MC/Wissen/Normkarten nach Thema in mehrere Dateien (je max. ~150 KB); `site/data/index.json` listet alle Datendateien; Module laden ihre Daten erst bei Bedarf.
- **GitHub-Pages-Fallen vermeiden:**
  - Die Seite läuft unter `https://<user>.github.io/<repo>/` → **nur relative Pfade** (kein führendes `/` in `src`, `href`, `fetch`, Manifest, Service Worker).
  - **Hash-Routing** (`#/faelle/fall-03`), damit Deep-Links und Reload funktionieren.
  - Dateinamen klein, ohne Leerzeichen und Umlaute (Pages unterscheidet Groß-/Kleinschreibung).
  - Alle Pages-Seiten eines Accounts teilen sich eine Origin → `localStorage`-Schlüssel und Cache-Namen mit eindeutigem Präfix (z. B. `nk-recht:`); beim Aufräumen nur **eigene** Caches löschen.
- **Logik testbar halten:** Bewertung, Notenschlüssel, Spaced Repetition, Normen-Erkennung, Datenmigration und KI-Antwort-Parser als reine Funktionen ohne DOM-Zugriff (in Node importierbar).
- **Lernstand:** `localStorage` mit Schema-Version und Migrationen; Autosave von Freitexten (alle paar Sekunden und beim Verlassen); Export/Import als Datei **und** als kopierbarer Text (Handy ↔ Laptop); „Alles zurücksetzen" mit Sicherheitsabfrage.
- **Offline/PWA:** Manifest + Service Worker. Cache-Name enthält die App-Version; HTML und `data/*.json` network-first, statische Assets cache-first; neue Version → Hinweis „Update verfügbar – neu laden". Lokal (localhost oder unersetzter Versions-Platzhalter) keinen Service Worker registrieren. Notfall-Schalter `?reset-sw`: Service Worker abmelden, eigene Caches löschen, neu laden.
- **Versionierung automatisch:** Platzhalter `__APP_VERSION__` in `index.html` (`<meta name="app-version">`), `sw.js` und `version.json`; der CI-Workflow ersetzt ihn vor dem Upload durch Commit-SHA und Zeitstempel (`scripts/stamp-version.mjs`). Version im Footer anzeigen.
- **Selbstheilung zur Laufzeit:** globaler Fehler-Handler (`error`, `unhandledrejection`) zeigt statt einer weißen Seite eine Fehlerkarte (Neu laden · Lernstand exportieren · Cache zurücksetzen). Defekter oder inkompatibler Lernstand wird erkannt, als Backup gesichert und neu initialisiert, statt die App abstürzen zu lassen. Fehlt eine Datendatei, zeigt nur das betroffene Modul einen Hinweis.
- **Sicherheit:** Texte per `textContent` bzw. über einen eigenen, escapenden Mini-Renderer (Absätze, **fett**, Listen) einfügen – nie ungeprüftes HTML, **KI-Antworten niemals als HTML**. Content-Security-Policy per `<meta>` (`default-src 'self'`, `connect-src 'self' https://api.anthropic.com`, `img-src 'self' data:`), kein Inline-JavaScript.
- **UX:** Mobile first (ich lerne viel am Handy; Bottom-Navigation), Dark Mode (System + Umschalter), gut lesbare Langtexte (≈ 17–18 px, Zeilenlänge ≤ 75 Zeichen), Tastaturkürzel (1–5 Antworten, Enter weiter, Leertaste Karte umdrehen), Zustände richtig/teilweise/falsch auch ohne Farbe erkennbar (Icon + Text), sichtbare Fokus-Stile, aria-Labels, ausreichender Kontrast, Druck-CSS für Schemata und Musterlösungen.
- **Normzitate verlinken:** Jede Norm in Texten wird automatisch erkannt und zeigt per Popover amtliche Überschrift und Link zum Gesetzestext.

---

## 6. Module

Priorität: 6.1–6.4 sind Kern (MVP), 6.5–6.10 Vollausbau.

### 6.1 Dashboard
Countdown (Klausurdatum in den Einstellungen), Tagesplan (fällige Karten, empfohlener Fall, Schwachstellen-Drill), Fortschritt je Thema als Ampel, Top-5-Schwachstellen aus meinen Fehlerquoten, Lernserie. **Lernplan:** aus Klausurdatum, Themengewichten und meinen Ergebnissen Tagesziele berechnen; die letzten zwei Tage = Wiederholung + komplette Probeklausur.

### 6.2 Gutachten-Trainer (wichtigstes Modul)
Jeder Fall: Sachverhalt, Fallfrage(n), Bearbeitungszeit, Schwierigkeit, Themen, Lösungsskizze, **ausformulierte Musterlösung im Gutachtenstil** (in meiner Form aus Abschnitt 2), **Punkteraster** (Gutachtenstil-Punkte + inhaltliche Punkte je Prüfung, wie die Probeklausur), erwartete Normen, Schlüsselbegriffe, typische Fehler, bei klausurgroßen Fällen mindestens eine **Abwandlung** mit Kurzlösung.

Modi:
1. **Geführt:** Wer will was von wem woraus? (Anspruchsgrundlage wählen, mit Feedback) → Obersatz schreiben → Prüfungspunkte in die richtige Reihenfolge bringen (touch-taugliches Sortieren) → je Punkt Definition + Subsumtion schreiben und mit dem Muster vergleichen → Ergebnis. Gestufte Tipps (1: Norm · 2: Schema · 3: Mustersatz).
2. **Klausurmodus:** Timer, freier Editor mit Autosave und Wortzähler, Button „Gerüst einfügen" (Prüfung · Obersatz · Tatbestandsmerkmale · Subsumtion · Ergebnis), Formulierungsbausteine zum Einfügen („… könnte gegen … einen Anspruch auf … aus § … haben.", „Dies setzt voraus, dass …", „Fraglich ist, ob …", „Unter … versteht man …", „Somit …"); danach Bewertung.
3. **Skizzen-Sprint:** nur die Lösungsskizze in 10 Minuten, dann Vergleich mit der Musterskizze.

**Bewertung (offline, immer verfügbar):**
- Musterlösung neben meinem Text (am Handy umschaltbar).
- Punkteraster zum Abhaken → Punkte + Note.
- **Normen-Check:** erkennt meine Zitate in allen üblichen Schreibweisen (`§ 179 Abs. 2 BGB`, `§179 II`, `§§ 119, 123 BGB`, `§ 119 I Alt. 2`, `Art. 6 Abs. 1 lit. f DSGVO`, `Art. 6 I f DSGVO`) → ✓ genannt / ✗ fehlt / ⚠ zusätzlich (prüfen).
- **Schlüsselbegriff-Check.**
- **Gutachtenstil-Hinweise** (Heuristik, ausdrücklich als Hinweis gekennzeichnet): Obersatz im Konjunktiv, Überleitungen, Ergebnissatz je Prüfung, Warnung bei Urteilsstil am Prüfungsbeginn.
- Optional KI-Korrektur (6.8). Alle Versuche mit Punkten speichern (Verlauf).

### 6.3 Datenschutz-MC
- Fragenpool nach Themenkarte. Ist sie dort lückenhaft, mindestens abdecken: Anwendungsbereich (Art. 2, 3), Begriffe (Art. 4: personenbezogene Daten, Verarbeitung, Verantwortlicher, Auftragsverarbeiter, Einwilligung, Pseudonymisierung vs. Anonymisierung), Grundsätze (Art. 5), Rechtsgrundlagen (Art. 6 Abs. 1 lit. a–f), Einwilligung (Art. 7, 8), besondere Kategorien (Art. 9), Informationspflichten (Art. 13, 14), Betroffenenrechte (Art. 12, 15–22), Privacy by Design/Default (Art. 25), Auftragsverarbeitung (Art. 28), Verzeichnis (Art. 30), Sicherheit/TOM (Art. 32), Datenpannen (Art. 33, 34), DSFA (Art. 35), Datenschutzbeauftragter (Art. 37–39, § 38 BDSG), Drittlandübermittlung (Art. 44 ff.), Haftung und Bußgeld (Art. 82, 83), BDSG-Besonderheiten, Cookies (§ 25 TDDDG) – jeweils nur so tief, wie die Materialien es verlangen.
- Fragetypen: Single Choice, Multiple Choice (mehrere richtig), Richtig/Falsch-Aussagenblöcke, Zuordnung (Fall → Rechtsgrundlage). Das Format der echten Klausur (Optionenzahl, Bewertungsregel, z. B. Abzug für falsche Kreuze) ist Standard; wählbar: alles-oder-nichts / Teilpunkte / Minuspunkte.
- Optionen bei jedem Durchgang mischen; zu **jeder** Option eine Erklärung mit Normzitat.
- Modi: Üben (sofortiges Feedback) · Prüfung (Timer, Auswertung am Ende) · Nur Fehler · Themenfilter.

### 6.4 Normen-Kompass (Gesetz erlaubt → Normen finden)
- Karten **Problem/Stichwort → Norm** (z. B. „Taschengeld" → § 110 BGB; „Haftung des Vertreters ohne Vertretungsmacht" → § 179 BGB; „Meldung einer Datenpanne an die Aufsicht" → Art. 33 DSGVO) und umgekehrt **Norm → Wofür?**.
- Suchbares **Normenregister** aller Stoff-Normen: amtliche Überschrift, Kurzerklärung in eigenen Worten, Lage im Gesetz (Buch/Abschnitt/Titel bzw. Kapitel – als Blättertipp), Link zum amtlichen Text (gesetze-im-internet.de für BGB/BDSG/TDDDG, EUR-Lex für die DSGVO). Hast du Internetzugang, übernimm den Wortlaut der Stoff-Normen aus diesen amtlichen Quellen (amtliche Werke, frei verwendbar), damit die App ihn offline zeigt. Ohne Internet nur Links – **niemals Normtext aus dem Gedächtnis**.
- Gliederungsübersicht der relevanten Teile von BGB und DSGVO („Wo steht was?").
- **Zitier-Trainer:** Norm mit Absatz, Satz, Nummer, Alternative bzw. Buchstabe korrekt zitieren.

### 6.5 Prüfungsschemata
Interaktiv aufklappbare Schemata (mit Normen und typischen Problemen) für alle Prüfungen der Themenkarte, mindestens: Anspruchsaufbau (entstanden – untergegangen – durchsetzbar), Vertragsschluss (§§ 145 ff., Versteigerung § 156), Wirksamwerden der Willenserklärung (§ 130), Geschäftsfähigkeit (§§ 104–113 inkl. §§ 107, 108, 110), **Anfechtung** (Anfechtungsgrund §§ 119, 120, 123 – Erklärung § 143 – Frist §§ 121, 124 – kein Ausschluss § 144 – Rechtsfolge § 142 Abs. 1, ggf. § 142 Abs. 2 und § 122), **Stellvertretung** (§ 164 Abs. 1: eigene Willenserklärung – im fremden Namen – mit Vertretungsmacht; sonst § 177), **§ 179** (Abs. 1/2/3), Kaufpreisanspruch § 433 Abs. 2 sowie alle weiteren laut Themenkarte. Übungen: **Schema-Puzzle** (Reihenfolge) und **Lückenschema** (welche Norm wofür).

### 6.6 Wissensfragen
- Im Klausurstil, z. B. „Nennen Sie drei Arten von Schuldverhältnissen mit Norm und Beispiel", „Wo ist der Taschengeldparagraph geregelt? Voraussetzungen und Rechtsfolge?", „Innen- vs. Außenvollmacht" – Themen laut Themenkarte.
- Ablauf: Antwort tippen (oder nur denken) → Musterantwort + Kernpunkte + Normen → Selbstbewertung (richtig/teilweise/falsch) → Spaced Repetition; Kernpunkt-Check gegen meinen Text; optional KI-Check.
- **Schuldverhältnisse vollständig abdecken**, weil Einteilungen je nach Lehrbuch variieren: rechtsgeschäftlich/vertraglich (§ 311 Abs. 1), rechtsgeschäftsähnlich/vorvertraglich (§ 311 Abs. 2, 3 i. V. m. § 241 Abs. 2), gesetzlich (GoA §§ 677 ff., unerlaubte Handlung §§ 823 ff., ungerechtfertigte Bereicherung §§ 812 ff.); zusätzlich einseitig verpflichtend / unvollkommen zweiseitig / gegenseitig sowie Dauer- vs. Zielschuldverhältnis. Die Einteilung, die die Materialien verwenden, als „Klausurantwort" markieren.

### 6.7 Probeklausur-Simulator
Komplette Klausuren im echten Format (aus `docs/KLAUSURFORMAT.md`), Gesamttimer mit empfohlenen Teilzeiten, mindestens drei feste Klausuren plus Zufallsklausur aus dem Pool (gewichtet nach Themenkarte). Auswertung je Teil, Gesamtnote und Verlauf.
Default-Notenschlüssel (in den Einstellungen änderbar; nennen die Materialien einen anderen, diesen verwenden): ≥ 95 % 1,0 · ≥ 90 % 1,3 · ≥ 85 % 1,7 · ≥ 80 % 2,0 · ≥ 75 % 2,3 · ≥ 70 % 2,7 · ≥ 65 % 3,0 · ≥ 60 % 3,3 · ≥ 55 % 3,7 · ≥ 50 % 4,0 · < 50 % 5,0.

### 6.8 KI-Korrektur (optional, mit meinem eigenen API-Key)
- **Einstellungen:** API-Key-Feld (maskiert; nur in diesem Browser gespeichert, wahlweise nur für die Sitzung; „Key löschen"; Warnhinweis für geteilte Geräte), Modellfeld mit Vorauswahl `claude-sonnet-5-5` (empfohlen), `claude-haiku-5-5` (günstig), `claude-opus-5-5` (gründlich) – frei editierbar für künftige Modelle –, Button „Verbindung testen". Ohne Key ist die Funktion ausgeblendet; die App funktioniert vollständig ohne KI.
- **Aufruf direkt aus dem Browser:** `POST https://api.anthropic.com/v1/messages` mit den Headern `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`, `anthropic-dangerous-direct-browser-access: true`; Body mit `model`, `max_tokens` (großzügig, z. B. 16000), `system`, `messages`.
- **Antwort:** nur Inhaltsblöcke mit `type: "text"` auswerten, andere Blocktypen ignorieren; bei `stop_reason: "max_tokens"` einen Hinweis anzeigen.
- **Korrektur-Prompt (Deutsch):** strenger, fairer Korrektor einer Hochschul-Rechtsklausur; erhält Sachverhalt, Fallfrage, Musterlösung, Punkteraster (IDs + Maximalpunkte), Gutachtenstil-Kriterien und meinen Text; bewertet nur, was tatsächlich dasteht; erkennt vertretbare abweichende Lösungen an, wenn sie gut begründet sind; keine Punkte für bloßes Normzitat ohne Subsumtion. Ausgabe ausschließlich als JSON: Punkte je Rasterpunkt mit Begründung, Gutachtenstil-Punkte, fehlende Prüfungspunkte und Normen, fachliche Fehler, Stärken, drei konkrete Tipps, verbesserte Fassung der schwächsten Passage.
- **Robust:** JSON aus Text oder Codeblock extrahieren und validieren, Punkte auf [0, max] begrenzen, **Summen selbst neu berechnen** (nicht der KI vertrauen); bei Parse-Fehler Rohtext (escaped) anzeigen. Klare Meldungen für 401 (Key ungültig), 429/529 (überlastet – später erneut), Netzwerk-/CORS-Fehler, Timeout. Den Key nie loggen und nie in Fehlermeldungen ausgeben.
- Auch für Wissensfragen nutzbar (erfüllte/fehlende Kernpunkte + kurzes Feedback).

### 6.9 Spaced Repetition & Statistik
Leitner oder SM-2-light für MC, Wissensfragen, Normkarten und Schema-Puzzles; „Heute fällig"; Statistik je Thema (Trefferquote, Anzahl, zuletzt geübt) speist Dashboard und Lernplan.

### 6.10 Fehlerprofil & Klausurtechnik
- Seite **„Meine Schwachstellen"** mit Drills zu den vier Korrekturhinweisen aus Abschnitt 2 (je mindestens fünf: Mini-Fälle, Lückentexte, „Finde den Fehler im Obersatz", Anfechtungsprüfung komplett, § 179-Varianten inkl. § 142 Abs. 2 und § 179 Abs. 3).
- **Gutachtenstil kompakt:** Aufbau, Formulierungsbausteine, Gutachten- vs. Urteilsstil mit Beispielen, Schwerpunktsetzung (Unproblematisches knapp feststellen, Probleme ausführlich) – der Stil wird eigens bepunktet.
- **Klausurtaktik:** Zeitplan, Sachverhalt zweimal lesen, Wer-will-was-von-wem-woraus, Skizze vor Ausformulierung, Gesetz effizient nutzen, MC-Strategie passend zur Bewertungsregel.

---

## 7. Inhalte – Mindestmengen und Qualität

| Inhalt | Minimum |
|---|---|
| Fälle im Gutachtenstil | 15, davon ≥ 5 klausurgroß (60–90 min, ≈ 40–50 P.), Rest Kurzfälle (15–30 min) |
| … darin zwingend | Probeklausur-Fall (eigene Nacherzählung, **vollständige Musterlösung, die alle vier Korrekturhinweise umsetzt**) · alle Übungsfälle aus den Materialien (eigene Fassung) · ≥ 2 Minderjährigen-/Taschengeld-Fälle · ≥ 2 Anfechtungsfälle (u. a. falsch zugerufener Betrag/falsches Gebot) · ≥ 2 Stellvertretungsfälle mit §§ 177/179 · Kombinationsfälle |
| Wissensfragen | 60 |
| Datenschutz-MC | 120 + Aussagenblöcke, verteilt nach Themenkarte, ca. 40 % leicht / 40 % mittel / 20 % schwer |
| Normkarten (Problem → Norm) | 100 |
| Schemata | alle relevanten, ≥ 10, je mit Puzzle |
| Fehlerprofil-Drills | 20 |
| Komplette Probeklausuren | 3 |

**Qualitätsregeln:**
- Sachverhalte vollständig und eindeutig (alle für die Lösung nötigen Tatsachen, keine Lösung über Sachverhaltsquetsche), fiktive Namen, Fallfrage im Klausurstil.
- Musterlösungen im Gutachtenstil in meiner Form; Normen präzise (Abs., S., Nr., Alt. bzw. lit.); Unproblematisches knapp, Schwerpunkte ausführlich; Meinungsstreit nur, wo die Materialien ihn verlangen.
- MC: eindeutiger Fragestamm, plausible Distraktoren (typische Irrtümer), Verneinungen hervorheben (**nicht**), kein „alle/keine der genannten", sofern das nicht dem Klausurstil entspricht.
- Jedes Element hat Themen-Tag, Normen, Quelle (`material:<datei>`, `neu` oder `zusatz`) und Prüfstatus. Ungeprüfte Inhalte tragen ein Badge „ungeprüft" und erscheinen nie in Probeklausuren; zum Abschluss darf es keine mehr geben.
- In Batches erzeugen (z. B. 20 MC oder 2 Fälle) → validieren → Fach-Review (9.2) → committen.

---

## 8. Datenformate

Feldnamen deutsch, IDs global eindeutig (kebab-case). Alle Formate in `docs/DATENFORMATE.md` dokumentieren. Beispiele:

**`site/data/mc/<thema>.json`** – Array von Objekten:
```json
{
  "id": "ds-mc-001",
  "thema": "dsgvo-grundsaetze",
  "typ": "single",
  "frage": "…",
  "optionen": [
    { "id": "a", "text": "…", "korrekt": true, "erklaerung": "… (Art. 5 Abs. 1 lit. c DSGVO)" },
    { "id": "b", "text": "…", "korrekt": false, "erklaerung": "…" }
  ],
  "normen": ["Art. 5 Abs. 1 lit. c DSGVO"],
  "schwierigkeit": 1,
  "quelle": "material:<datei>",
  "geprueft": true
}
```

**`site/data/faelle/fall-01.json`:**
```json
{
  "id": "fall-01",
  "titel": "…",
  "themen": ["anfechtung", "stellvertretung"],
  "schwierigkeit": 3,
  "minuten": 60,
  "punkte": 48,
  "sachverhalt": ["Absatz 1 …", "Absatz 2 …"],
  "fallfragen": ["…"],
  "skizze": [{ "ebene": 1, "text": "A. Anspruch MK gegen J aus § 433 Abs. 2 BGB" }],
  "musterloesung": [{ "id": "A", "titel": "…", "text": "…" }],
  "raster": [{ "id": "r1", "abschnitt": "A", "kriterium": "…", "punkte": 2 }],
  "gutachtenstil": [{ "id": "g1", "kriterium": "Obersätze vollständig (wer, was, von wem, woraus)", "punkte": 4 }],
  "erwarteteNormen": ["§ 433 Abs. 2 BGB", "§ 164 Abs. 1 BGB", "§ 177 Abs. 1 BGB"],
  "schluesselbegriffe": ["Offenkundigkeit", "Genehmigung"],
  "typischeFehler": ["…"],
  "abwandlungen": [{ "frage": "…", "kurzloesung": "…" }],
  "quelle": "material:<datei>",
  "geprueft": true
}
```

Analog: `wissen/*.json`, `normen.json` (Register: `id`, `zitat`, `gesetz`, `ueberschrift`, `kurz`, `lage`, `wortlaut` (nur aus amtlicher Quelle), `link`, `geprueftAm`), `normkarten/*.json`, `schemata.json` (Baum aus Knoten mit `text`/`norm`/`hinweis`), `drills.json`, `klausuren.json`, `themen.json`, `index.json`.

---

## 9. Qualitätssicherung & Selbstreparatur (Pflicht)

### 9.1 Automatische Prüfungen – `npm run check`

`scripts/validate.mjs` (nur Node, keine Abhängigkeiten) bricht mit verständlicher Fehlerliste (Datei · ID · Problem) und Exit-Code ≠ 0 ab, wenn:
- eine JSON-Datei nicht parsebar ist, Pflichtfelder fehlen oder falsche Typen haben, IDs doppelt sind, `index.json` und tatsächliche Datendateien nicht übereinstimmen;
- MC: `single` nicht genau eine richtige Option hat; `multi` nicht ≥ 1 richtige und ≥ 1 falsche; eine Option keine Erklärung hat; Optionstexte doppelt sind;
- Fälle: Raster- plus Gutachtenstil-Punkte ≠ Gesamtpunkte; ein Abschnitt der Musterlösung keinen Rasterpunkt hat; erwartete Normen nicht im Register stehen;
- irgendeine zitierte Norm (per Normen-Parser aus **allen** Texten extrahiert) nicht im Normenregister steht → fängt Tippfehler wie „§ 197" statt „§ 179";
- ein A-Thema seine Zielmengen unterschreitet (Abdeckungsreport ausgeben);
- in HTML/CSS/JS/Manifest referenzierte Dateien fehlen (exakte Groß-/Kleinschreibung) oder absolute Pfade vorkommen;
- Verbotenes drin ist: getrackte Materialdateien (`git ls-files`), PDFs/Scans in `site/`, API-Key-Muster (`sk-ant-`), oder der Versions-Platzhalter im Quellcode fehlt (Stamp-Mechanismus kaputt).

`tests/*.test.mjs` (node:test) für: MC-Bewertung unter allen Regeln, Notenschlüssel (Grenzwerte!), SRS-Fälligkeiten, Normen-Parser (viele Schreibweisen inkl. `§§ 119, 123 BGB`, `§ 119 Abs. 1 Alt. 2`, `Art. 6 I lit. f DSGVO`), Storage-Migration und kaputte Daten, KI-Antwort-Parser (gültiges JSON, JSON im Fließtext/Codeblock, Müll, Punkte außerhalb des Bereichs), KI-Request-Aufbau und Fehlerzuordnung (per Mock, ohne echten Key).

**E2E** (Playwright, wenn installierbar – lokal und in der CI; sonst ein Node-Smoke-Test, der den lokalen Server startet und alle Routen und Datendateien auf HTTP 200 prüft): jede Route ohne Konsolenfehler; MC beantworten → Feedback sichtbar; Fall öffnen → Text tippen → Reload → Text noch da; Klausur starten und abgeben → Auswertung; Viewport 375 px ohne horizontales Scrollen; Dark Mode lesbar. Flaky Tests reparieren (stabile Selektoren, keine festen Wartezeiten), nicht abschalten. Kannst du Screenshots erzeugen und ansehen, prüfe Desktop- und Handyansicht visuell und behebe Layoutfehler.

### 9.2 Juristischer Faktencheck
- Jede Norm im Register gegen den amtlichen Text prüfen (gesetze-im-internet.de, EUR-Lex), sofern du Internetzugang hast; Prüfdatum eintragen. Ohne Internet gewissenhaft aus deinem Wissen, Unsicheres in `docs/REVIEW.md`.
- Nach jedem Inhaltsbatch Review mit Korrektorenbrille: Rechtsaussage nach geltendem Recht richtig? Zitat exakt (Paragraph/Artikel, Absatz, Satz, Nummer, Alternative/Buchstabe)? MC eindeutig? Musterlösung passt zum Sachverhalt und ist durchgehend Gutachtenstil? Punkteraster plausibel?
- **Unabhängiger Zweitkorrektor:** Kannst du Subagenten starten, lass jeden Batch von einem frischen Subagenten prüfen, der nur die Inhalte sieht, nicht deine Herleitung. Sonst einen eigenen zweiten Durchgang Punkt für Punkt gegen diese Checkliste. Befunde → korrigieren → erneut validieren → in `docs/REVIEW.md` abhaken.
- **Bekannte Stolperstellen ausdrücklich prüfen:**
  - § 122 nur bei § 118 und Anfechtung nach §§ 119, 120 (nicht § 123); ausgeschlossen nach § 122 Abs. 2.
  - Fristen § 121 (unverzüglich) vs. § 124 (ein Jahr); Anfechtungsgegner nach § 143.
  - § 142 Abs. 2 (Kenntnis der Anfechtbarkeit = Kenntnis der Nichtigkeit) im Zusammenspiel mit § 179.
  - § 179 Abs. 3 S. 1 (Kenntnis/Kennenmüssen des Geschäftsgegners) und S. 2 (beschränkt geschäftsfähiger Vertreter); § 165.
  - § 110 verlangt vollständiges „Bewirken" (Ratenkauf erst mit der letzten Rate); § 107 lediglich rechtlicher Vorteil; § 108 schwebende Unwirksamkeit und Genehmigung; § 109 Widerruf des Vertragspartners.
  - Vollmacht: Legaldefinition § 166 Abs. 2 S. 1, Erteilung § 167 Abs. 1 (Innen-/Außenvollmacht); Versteigerung: Vertragsschluss durch Zuschlag (§ 156).
  - DSGVO: Meldung an die Aufsicht binnen 72 Stunden (Art. 33 Abs. 1); Bußgeldrahmen Art. 83 Abs. 4 (10 Mio. € / 2 %) und Abs. 5 (20 Mio. € / 4 %); Einwilligung von Kindern in Deutschland ab 16 (Art. 8 Abs. 1); Antwortfrist bei Betroffenenanfragen grundsätzlich ein Monat (Art. 12 Abs. 3); Cookies § 25 TDDDG (hieß bis Mai 2024 TTDSG).
- **Rechtsstand** (mit Datum im Footer): maßgeblich ist geltendes Recht bzw. der Stand der Vorlesung. Laufende Reformen nur als Info-Hinweis, nie als MC-Lösung: der EU-„Digital Omnibus" zur DSGVO (Vorschlag 11/2025, Ende Juli 2026 noch nicht verabschiedet) und die geplante Aufhebung von § 38 Abs. 1 BDSG (DSB-Pflicht ab 20 Personen; der Bund will die Aufhebung bis Ende 2026 einbringen). Hast du Internet, prüfe den aktuellen Stand und vermerke ihn in `docs/REVIEW.md`.

### 9.3 Reparaturschleife

```
für jede Prüfstufe (lokal → CI → live):
  wiederhole bis grün:
    Fehler vollständig lesen → Ursache finden (nicht nur das Symptom) → beheben
    bei Logikfehlern: Regressionstest ergänzen
    erneut prüfen
  nach 5 erfolglosen Versuchen am selben Fehler:
    sauberen Workaround bauen, in docs/FIXLOG.md dokumentieren
    (Fehler, Ursache, Versuche, Lösung) und weiterarbeiten
```
Jeden behobenen Fehler kurz in `docs/FIXLOG.md` festhalten.

### 9.4 Fehlende Werkzeuge
- `node --version` < 20 oder fehlt? Frag mich einmal, ob du die LTS-Version installieren darfst (Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`). Bis dahin Inhalte erstellen – die CI führt die Prüfungen ohnehin aus.
- Playwright nicht installierbar? Node-Smoke-Test nutzen und in `PROGRESS.md` vermerken.
- Kein `gh`? Siehe 10.4.

---

## 10. Deployment auf GitHub Pages (mit Selbstreparatur)

### 10.1 Repository
1. Ist der Ordner schon ein Git-Repo (`git status`) mit Remote (`git remote -v`)?
2. Kein Repo → `git init -b main`, **zuerst** `.gitignore` (Abschnitt 4), dann erster Commit.
3. Git-Identität fehlt → nur für dieses Repo aus meinem GitHub-Konto setzen (`gh api user` → Login und `<id>+<login>@users.noreply.github.com`), sonst fragen.
4. Kein Remote → wenn `gh auth status` erfolgreich ist: `gh repo create klausurtrainer-recht --public --source . --remote origin --push` (bei Namenskonflikt sinnvoll variieren). Ist ein bestehendes Repo privat: Pages geht nur bei öffentlichem Repo oder mit GitHub Pro (gratis im GitHub Student Developer Pack) – dann Hinweis an mich, Sichtbarkeit nicht eigenmächtig ändern.

### 10.2 Workflow `.github/workflows/pages.yml`
Deployment nur, wenn alle Tests grün sind. Referenz – Stand Oktober 2026 sind das die aktuellen Major-Versionen; meldet die CI eine Deprecation, auf die neueste Major-Version anheben:

```yaml
name: Test & Deploy
on:
  push:
    branches: [main, master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      # falls devDependencies existieren:  - run: npm ci
      - run: npm run check
      # falls E2E eingerichtet:  - run: npx playwright install --with-deps chromium && npm run e2e
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: node scripts/stamp-version.mjs "${{ github.sha }}"
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v5
```

### 10.3 Pages aktivieren und Lauf überwachen
1. Pages auf „GitHub Actions" stellen: `gh api --method POST repos/{owner}/{repo}/pages -f build_type=workflow` (existiert die Pages-Seite schon: dasselbe mit `--method PUT`).
2. Pushen und den Lauf verfolgen: `gh run list --limit 1`, dann `gh run watch <id> --exit-status`. Fehlgeschlagen → `gh run view <id> --log-failed` lesen → reparieren → erneut pushen (Reparaturschleife 9.3).
3. Live-URL holen: `gh api repos/{owner}/{repo}/pages --jq .html_url`.
4. `npm run live-check -- <url>`: Startseite liefert HTTP 200, `version.json` enthält den aktuellen Commit-SHA (`git rev-parse HEAD`), alle Datendateien und Assets erreichbar. Direkt nach dem ersten Deployment kann Pages einige Minuten brauchen → bis zu 10 Minuten mit wachsenden Abständen erneut versuchen.
5. Live-URL in `README.md` eintragen und als Website des Repos setzen (`gh repo edit --homepage <url>`).

### 10.4 Ohne `gh` bzw. ohne Push-Rechte
Alles lokal fertigstellen und mir dann eine kurze Schritt-für-Schritt-Anleitung geben: (a) GitHub CLI installieren und `gh auth login` **oder** Repo auf github.com anlegen und `git remote add origin …` + `git push`; (b) Repo → Settings → Pages → Source: „GitHub Actions". Danach geht es mit „Lies PROGRESS.md und mach weiter" weiter.

---

## 11. Meilensteine (Reihenfolge)

- **M0 Setup:** Inventar, Themenkarte, Klausurformat · Git + `.gitignore` · Grundgerüst (Navigation, Router, Store, Fehler-Handler) · `validate.mjs` + Test-Gerüst · Workflow · erstes Deployment einer Platzhalter-Startseite → **Live-URL steht früh**.
- **M1 MVP:** einfaches Dashboard · Datenschutz-MC mit ≥ 40 Fragen · Gutachten-Trainer mit dem Probeklausur-Fall + 3 weiteren Fällen · Normen-Kompass mit Register · Lernstand + Export · alles grün und live.
- **M2 Inhalte komplett:** Mengen aus Abschnitt 7 · Schemata · Wissensfragen · Fehlerprofil-Drills · Fach-Review aller Batches.
- **M3 Lernsystem:** Probeklausur-Simulator · Spaced Repetition · Statistik · Lernplan · PWA/offline.
- **M4 KI & Feinschliff:** KI-Korrektur · Design, Mobile, Barrierefreiheit, Performance.
- **M5 Abschluss-QA:** Gesamt-Review aller Inhalte · `npm run check`, E2E/Smoke, CI und Live-Check grün · README, CLAUDE.md/AGENTS.md, PROGRESS.md aktuell.

---

## 12. Dokumentation für später

- `README.md`: Live-URL · Funktionen · lokal starten (`npm run serve`) · prüfen (`npm run check`) · Inhalte ergänzen (Datenformate) · Update-/Cache-Hinweis (Service Worker, `?reset-sw`) · „Zum Home-Bildschirm hinzufügen" am Handy.
- `CLAUDE.md` bzw. `AGENTS.md`: Kurzregeln für spätere Agent-Sitzungen (Struktur, Formate, vor jedem Commit `npm run check`, Inhalte nur mit Normzitat und Review, keine Materialien committen, Reparaturschleife, Deployment-Ablauf).

---

## 13. Definition of Done

- [ ] Jede Materialdatei verarbeitet; INVENTAR, THEMENKARTE, KLAUSURFORMAT vollständig
- [ ] Alle Module aus Abschnitt 6 funktionieren; KI-Korrektur ohne Key ausgeblendet, Request-Aufbau und Fehlerpfade per Mock getestet
- [ ] Mindestmengen aus Abschnitt 7 erreicht; kein A-Thema unterdeckt; keine ungeprüften Inhalte
- [ ] Probeklausur-Musterlösung setzt alle vier Korrekturhinweise um
- [ ] `npm run check` und E2E/Smoke lokal grün; CI grün
- [ ] Fach-Review für alle Inhalte erledigt; keine offenen kritischen Punkte in `docs/REVIEW.md`
- [ ] Live auf GitHub Pages; Live-Check grün (aktueller Commit-SHA)
- [ ] Handy (375 px) in Ordnung, offline nach dem ersten Besuch, Lernstand übersteht Reload und Update
- [ ] Keine Materialdateien, Scans, Namen oder API-Keys im Repo bzw. auf der Seite
- [ ] README, CLAUDE.md/AGENTS.md und PROGRESS.md aktuell

---

## 14. Abschlussbericht an mich

Kurz und konkret: Live-URL · Inhaltszahlen je Typ · was ich noch selbst tun muss (falls etwas) · offene Punkte aus `docs/REVIEW.md` · bekannte Einschränkungen · wie ich fortsetze („Lies PROGRESS.md und mach weiter").
