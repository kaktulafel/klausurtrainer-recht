# Datenformate

Alle Inhalte liegen als JSON unter `site/data/`. Feldnamen sind deutsch, IDs global eindeutig (kebab-case). `npm run check` (`scripts/validate.mjs`) prüft alles hier Beschriebene. Ein Fehler wird als *Datei · ID · Problem* gemeldet.

## Gemeinsame Regeln

| Feld | Bedeutung |
|---|---|
| `id` | eindeutig über alle Dateien (z. B. `fall-07`, `ds-mc-042`, `wi-013`, `nk-088`, `dr-12`, `schema-anfechtung`, `klausur-2`) |
| `thema` / `themen` | ID(s) aus `themen.json` |
| `quelle` | `material:<id>` (Material-ID aus `docs/INVENTAR.md`, z. B. `material:faelle-6`) · `neu` (selbst erstellt) · `zusatz` (über das Material hinaus) |
| `geprueft` | `true` erst nach Fach-Review (`docs/REVIEW.md`). Ungeprüftes zeigt die App mit dem Badge „ungeprüft“. Probeklausuren dürfen **nur** geprüfte Inhalte enthalten. |
| `normen`, Normzitate in Texten | Jede in **irgendeinem** Textfeld zitierte Norm muss im Register `normen.json` stehen. Der Parser (`site/js/normparser.js`) erkennt u. a. `§ 179 Abs. 2 BGB`, `§§ 119, 123 BGB`, `§ 119 Abs. 1 Alt. 2`, `§ 812 I 1 Alt. 1`, `Art. 6 Abs. 1 lit. f DSGVO`, `Art. 6 I f DS-GVO`. Ohne Gesetzesangabe gilt `§` als BGB und `Art.` als DSGVO. Unbekannte Abkürzungen (z. B. `EStG`) werden nicht als BGB gedeutet. |
| Texte | Reiner Text, nie HTML. Erlaubt sind `**fett**` und Zeilenumbrüche `\n` (je Zeile ein Absatz). Normzitate werden automatisch zu Norm-Links. |

## `index.json`
```json
{ "version": 1, "abdeckungPflicht": true,
  "dateien": { "faelle": ["faelle/fall-01.json"], "mc": ["mc/ds-begriffe.json"], "wissen": ["wissen/wissen-at.json"],
               "normkarten": ["normkarten/recht.json"], "einzel": ["themen.json", "normen.json"], "wortlaut": ["wortlaut/wortlaut-1.json"] } }
```
Wird von `node scripts/index-aktualisieren.mjs` aus den vorhandenen Dateien erzeugt. `abdeckungPflicht: true` macht unterdeckte A-Themen und < 5 Drills je Korrekturhinweis zum Fehler. Der Service Worker lädt alle hier gelisteten Dateien für den Offline-Betrieb vor.

## `themen.json`
`{ "version", "hinweis", "themen": [ … ] }`, je Thema:

| Feld | Typ | |
|---|---|---|
| `id`, `titel` | str | |
| `bereich` | `recht` \| `datenschutz` | |
| `gewicht` | `A` \| `B` \| `C` | A = zentral / Erstklausur |
| `kernnormen` | str[] | |
| `fundstelle` | str | Material-IDs und Stellen |
| `erstklausur` | bool, optional | Thema der Erstklausur |
| `ziele` | `{ faelle?, wissen?, mc?, normkarten? }` | Zielmengen (Abdeckungsreport) |
| `hinweis` | str, optional | |

`docs/THEMENKARTE.md` wird daraus mit `npm run docs` erzeugt.

## `mc/*.json` – Datenschutz-Multiple-Choice (Array)
```json
{ "id": "ds-mc-001", "thema": "ds-grundsaetze", "typ": "single", "schwierigkeit": 1,
  "frage": "…",
  "optionen": [ { "id": "a", "text": "…", "korrekt": true, "erklaerung": "… (Art. 5 Abs. 1 lit. c DSGVO)" } ],
  "normen": ["Art. 5 Abs. 1 lit. c DSGVO"], "quelle": "material:ds-schulung", "geprueft": true }
```
- `typ`:
  - `single`: genau eine Option richtig.
  - `multi`: mindestens eine richtige und eine falsche Option.
  - `aussagen`: Aussagenblock, jede Aussage richtig/falsch; `korrekt` = Aussage stimmt.
  - `zuordnung`: statt `optionen` gibt es `ziele: [{id, text}]` und `paare: [{id, text, loesung: <ziel-id>, erklaerung}]`.
