// Tiny receiver for the wash tuner: the page POSTs its current settings here
// (on load and on every change), and they land in wash-tuner/settings.json,
// where they can be read and put into the film. Dev only — run it next to the
// Vite dev server:  node wash-tuner/save-server.mjs   (listens on :5174)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'settings.json');
const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    if (req.method === 'GET') {
      const body = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '{}';
      return res.writeHead(200, {...cors, 'Content-Type': 'application/json'}).end(body);
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const s = JSON.parse(body);
          if (!s.tt || !s.map) throw new Error('missing tt/map');
          fs.writeFileSync(FILE, JSON.stringify({...s, savedAt: new Date().toISOString(), from: req.headers['user-agent']}, null, 2));
          res.writeHead(200, {...cors, 'Content-Type': 'application/json'}).end('{"ok":true}');
        } catch (e) {
          res.writeHead(400, cors).end(String(e.message));
        }
      });
      return;
    }
    res.writeHead(405, cors).end();
  })
  .listen(5174, '0.0.0.0', () => console.log('wash tuner save server on :5174 →', FILE));
