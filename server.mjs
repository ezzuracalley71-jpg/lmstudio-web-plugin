import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const rawPath = (req.url || '/').split('?')[0];
    const safePath = normalize(rawPath).replace(/^([.][.][/\\])+/, '');
    const path = safePath === '/' || safePath === '\\' || safePath === '' ? 'index.html' : safePath.replace(/^[/\\]/, '');
    const filePath = join(root, path);

    const content = await readFile(filePath);
    const type = mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
  console.log('Press Ctrl+C to stop.');
});
