// Node-only. Imported exclusively by cypress.config.ts's setupNodeEvents - never by a spec
// file or anything Vite bundles for the browser.

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PORT } from './delayedFileServerConfig';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

const MIME_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
};

export function startTestFileServer(): Promise<{ close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const delayMs = Number(requestUrl.searchParams.get('delayMs') ?? '0');
    const shouldFail = requestUrl.searchParams.get('fail') === 'true';

    setTimeout(() => {
      if (shouldFail) {
        req.socket.destroy();
        return;
      }

      const filePath = path.join(FIXTURES_DIR, decodeURIComponent(requestUrl.pathname));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    }, delayMs);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => {
      resolve({
        close: () => new Promise((resolveClose) => server.close(() => resolveClose())),
      });
    });
  });
}