- Jede Option braucht eine `erklaerung`. Optionstexte dürfen sich nicht wiederholen.
- **Pur inhaltlich:** Das Gesetz darf in die Klausur. Frage, Optionen, Ziele und Paare nennen keine Normen, Fundstellenfragen sind verboten (Validator). Normen stehen in der `erklaerung`.
- `schwierigkeit`: 1 leicht · 2 mittel · 3 schwer (Ziel ≈ 40/40/20 %, aktuell 39/45/16 %).
- Bewertung von `multi`/`aussagen` nach der eingestellten Regel (`site/js/grading.js`, `MC_REGELN`).

## `faelle/fall-NN.json` – Fälle (ein Objekt je Datei)
| Feld | Typ | Bedeutung |
|---|---|---|
| `id`, `titel`, `kurz` | str | |
| `themen` | str[] | |
| `schwierigkeit` | 1–3 | |
| `minuten` | num | ≥ 60 = klausurgroß (braucht ≥ 1 Abwandlung) |
| `punkte` | num | = Summe `raster` + Summe `gutachtenstil` (geprüft) |
| `sachverhalt`, `fallfragen` | str[] | Absätze; Bearbeitungshinweise als letzte Fallfrage |
| `skizze` | `[{ebene: 1–3, text}]` | Lösungsskizze |
| `kurzSachverhalt` | `string[]` | Sachverhalt in Stichpunkten (wer, was, welche entscheidenden Fakten) für „Fälle kompakt“ |
| `stichpunkte` | `[{ebene: 1–3, text}]` | Stichpunktlösung im Gutachtenstil: Ebene 1 = Prüfung (Überschrift ohne Ergebnis); darunter erste Zeile `**OS:** … könnte …` (Obersatz im Konjunktiv), dann Voraussetzungen, Definition/`**Fraglich:**`, Subsumtion mit Fakten, letzte Zeile `**Erg.:** Folglich …`. Der Validator prüft OS- und Erg.-Zeile. |
| `musterloesung` | `[{id, titel, text}]` | Abschnitte im Gutachtenstil; jeder Abschnitt braucht ≥ 1 Rasterpunkt |
| `raster` | `[{id, abschnitt, kriterium, punkte}]` | `abschnitt` = `musterloesung[].id` |
| `gutachtenstil` | `[{id, kriterium, punkte}]` | eigener Punkteblock für den Stil |
| `erwarteteNormen` | str[] | für Normen-Check; müssen im Register stehen |
| `schluesselbegriffe` | str[] | Alternativen mit `\|`, z. B. `"Erklärungsirrtum\|vertippt"` |
| `typischeFehler` | str[] | |
| `abwandlungen` | `[{frage, kurzloesung}]` | |
| `gefuehrt` | Objekt | geführter Modus, s. u. |

`gefuehrt`:
```json
{ "einstieg": "…",
  "anspruchsgrundlagen": [{ "text": "…", "richtig": true, "feedback": "…" }],
  "obersatzAufgabe": "…", "obersatzMuster": "…",
  "reihenfolgeTitel": "…", "reihenfolge": ["Schritt 1", "Schritt 2"],
  "punkte": [{ "titel": "…", "aufgabe": "…", "tipps": ["Norm: …", "Schema: …", "Mustersatz: …"], "muster": "…" }] }
```
`reihenfolge` ist die richtige Reihenfolge; die App mischt sie für das Puzzle.

## `wissen/*.json` – Wissensfragen (Array)
```json
{ "id": "wi-016", "thema": "geschaeftsfaehigkeit", "schwierigkeit": 1, "klausurantwort": true,
  "frage": "…", "antwort": "… (Musterantwort, Markdown-light)",
  "kernpunkte": ["…", "…"], "stichwoerter": [["Taschengeld|§ 110", "bewirkt"], ["…"]],
  "normen": ["§ 110 BGB"], "quelle": "material:folien", "geprueft": true }
```
- `stichwoerter[i]` gehört zu `kernpunkte[i]` und ist eine Liste von **Gruppen**. Eine Gruppe ist ein String mit Alternativen, getrennt durch `|`.
- Ein Kernpunkt gilt als getroffen, wenn ≥ 60 % seiner Gruppen im Antworttext vorkommen.
- Zahlen und kurze Wörter (≤ 4 Zeichen) müssen exakt passen; längere Wörter werden über den Wortstamm erkannt.
- `klausurantwort: true` markiert eine Frage im Stil der Klausur. Sie wird für Teil B der Zufallsklausur bevorzugt.

