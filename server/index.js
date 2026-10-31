// GS Manpower web server: serves the built website, receives the two forms, and runs the admin panel.
// No dependencies. Start with `npm start` (production) or `npm run dev` (rebuilds when /src changes).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getConfig, ROOT } = require('./config');
const { parseBody } = require('./multipart');
const { validateEnquiry, validateApplication, looksLikeSpam, MAX_FILE_BYTES } = require('./validate');
const { createStore } = require('./store');
const { notifyLead } = require('./notify');
const { verifyPassword } = require('./crypto');
const { editableFields, readContent, saveContent } = require('./content');

const SITE = path.join(ROOT, 'site');
const ADMIN = path.join(__dirname, 'admin');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.ico': 'image/x-icon',
  '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json',
};
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_BODY = MAX_FILE_BYTES + 512 * 1024;

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "frame-ancestors 'none'", "form-action 'self'", "base-uri 'self'", "object-src 'none'",
].join('; ');

// Simple fixed-window rate limiter kept in memory.
function rateLimiter(limit, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.reset) { hits.set(key, { count: 1, reset: now + windowMs }); return true; }
    entry.count += 1;
    if (hits.size > 10000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    return entry.count <= limit;
  };
}

function createApp(cfg, { build } = {}) {
  const store = createStore(cfg);
  const sessions = new Map();
  const formLimit = rateLimiter(cfg.production ? 5 : 100, 10 * 60 * 1000);
  const loginLimit = rateLimiter(5, 15 * 60 * 1000);

  const clientIp = (req) => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';
  const isHttps = (req) => (cfg.trustProxy && req.headers['x-forwarded-proto'] === 'https') || req.socket.encrypted;

  function baseHeaders(req) {
    const h = {
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    };
    if (cfg.production) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    return h;
  }

  function send(req, res, status, body, headers = {}) {
    res.writeHead(status, { ...baseHeaders(req), ...headers });
    res.end(body);
  }
  const json = (req, res, status, obj, headers = {}) =>
    send(req, res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // same-origin form posts from older browsers may omit it
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }

  // ---------- static files ----------
  function serveFile(req, res, root, urlPath, extraHeaders = {}) {
    let file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) return send(req, res, 403, 'Forbidden');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && !path.extname(file) && fs.existsSync(file + '.html')) file += '.html';
    fs.readFile(file, (err, data) => {
      if (err) {
        const notFound = path.join(SITE, urlPath.startsWith('/mr/') ? 'mr' : '', '404.html');
        return fs.existsSync(notFound)
          ? send(req, res, 404, fs.readFileSync(notFound), { 'Content-Type': TYPES['.html'] })
          : send(req, res, 404, 'Not found', { 'Content-Type': TYPES['.txt'] });
      }
      const ext = path.extname(file);
      const cache = cfg.production && urlPath.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache';
      send(req, res, 200, req.method === 'HEAD' ? undefined : data, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache, ...extraHeaders });
    });
  }

  // ---------- public forms ----------
  async function handleForm(req, res, type) {
    if (!sameOrigin(req)) return json(req, res, 403, { ok: false, error: 'origin' });
    if (!formLimit(clientIp(req))) return json(req, res, 429, { ok: false, error: 'Too many submissions. Please call us instead.' });
    let parsed;
    try {
      parsed = parseBody(await readBody(req), req.headers['content-type']);
    } catch (e) {
      return json(req, res, e.status || 400, { ok: false, error: e.status === 413 ? 'The file is too large.' : 'Could not read the form.' });
    }
    const { fields, files } = parsed;
    // Bots get a normal-looking success so they do not retry, but nothing is stored or sent.
    if (looksLikeSpam(fields)) return json(req, res, 200, { ok: true });

    const result = type === 'enquiry' ? validateEnquiry(fields) : validateApplication(fields, files);
    if (Object.keys(result.errors).length) return json(req, res, 422, { ok: false, errors: result.errors });

    const { consent, ...data } = result.value;
    const lead = store.save(type, { ...data, consentAt: new Date().toISOString(), consentText: 'privacy-notice-v1' }, result.resume);
    const adminUrl = `${cfg.publicUrl || `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`}/admin`;
    notifyLead(cfg, lead, adminUrl)
      .then((r) => r.filter((x) => !x.ok).forEach((x) => console.error(`Notification via ${x.channel} failed: ${x.error}`)))
      .catch((e) => console.error('Notification error:', e.message));
    json(req, res, 201, { ok: true });
  }

  // ---------- admin ----------
  function cookieValue(req, name) {
    const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers.cookie || '');
    return m ? m[1] : null;
  }
  function session(req) {
    const token = cookieValue(req, 'gsm_admin');
    const s = token && sessions.get(token);
    if (!s) return null;
    if (Date.now() > s.expires) { sessions.delete(token); return null; }
    s.expires = Date.now() + SESSION_IDLE_MS;
    return { token, ...s };
  }
  const sessionCookie = (req, token, maxAge) =>
    `gsm_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${cfg.production || isHttps(req) ? '; Secure' : ''}`;

  async function handleAdminApi(req, res, url) {
    // Custom header blocks cross-site requests (a browser cannot add it without a CORS preflight we never allow).
    if (req.headers['x-gsm-admin'] !== '1' || !sameOrigin(req)) return json(req, res, 403, { ok: false, error: 'forbidden' });
    const route = url.pathname.replace('/api/admin', '');

    if (route === '/login' && req.method === 'POST') {
      if (!cfg.adminPasswordHash) return json(req, res, 503, { ok: false, error: 'Admin login is not set up. Run npm run setup.' });
      if (!loginLimit(clientIp(req))) return json(req, res, 429, { ok: false, error: 'Too many attempts. Try again in 15 minutes.' });
      let body;
      try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch { return json(req, res, 400, { ok: false }); }
      const userOk = String(body.username || '') === cfg.adminUser;
      const passOk = verifyPassword(String(body.password || ''), cfg.adminPasswordHash);
      if (!userOk || !passOk) { store.audit('-', 'login-failed', clientIp(req)); return json(req, res, 401, { ok: false, error: 'Wrong username or password.' }); }
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { user: cfg.adminUser, expires: Date.now() + SESSION_IDLE_MS });
      store.audit(cfg.adminUser, 'login');
      return json(req, res, 200, { ok: true, user: cfg.adminUser }, { 'Set-Cookie': sessionCookie(req, token, SESSION_IDLE_MS / 1000) });
    }

    const s = session(req);
    if (!s) return json(req, res, 401, { ok: false, error: 'Please log in.' });
    const refresh = { 'Set-Cookie': sessionCookie(req, s.token, SESSION_IDLE_MS / 1000) };

    if (route === '/logout' && req.method === 'POST') {
      sessions.delete(s.token);
      store.audit(s.user, 'logout');
      return json(req, res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }
    if (route === '/me') return json(req, res, 200, { ok: true, user: s.user }, refresh);

    let m;
    if ((m = /^\/export\/(enquiry|application)$/.exec(route)) && req.method === 'GET') {
      const type = m[1];
      const cols = type === 'enquiry'
        ? ['createdAt', 'status', 'organisation', 'contact_name', 'phone', 'email', 'role', 'worker_count', 'location', 'timeline', 'shifts', 'notes', 'lang', 'note']
        : ['createdAt', 'status', 'full_name', 'phone', 'role', 'experience', 'location', 'availability', 'lang', 'note'];
      // Prefix cells that a spreadsheet would run as a formula (CSV injection).
      const cell = (v) => {
        let t = Array.isArray(v) ? v.join(' / ') : String(v ?? '');
        if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
        return `"${t.replace(/"/g, '""')}"`;
      };
      const rows = store.list(type).map((r) => cols.map((c) => cell(r[c])).join(','));
      store.audit(s.user, 'export', `${type} (${rows.length})`);
      return send(req, res, 200, '﻿' + [cols.join(','), ...rows].join('\r\n'), {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gs-manpower-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      });
    }
    if ((m = /^\/leads\/(enquiry|application)$/.exec(route)) && req.method === 'GET') {
      store.audit(s.user, 'list', m[1]);
      const items = store.list(m[1]).map(({ resume, ...r }) => ({ ...r, hasResume: !!resume }));
      return json(req, res, 200, { ok: true, items }, refresh);
    }
    if ((m = /^\/leads\/(enquiry|application)\/([\w-]+)$/.exec(route))) {
      const [, type, id] = m;
      try {
        if (req.method === 'GET') {
          const rec = store.get(type, id);
          store.audit(s.user, 'view', `${type}/${id}`);
          return rec ? json(req, res, 200, { ok: true, item: rec }, refresh) : json(req, res, 404, { ok: false });
        }
        if (req.method === 'PATCH') {
          const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
          const rec = store.update(type, id, { status: body.status, note: body.note });
          store.audit(s.user, 'update', `${type}/${id} status=${rec && rec.status}`);
          return rec ? json(req, res, 200, { ok: true, item: rec }, refresh) : json(req, res, 404, { ok: false });
        }
        if (req.method === 'DELETE') {
          const ok = store.remove(type, id);
          store.audit(s.user, 'delete', `${type}/${id}`);
          return json(req, res, ok ? 200 : 404, { ok }, refresh);
        }
      } catch (e) {
        return json(req, res, 400, { ok: false, error: e.message });
      }
    }
    if ((m = /^\/leads\/application\/([\w-]+)\/resume$/.exec(route)) && req.method === 'GET') {
      let file;
      try { file = store.resume('application', m[1]); } catch { file = null; }
      if (!file) return json(req, res, 404, { ok: false });
      store.audit(s.user, 'download-resume', `application/${m[1]}`);
      return send(req, res, 200, file.data, {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="resume-${m[1]}.${file.ext}"`,
        'Cache-Control': 'no-store',
      });
    }
    if (route === '/content' && req.method === 'GET') {
      return json(req, res, 200, { ok: true, fields: editableFields, values: readContent(cfg) }, refresh);
    }
    if (route === '/content' && req.method === 'PUT') {
      let body;
      try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch { return json(req, res, 400, { ok: false }); }
      const result = saveContent(cfg, body);
      if (!result.ok) return json(req, res, 422, result, refresh);
      try { build && build(); } catch (e) { return json(req, res, 500, { ok: false, error: `Saved, but the site could not be rebuilt: ${e.message}` }, refresh); }
      store.audit(s.user, 'edit-content', Object.keys(result.changed).join(','));
      return json(req, res, 200, { ok: true, values: readContent(cfg) }, refresh);
    }
    if (route === '/audit' && req.method === 'GET') return json(req, res, 200, { ok: true, items: store.readAudit() }, refresh);

    return json(req, res, 404, { ok: false });
  }

  async function handler(req, res) {
    try {
      // Collapse leading slashes: "//x" would otherwise be read as a host name.
      const url = new URL(String(req.url).replace(/^\/+/, '/'), 'http://localhost');
      let p;
      try { p = decodeURIComponent(url.pathname); } catch { return send(req, res, 400, 'Bad request'); }

      if (p === '/healthz') return json(req, res, 200, { ok: true });
      if (p === '/api/enquiry' && req.method === 'POST') return await handleForm(req, res, 'enquiry');
      if (p === '/api/application' && req.method === 'POST') return await handleForm(req, res, 'application');
      if (p.startsWith('/api/admin/')) return await handleAdminApi(req, res, url);
      if (p.startsWith('/api/')) return json(req, res, 404, { ok: false });

      if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Method not allowed');
      if (p === '/admin' || p === '/admin/') return serveFile(req, res, ADMIN, '/index.html', { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      if (p.startsWith('/admin/')) return serveFile(req, res, ADMIN, p.slice('/admin'.length), { 'X-Robots-Tag': 'noindex' });
      return serveFile(req, res, SITE, p);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(req, res, 500, { ok: false, error: 'Server error' });
    }
  }

  return { handler, store, sessions };
}

function start() {
  const cfg = getConfig();
  process.env.CONTENT_FILE = cfg.contentFile;
  fs.mkdirSync(cfg.dataDir, { recursive: true, mode: 0o700 });
  const { build } = require(path.join(ROOT, 'build.js'));

  const runBuild = () => {
    try { console.log(`Built ${build()} indexed pages into /site`); return true; } catch (e) { console.error('Build failed:', e.message); return false; }
  };
  if (!runBuild() && cfg.production) process.exit(1);

  if (process.argv.includes('--watch')) {
    let timer;
    fs.watch(path.join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(runBuild, 150); });
    fs.watch(__dirname, { recursive: false }, () => console.log('Server code changed – restart npm run dev to apply it.'));
    console.log('Watching /src for changes. Refresh the browser after saving.');
  }

  const app = createApp(cfg, { build: runBuild });
  const purge = () => { const n = app.store.purge(cfg.retention); if (n) console.log(`Retention: deleted ${n} expired record(s).`); };
  purge();
  setInterval(purge, 24 * 3600 * 1000).unref();
  setInterval(() => { const now = Date.now(); for (const [t, s] of app.sessions) if (now > s.expires) app.sessions.delete(t); }, 60000).unref();

  const server = http.createServer(app.handler);
  server.requestTimeout = 60000;
  let port = cfg.port;
  const lastPort = port + 10;
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && !cfg.production && port < lastPort) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      port += 1;
      server.listen(port);
    } else {
      console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy. Close the other preview and try again.` : e);
      process.exit(1);
    }
  });
  server.on('listening', () => {
    console.log(`\nWebsite ready:  http://localhost:${port}`);
    console.log(`Admin panel:    http://localhost:${port}/admin${cfg.adminPasswordHash ? '' : '   (not set up yet – run: npm run setup)'}`);
    console.log('Press Ctrl+C to stop.\n');
  });
  server.listen(port);
  return server;
}

module.exports = { createApp };

if (require.main === module) start();
