'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

/** Serve only the built app, on IPv4 loopback; never expose the repository. */
async function startServer({ root, port = 4173 }) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  const realRoot = await fs.realpath(root);
  await fs.access(path.join(realRoot, 'index.html'));
  const server = http.createServer(async (request, response) => {
    const finish = (status, body) => { response.writeHead(status); response.end(request.method === 'HEAD' ? undefined : body); };
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-cache');
    // Blocks DNS rebinding, without granting CORS access to arbitrary sites.
    const host = request.headers.host;
    if (host !== `127.0.0.1:${server.address().port}` && host !== `localhost:${server.address().port}`) return finish(403, 'Forbidden host');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return finish(405, 'Method not allowed');
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(p => p === '..' || p.startsWith('.'))) return finish(404, 'Not found');
      const file = path.resolve(realRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(realRoot, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return finish(404, 'Not found');
      const realFile = await fs.realpath(file);
      const realRelative = path.relative(realRoot, realFile);
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative) || !(await fs.stat(realFile)).isFile()) return finish(404, 'Not found');
      const body = await fs.readFile(realFile);
      response.setHeader('Content-Type', types[path.extname(realFile)] || 'application/octet-stream');
      response.setHeader('Content-Length', body.length);
      finish(200, body);
    } catch (error) {
      if (error instanceof URIError) return finish(400, 'Invalid URL');
      if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code)) return finish(404, 'Not found');
      console.error('Static server error:', error.message);
      finish(500, 'Internal server error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}
module.exports = { startServer };