## `normkarten/*.json` (Array)
`{ "id": "nk-001", "thema": "…", "problem": "Vorderseite: Problem/Situation", "norm": "§ 362 Abs. 1 BGB", "erklaerung": "…", "quelle", "geprueft" }`

## `normen.json` – Normenregister (Array)
| Feld | Bedeutung |
|---|---|
| `id` | aus dem Zitat abgeleitet: `bgb-179`, `dsgvo-art-6`, `stvg-7` |
| `zitat` | Paragraph/Artikel ohne Absatz, z. B. `§ 179 BGB` |
| `gesetz`, `ueberschrift`, `lage` (Fundort in der Gliederung), `link` | werden von `npm run normen` aus der amtlichen Quelle gesetzt |
| `kurz` | eigene Kurzbeschreibung (Pflicht, von Hand) |
| `wortlaut` | Pfad der Teildatei `wortlaut/wortlaut-N.json` mit dem **amtlichen** Wortlaut (`{ "<id>": "Text" }`). Nie aus dem Gedächtnis. |
| `quelleWortlaut`, `geprueftAm` | `gesetze-im-internet.de` bzw. `EUR-Lex`, Abrufdatum |

**Neue Norm aufnehmen:** `{ "zitat": "§ 188 BGB", "kurz": "…" }` anhängen, dann `npm run normen` ausführen. Das Skript holt Wortlaut, Überschrift, Fundort und Link und teilt den Wortlaut auf. Für ein neues Gesetz trägt man die Kennung in `GII` (gesetze-im-internet.de) bzw. `EURLEX` in `scripts/fetch-normen.mjs` ein. Die Abkürzung gehört außerdem in `GESETZE`/`GESETZ_RE` in `normparser.js`.

## `schemata.json` (Array)
```json
{ "id": "schema-anfechtung", "titel": "…", "thema": "anfechtung", "normen": ["§ 142 Abs. 1 BGB"], "einleitung": "…",
  "knoten": [ { "text": "Anfechtungsgrund", "norm": "§§ 119, 120, 123 BGB", "hinweis": "…",
               "kinder": [ { "text": "…" } ] } ],
  "quelle": "material:folien", "geprueft": true }
```
Die oberste Ebene von `knoten` ist die Puzzle-Reihenfolge. Sie muss eindeutig sein; Alternativen gehören als `kinder` darunter. Das Lückenschema fragt `norm` ab.

## `pruefpfade.json` – Prüfungspfade (Array)
Schemata im Stichpunkt-Gutachtenstil, abgeleitet aus den Fällen: je Anspruchsgrundlage (`art: "anspruch"`) bzw. inzidenter Prüfung (`art: "baustein"`) alle Weichen, die in den Fällen vorkommen. Angezeigt unter „Fälle kompakt → Prüfungspfade“ (`#/uebersicht/pfade`).
```json
{ "id": "pfad-433-2", "art": "anspruch", "titel": "Kaufpreis – § 433 Abs. 2 BGB",
  "ausgangspunkt": "Der Verkäufer will den Kaufpreis.", "grundlagen": ["§ 433 Abs. 2 BGB"], "themen": ["vertragsschluss"],
  "zeilen": [ { "ebene": 1, "text": "**OS:** V könnte …", "faelle": ["fall-02"], "verweis": "pfad-anfechtung" } ],
  "weiter": ["pfad-179"], "quelle": "neu", "geprueft": true }
```
- `zeilen`: Ebene 1–3; erste Zeile `**OS:** … könnte …`, letzte `**Erg.:** Folglich …`. `faelle` = Fälle, in denen diese Weiche vorkommt; `verweis` = anderer Pfad (z. B. Baustein); `weiter` = Anschlussprüfungen.
- `grundlagen` (nur Ansprüche) müssen die Anspruchsgrundlagen aus den Stichpunktlösungen abdecken; jeder Fall muss in mindestens einem Pfad vorkommen (Validator und `tests/kompakt.test.mjs`).

