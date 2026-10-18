// Einstellungen: Klausurdatum, MC-Regel, Notenschlüssel, Farbschema, Lernstand-Export/-Import, Reset, KI-Korrektur.
import { h, karte, status, toast } from '../ui/dom.js';
import * as store from '../store.js';
import { MC_REGELN, STANDARD_NOTENSCHLUESSEL, validiereNotenschluessel } from '../grading.js';
import { MODELLE, baueTestRequest, sende, KIFehler } from '../ai.js';

export function render(main) {
  const e = store.einstellungen();
  const speichere = (fn) => { store.update(z => fn(z.einstellungen), { sofort: true }); toast('Gespeichert'); };

  // Lernplan
  const datum = h('input', { type: 'date', id: 'set-datum', value: e.klausurdatum || '' });
  datum.addEventListener('change', () => speichere(s => { s.klausurdatum = datum.value || null; }));
  const minuten = h('select', { id: 'set-min' }, [30, 45, 60, 90, 120, 180].map(m => h('option', { value: String(m), selected: m === e.tagesminuten }, `${m} Minuten`)));
  minuten.addEventListener('change', () => speichere(s => { s.tagesminuten = parseInt(minuten.value, 10); }));

  // Bewertung
  const regel = h('select', { id: 'set-regel' }, Object.entries(MC_REGELN).map(([k, v]) => h('option', { value: k, selected: k === e.mcRegel }, v)));
  regel.addEventListener('change', () => speichere(s => { s.mcRegel = regel.value; }));
  const ns = e.notenschluessel || STANDARD_NOTENSCHLUESSEL;
  const nsText = h('textarea', { id: 'set-ns', rows: 6, 'aria-label': 'Notenschlüssel' });
  nsText.value = ns.map(x => `${x.ab} ${x.note}`).join('\n');
  nsText.style.minHeight = '160px';
  const nsSpeichern = h('button', { type: 'button', class: 'btn klein', onclick: () => {
    const neu = nsText.value.split('\n').map(z => z.trim()).filter(Boolean).map(z => { const [ab, ...rest] = z.split(/\s+/); return { ab: parseFloat(ab.replace(',', '.')), note: rest.join(' ') }; });
    if (!validiereNotenschluessel(neu)) { toast('Ungültig: je Zeile „Prozent Note“, eine Zeile mit 0 nötig.'); return; }
    speichere(s => { s.notenschluessel = neu; });
  } }, 'Notenschlüssel speichern');
  const nsReset = h('button', { type: 'button', class: 'btn klein leise', onclick: () => { speichere(s => { s.notenschluessel = null; }); nsText.value = STANDARD_NOTENSCHLUESSEL.map(x => `${x.ab} ${x.note}`).join('\n'); } }, 'Standard');

  // Farbschema
  const theme = h('select', { id: 'set-theme' }, [['system', 'wie System'], ['hell', 'hell'], ['dunkel', 'dunkel']].map(([k, v]) => h('option', { value: k, selected: k === e.theme }, v)));
  theme.addEventListener('change', () => { speichere(s => { s.theme = theme.value; }); location.reload(); });

  // Export / Import
  const exportDatei = () => {
    const blob = new Blob([store.exportText()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `lernstand-nk-recht-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  };
  const textfeld = h('textarea', { id: 'set-io', rows: 4, 'aria-label': 'Lernstand als Text', placeholder: 'Hier Export-Text einfügen (Import) oder erzeugen (Export) …' });
  textfeld.style.minHeight = '120px';
  const exportText = async () => {
    textfeld.value = store.exportText();
    try { await navigator.clipboard.writeText(textfeld.value); toast('Lernstand in die Zwischenablage kopiert.'); }
    catch { textfeld.select(); toast('Text markiert – bitte kopieren.'); }
  };
  const importieren = (text) => {
    try {
      if (!confirm('Aktuellen Lernstand durch den importierten ersetzen? (Der alte wird als Backup im Browser gesichert.)')) return;
      store.importText(text);
      toast('Import erfolgreich.');
      setTimeout(() => location.reload(), 600);
    } catch (err) { toast(err.message, 5000); }
  };
  const datei = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Lernstand-Datei wählen' });
  datei.addEventListener('change', async () => { const f = datei.files[0]; if (f) importieren(await f.text()); });

  // KI
  const key = h('input', { type: 'password', id: 'set-key', autocomplete: 'off', placeholder: store.apiKey() ? '•••••••• (gespeichert)' : 'sk-ant-…', 'aria-describedby': 'key-hinweis' });
  const nurSitzung = h('input', { type: 'checkbox', id: 'set-sitzung', checked: e.kiNurSitzung });
  const modell = h('input', { type: 'text', id: 'set-modell', value: e.kiModell, list: 'modelle' });
  const modellListe = h('datalist', { id: 'modelle' }, MODELLE.map(m => h('option', { value: m.id }, m.label)));
  const kiStatus = h('p', { 'aria-live': 'polite' }, store.apiKey() ? status('ok', 'Key hinterlegt – KI-Korrektur ist sichtbar') : status('info', 'Kein Key – KI-Funktionen sind ausgeblendet'));
  const keySpeichern = h('button', { type: 'button', class: 'btn klein', onclick: () => {
    store.update(z => { z.einstellungen.kiModell = modell.value.trim() || MODELLE[0].id; z.einstellungen.kiNurSitzung = nurSitzung.checked; }, { sofort: true });
    if (key.value.trim()) store.setzeApiKey(key.value.trim(), nurSitzung.checked);
    key.value = '';
    key.placeholder = store.apiKey() ? '•••••••• (gespeichert)' : 'sk-ant-…';
    kiStatus.replaceChildren(store.apiKey() ? status('ok', 'Gespeichert – KI-Korrektur ist sichtbar') : status('info', 'Kein Key hinterlegt'));
  } }, 'Speichern');
  const keyLoeschen = h('button', { type: 'button', class: 'btn klein leise', onclick: () => { store.loescheApiKey(); key.placeholder = 'sk-ant-…'; kiStatus.replaceChildren(status('info', 'Key gelöscht')); } }, 'Key löschen');
  const testen = h('button', { type: 'button', class: 'btn klein sekundaer', onclick: async () => {
    if (!store.apiKey()) { kiStatus.replaceChildren(status('falsch', 'Erst einen Key speichern.')); return; }
    kiStatus.replaceChildren('Teste Verbindung …');
    try {
      const r = await sende(baueTestRequest({ apiKey: store.apiKey(), modell: modell.value.trim() || store.einstellungen().kiModell }), { timeoutMs: 30000 });
      kiStatus.replaceChildren(status('ok', 'Verbindung funktioniert'), ` (Antwort: „${r.text.slice(0, 40)}“)`);
    } catch (err) { kiStatus.replaceChildren(status('falsch', err instanceof KIFehler ? err.message : 'Unbekannter Fehler')); }
  } }, 'Verbindung testen');

  main.append(
    h('h1', null, 'Einstellungen'),
    karte(h('h2', null, 'Lernplan'),
      h('label', { for: 'set-datum' }, 'Datum der Nachklausur'), datum,
      h('label', { for: 'set-min' }, 'Lernzeit pro Tag'), minuten),
    karte(h('h2', null, 'Bewertung'),
      h('label', { for: 'set-regel' }, 'Standard-Bewertungsregel für Multiple Choice'), regel,
      h('p', { class: 'klein leise' }, 'Die echte Regel der Klausur ist unbekannt (siehe Info). Standard: Teilpunkte mit Abzug, min. 0 je Frage.'),
      h('label', { for: 'set-ns' }, 'Notenschlüssel (je Zeile: Mindestprozent Note)'), nsText, h('div', { class: 'btn-reihe' }, nsSpeichern, nsReset)),
    karte(h('h2', null, 'Darstellung'), h('label', { for: 'set-theme' }, 'Farbschema'), theme),
    karte(h('h2', null, 'Lernstand sichern & übertragen'),
      h('p', { class: 'klein leise' }, 'Der Lernstand liegt nur in diesem Browser. Für Handy ↔ Laptop: als Datei oder Text exportieren und dort importieren. Der API-Key wird nie exportiert.'),
      h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn', onclick: exportDatei }, 'Als Datei exportieren'), h('button', { type: 'button', class: 'btn sekundaer', onclick: exportText }, 'Als Text kopieren')),
      textfeld,
      h('div', { class: 'btn-reihe' }, h('button', { type: 'button', class: 'btn sekundaer', onclick: () => importieren(textfeld.value) }, 'Text importieren')),
      h('label', null, 'Datei importieren'), datei),
    karte(h('h2', null, 'KI-Korrektur (optional)'),
      h('p', { id: 'key-hinweis', class: 'klein' }, status('teil', 'Achtung'), ' Der Key wird nur in diesem Browser gespeichert (wahlweise nur für diese Sitzung) und direkt an api.anthropic.com gesendet. Auf geteilten Geräten nicht speichern bzw. „nur Sitzung“ wählen. Kosten trägt dein Anthropic-Konto.'),
      h('label', { for: 'set-key' }, 'Anthropic API-Key'), key,
      h('label', { class: 'check', for: 'set-sitzung' }, nurSitzung, h('span', null, 'Nur für diese Sitzung speichern (wird beim Schließen des Tabs gelöscht)')),
      h('label', { for: 'set-modell' }, 'Modell'), modell, modellListe,
      h('p', { class: 'klein leise' }, MODELLE.map(m => `${m.id}: ${m.label}`).join(' · ')),
      h('div', { class: 'btn-reihe' }, keySpeichern, testen, keyLoeschen), kiStatus),
    karte(h('h2', null, 'Zurücksetzen'),
      h('p', { class: 'klein' }, 'Löscht Fortschritt, Entwürfe und Verlauf in diesem Browser (vorher wird ein Backup im Browser angelegt).'),
      h('button', { type: 'button', class: 'btn gefahr', onclick: () => {
        if (!confirm('Wirklich ALLES zurücksetzen? Fortschritt, Entwürfe und Verlauf gehen verloren.')) return;
        if (prompt('Zur Bestätigung bitte LÖSCHEN eintippen:') !== 'LÖSCHEN') { toast('Abgebrochen.'); return; }
        store.zuruecksetzen(); toast('Zurückgesetzt.'); setTimeout(() => { location.hash = '#/'; location.reload(); }, 500);
      } }, 'Alles zurücksetzen'),
      h('p', { class: 'klein leise' }, 'Probleme nach einem Update? Seite mit „?reset-sw“ aufrufen – setzt nur den Offline-Cache zurück, nicht den Lernstand.'))
  );
}
