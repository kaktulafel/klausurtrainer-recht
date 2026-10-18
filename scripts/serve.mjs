#!/usr/bin/env node
// Minimaler statischer Server für site/ (lokal testen). Nutzung: npm run serve [-- --port 8080]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};

/** Startet den Server. basis z. B. '/klausurtrainer-recht/' simuliert den Pages-Unterpfad. */
export function starteServer(port = 8080, basis = '/') {
  const server = createServer(async (req, res) => {
    try {
      let pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!pfad.startsWith(basis)) { res.writeHead(404); return res.end('Not found'); }
      pfad = '/' + pfad.slice(basis.length);
      const datei = normalize(join(SITE, pfad));
      if (!datei.startsWith(SITE)) { res.writeHead(403); return res.end(); }
      let ziel = datei;
      const s = await stat(ziel).catch(() => null);
      if (s && s.isDirectory()) ziel = join(ziel, 'index.html');
      const inhalt = await readFile(ziel).catch(() => null);
      if (!inhalt) {
        const nf = await readFile(join(SITE, '404.html'));
        res.writeHead(404, { 'content-type': TYPEN['.html'] });
        return res.end(nf);
      }
      res.writeHead(200, { 'content-type': TYPEN[extname(ziel)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(inhalt);
    } catch {
      res.writeHead(500); res.end('Fehler');
    }
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf('--port');
  const port = i > 0 ? +process.argv[i + 1] : 8080;
  starteServer(port).then(() => console.log(`Klausurtrainer läuft auf http://localhost:${port}/  (Strg+C beendet)`));
}