## `karteikarten/*.json` – Karteikarten Recht (Array)
`{ "id": "kk-001", "thema": "…", "typ": "definition|merkmale|schema|abgrenzung|rechtsfolge|falle|merksatz", "vorne": "…", "hinten": "… (Zeilen mit \\n)", "normen": ["§ 110 BGB"], "quelle", "geprueft" }`
Der Stapel umfasst genau 60 Karten (Test). Jedes Thema mit `bereich: recht` braucht mindestens eine Karte (Validator). SRS-Schlüssel `karte:<id>`.

## `cheatsheets.json` – Cheatsheets (Array)
`{ "id": "cs-ansprueche", "titel": "…", "einleitung": "…", "eintraege": [{ "titel": "…", "norm": "…", "text": "…", "punkte": ["…"], "hinweis": "…", "schema": "schema-…", "pfad": "pfad-…" }], "quelle", "geprueft" }`
Je Eintrag `text` oder `punkte`. Das Blatt „Schemata“ erzeugt die App aus `schemata.json`.

## `drills.json` – Klausurtechnik-Drills (Array)
`{ "id": "dr-12", "korrekturhinweis": 1–4, "typ": "fehlersuche|lueckentext|minifall|anfechtung|p179", "thema", "titel", "aufgabe", "antwort", "kernpunkte", "stichwoerter"?, "normen", "quelle", "geprueft" }`
- In einem Lückentext steht jede Lücke als `{{Lösung|Alternative}}` in `aufgabe`.
- Pro Korrekturhinweis sind ≥ 5 Drills Pflicht:
  1. Obersatz/Anfechtung im Anspruchsaufbau
  2. Normzuordnung bei der Stellvertretung
  3. vollständige Anfechtungsprüfung
  4. Regress/§ 179 statt § 122

## `klausuren.json` – feste Probeklausuren (Array)
```json
{ "id": "klausur-1", "titel": "…", "beschreibung": "…", "minuten": 90,
  "teile": {
    "A": { "titel": "Teil A – Fallbearbeitung", "fall": "fall-02", "punkte": 48, "empfohleneMinuten": 55 },
    "B": { "titel": "Teil B – Wissensfragen", "wissen": ["wi-016", "wi-047", "wi-012", "wi-032"], "punkteJe": 3, "empfohleneMinuten": 15 },
    "C": { "titel": "Teil C – Datenschutz (Multiple Choice)", "mc": ["ds-mc-…"], "punkteJe": 1, "empfohleneMinuten": 20 } } }
```
Alle referenzierten Inhalte müssen existieren und geprüft sein. Die Zufallsklausur baut `site/js/klausur-core.js` zur Laufzeit im gleichen Format.

## Lernstand (Browser, `localStorage`)
Schlüssel mit Präfix `nk-recht:`; Schema in `site/js/storage-core.js` (`SCHEMA = 5`, Migrationen in `MIGRATIONEN`; v2 → v3 setzt nur den Lernstand neu gefasster MC-Fragen zurück, v3 → v4 füllt ein leeres Klausurdatum, v4 → v5 hebt den alten Standard von 60 auf 240 Lernminuten):
```json
{ "schema": 5, "einstellungen": { "klausurdatum": "2026-11-09", "mcRegel": "abzug", "notenschluessel": null, "theme": "system", "kiModell": "…", "kiNurSitzung": false, "tagesminuten": 240 },
  "srs": { "mc:ds-mc-001": { "fach": 2, "faellig": "2026-10-21", "anzahl": 3, "richtig": 2, "teilweise": 0, "falsch": 1, "zuletzt": "2026-10-19", "letzte": "richtig" } },
  "entwuerfe": { "fall:fall-01:klausur": { "text": "…", "aktualisiert": "…" } },
  "versuche": { "faelle": [], "klausuren": [], "mc": [] }, "serie": ["2026-10-19"] }
```
- SRS-Schlüssel haben die Form `typ:id`. Typen: `mc`, `wissen`, `nk`, `karte`, `zitat`, `schema`, `schema-luecke`, `schema-fall`, `skizze`, `drill`.
- Der API-Key liegt getrennt unter `nk-recht:ki-key` (bzw. in `sessionStorage`). Er ist nie Teil des Exports, und ein Import mit `sk-ant-` wird abgelehnt.
