import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baueFallRequest, baueWissenRequest, baueTestRequest, leseAntwort, extrahiereJson, normalisiereKorrektur, normalisiereWissen, sende, fehlerMeldung, schwaerze, API_URL } from '../site/js/ai.js';

const fall = {
  sachverhalt: ['A verkauft B ein Rad.'], fallfragen: ['Ansprüche?'],
  musterloesung: [{ id: 'A', titel: 'A. Anspruch', text: 'B könnte …' }],
  raster: [{ id: 'r1', abschnitt: 'A', kriterium: 'Obersatz', punkte: 2 }, { id: 'r2', abschnitt: 'A', kriterium: 'Angebot', punkte: 3 }],
  gutachtenstil: [{ id: 'g1', kriterium: 'Stil', punkte: 4 }]
};
const KEY = 'sk-ant-test-0000';

test('Request-Aufbau: URL, Header, Body', () => {
  const r = baueFallRequest({ apiKey: KEY, modell: 'claude-haiku-5-5', fall, text: 'Meine Lösung' });
  assert.equal(r.url, API_URL);
  assert.equal(r.init.method, 'POST');
  assert.equal(r.init.headers['x-api-key'], KEY);
  assert.equal(r.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(r.init.headers['content-type'], 'application/json');
  assert.equal(r.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  const body = JSON.parse(r.init.body);
  assert.equal(body.model, 'claude-haiku-5-5');
  assert.equal(body.max_tokens, 16000);
  assert.match(body.system, /mit einem JSON-Objekt/);
  assert.equal(body.messages[0].role, 'user');
  assert.match(body.messages[0].content, /r2 \(max\. 3 P\./);
  assert.match(body.messages[0].content, /Meine Lösung/);
  assert.equal(body.messages[0].content.includes(KEY), false, 'Key darf nicht im Prompt stehen');
});

test('Request ohne Key wirft; Standardmodell', () => {
  assert.throws(() => baueFallRequest({ apiKey: '', fall, text: 'x' }), /API-Key/);
  assert.equal(JSON.parse(baueTestRequest({ apiKey: KEY }).init.body).model, 'claude-sonnet-5-5');
  const w = baueWissenRequest({ apiKey: KEY, frage: { frage: 'F?', antwort: 'A', kernpunkte: ['k0', 'k1'] }, text: 't' });
  assert.match(JSON.parse(w.init.body).messages[0].content, /1: k1/);
});

test('Antwort: nur Text-Blöcke, max_tokens-Hinweis', () => {
  const r = leseAntwort({ content: [{ type: 'thinking', thinking: 'geheim' }, { type: 'text', text: 'Hallo ' }, { type: 'tool_use' }, { type: 'text', text: 'Welt' }], stop_reason: 'max_tokens' });
  assert.equal(r.text, 'Hallo Welt');
  assert.equal(r.gekuerzt, true);
  assert.equal(leseAntwort({ content: [], stop_reason: 'end_turn' }).gekuerzt, false);
  assert.throws(() => leseAntwort({}), /Antwortformat/);
});

test('JSON-Extraktion: rein, Codeblock, Fließtext, Müll', () => {
  assert.deepEqual(extrahiereJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extrahiereJson('Hier:\n```json\n{"a":2}\n```\nfertig'), { a: 2 });
  assert.deepEqual(extrahiereJson('Ergebnis: {"a":{"b":"x}"}} Ende.'), { a: { b: 'x}' } });
  assert.equal(extrahiereJson('kein json'), null);
  assert.equal(extrahiereJson('{kaputt: }'), null);
  assert.equal(extrahiereJson(undefined), null);
});

test('Korrektur normalisieren: Begrenzung und eigene Summen', () => {
  const ki = { raster: [{ id: 'r1', punkte: 5, begruendung: 'zu viel' }, { id: 'r2', punkte: '1,5' }, { id: 'rX', punkte: 9 }], gutachtenstil: [{ id: 'g1', punkte: -2 }], summe: 999, tipps: ['a', 'b', 'c', 7] };
  const n = normalisiereKorrektur(ki, fall);
  assert.equal(n.raster[0].punkte, 2);
  assert.equal(n.raster[1].punkte, 1.5);
  assert.equal(n.stil[0].punkte, 0);
  assert.equal(n.summe, 3.5);
  assert.equal(n.max, 9);
  assert.deepEqual(n.tipps, ['a', 'b', 'c']);
  const leer = normalisiereKorrektur({}, fall);
  assert.equal(leer.summe, 0);
  assert.match(leer.raster[0].begruendung, /nicht bewertet/);
  assert.throws(() => normalisiereKorrektur(null, fall), /JSON/);
});

test('Wissen normalisieren', () => {
  const n = normalisiereWissen({ kernpunkte: [{ index: 1, erfuellt: true }], feedback: 'ok' }, { kernpunkte: ['a', 'b'] });
  assert.equal(n.erfuellt, 1); assert.equal(n.kernpunkte[0].erfuellt, false); assert.equal(n.kernpunkte[1].erfuellt, true);
});

const mockFetch = (antwort) => async () => antwort;

test('sende: Erfolg per Mock', async () => {
  const r = await sende(baueTestRequest({ apiKey: KEY }), { fetchImpl: mockFetch({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn' }) }) });
  assert.equal(r.text, 'OK');
});

test('sende: Fehlerzuordnung 401/429/529/500/Netz/Timeout ohne Key in Meldung', async () => {
  const req = baueTestRequest({ apiKey: KEY });
  for (const [status, art] of [[401, 'auth'], [429, 'limit'], [529, 'ueberlastet'], [500, 'server'], [404, 'modell']]) {
    await assert.rejects(sende(req, { fetchImpl: mockFetch({ ok: false, status, json: async () => ({}) }) }), e => e.art === art && !e.message.includes(KEY));
  }
  await assert.rejects(sende(req, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), e => e.art === 'netz');
  await assert.rejects(sende(req, { timeoutMs: 10, fetchImpl: (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); })) }), e => e.art === 'timeout');
  await assert.rejects(sende(req, { fetchImpl: mockFetch({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }) }), e => e.art === 'format');
});

test('Fehlermeldungen und Schwärzen', () => {
  assert.match(fehlerMeldung(401).message, /ungültig/);
  assert.match(fehlerMeldung(529).message, /überlastet/);
  assert.equal(schwaerze('key sk-ant-api03-ABC_def-123 drin'), 'key sk-ant-*** drin');
});
