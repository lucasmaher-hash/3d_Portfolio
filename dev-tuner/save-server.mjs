// Generic dev-only receiver for the page tuners (2026-10-06): a dial on a page
// POSTs JSON to /save/<name>, and it lands in dev-tuner/<name>.json for Claude
// to read. Never deployed (repo root, not public/). Run next to the dev server:
//   node dev-tuner/save-server.mjs     (listens on :5175)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    const m = /^\/save\/([a-z0-9-]+)$/.exec(req.url || '');
    if (req.method !== 'POST' || !m) return res.writeHead(404, cors).end();
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const file = path.join(DIR, m[1] + '.json');
        fs.writeFileSync(file, JSON.stringify({...data, savedAt: new Date().toISOString()}, null, 2));
        console.log('saved', file, JSON.stringify(data));
        res.writeHead(200, {...cors, 'Content-Type': 'application/json'}).end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, cors).end(String(e.message));
      }
    });
  })
  .listen(5175, '0.0.0.0', () => console.log('dev tuner save server on :5175 →', DIR));
