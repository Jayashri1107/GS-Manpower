// Local preview of /site at http://localhost:4173 (no dependencies).
//   node serve.js           build once, then serve
//   node serve.js --watch   also rebuild whenever a file in /src changes (npm run dev)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, 'site');
const SRC = path.join(__dirname, 'src');
const PORT = process.env.PORT || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json',
};

function build() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed – fix the error above and save again.');
  }
}

build();

if (process.argv.includes('--watch')) {
  let timer;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
  console.log('Watching /src for changes. Refresh the browser after saving.');
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

// If the port is busy (for example another preview is still open), try the next ones.
let port = Number(PORT);
const lastPort = port + 10;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < lastPort) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port += 1;
    server.listen(port);
  } else {
    console.error(e.code === 'EADDRINUSE' ? `Ports ${PORT} to ${lastPort} are all busy. Close other previews and try again.` : e);
    process.exit(1);
  }
});
server.on('listening', () => console.log(`\nPreview ready: http://localhost:${port}\nPress Ctrl+C to stop.\n`));
server.listen(port);
