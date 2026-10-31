// End-to-end tests for the form backend and admin API. Run with `npm test`.
// Uses a temporary data folder and a test-only key; never touches ./data.
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { createApp } = require('../server/index');
const { hashPassword, encrypt, decrypt } = require('../server/crypto');
const { parseMultipart } = require('../server/multipart');
const { sniffDocument } = require('../server/validate');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-test-'));
const PASSWORD = 'test-password-123';
const cfg = {
  production: false, port: 0, dataDir, dataKey: crypto.randomBytes(32),
  contentFile: path.join(dataDir, 'content.json'), adminUser: 'admin', adminPasswordHash: hashPassword(PASSWORD),
  trustProxy: false, publicUrl: '', retention: { enquiryDays: 730, applicationDays: 365 },
  notify: { resendKey: '', emailFrom: '', emailTo: [], webhookUrl: '', waToken: '', waPhoneId: '', waTo: [] },
};
let server, base, rebuilds = 0;

test.before(async () => {
  const app = createApp(cfg, { build: () => { rebuilds++; } });
  server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

const started = () => String(Date.now() - 10000);
function enquiryForm(overrides = {}) {
  const f = new FormData();
  const v = {
    organisation: 'Sample Hospital', contact_name: 'Test Person', phone: '98765 43210', email: '', role: 'GDA and ward attendants',
    worker_count: '12', location: 'Waluj MIDC', timeline: 'Within 2 weeks', consent: 'yes', started_at: started(),
    company_website: '', lang: 'en', ...overrides,
  };
  for (const [k, val] of Object.entries(v)) if (val !== null) f.append(k, val);
  if (!('shifts' in overrides)) { f.append('shifts', 'Day'); f.append('shifts', 'Night'); }
  return f;
}
function applicationForm(overrides = {}, file) {
  const f = new FormData();
  const v = {
    full_name: 'Test Applicant', phone: '9876543210', role: 'Housekeeping staff', experience: '1 to 3 years', location: 'CIDCO',
    availability: 'Immediately', consent: 'yes', started_at: started(), company_website: '', ...overrides,
  };
  for (const [k, val] of Object.entries(v)) f.append(k, val);
  if (file) f.append('resume', new Blob([file.data]), file.name);
  return f;
}
const post = (url, body) => fetch(base + url, { method: 'POST', body });
const admin = (method, url, body, cookie) => fetch(base + '/api/admin' + url, {
  method, headers: { 'X-GSM-Admin': '1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
async function login() {
  const res = await admin('POST', '/login', { username: 'admin', password: PASSWORD });
  assert.strictEqual(res.status, 200);
  return res.headers.get('set-cookie').split(';')[0];
}
const filesIn = (type) => fs.readdirSync(path.join(dataDir, 'leads', type));

test('encryption round trip and tamper detection', () => {
  const key = crypto.randomBytes(32);
  const blob = encrypt(key, Buffer.from('secret'));
  assert.strictEqual(decrypt(key, blob).toString(), 'secret');
  blob[blob.length - 1] ^= 1;
  assert.throws(() => decrypt(key, blob));
});

test('multipart parser reads fields, repeated fields and files', () => {
  const b = '----x';
  const body = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="a"\r\n\r\n1\r\n--${b}\r\nContent-Disposition: form-data; name="a"\r\n\r\n2\r\n` +
    `--${b}\r\nContent-Disposition: form-data; name="f"; filename="x.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1\r\n--${b}--\r\n`);
  const r = parseMultipart(body, `multipart/form-data; boundary=${b}`);
  assert.deepStrictEqual(r.fields.a, ['1', '2']);
  assert.strictEqual(r.files.f.data.toString(), '%PDF-1');
});

test('file type is detected from content, not the name', () => {
  assert.strictEqual(sniffDocument(Buffer.from('%PDF-1.7')).ext, 'pdf');
  assert.strictEqual(sniffDocument(Buffer.from('\x89PNG....')), null);
});

test('valid enquiry is stored encrypted and returns 201', async () => {
  const res = await post('/api/enquiry', enquiryForm());
  assert.strictEqual(res.status, 201);
  const files = filesIn('enquiry');
  assert.strictEqual(files.length, 1);
  const raw = fs.readFileSync(path.join(dataDir, 'leads', 'enquiry', files[0]));
  assert.ok(!raw.includes('Sample Hospital'), 'stored file must not contain plain text');
});

test('invalid enquiry returns field errors and stores nothing', async () => {
  const before = filesIn('enquiry').length;
  const res = await post('/api/enquiry', enquiryForm({ phone: '12345', worker_count: '0', consent: 'no', role: 'Astronaut', shifts: null }));
  assert.strictEqual(res.status, 422);
  const data = await res.json();
  for (const k of ['phone', 'worker_count', 'consent', 'role', 'shifts']) assert.ok(data.errors[k], `expected error for ${k}`);
  assert.strictEqual(filesIn('enquiry').length, before);
});

test('honeypot and too-fast submissions are silently dropped', async () => {
  const before = filesIn('enquiry').length;
  assert.strictEqual((await post('/api/enquiry', enquiryForm({ company_website: 'spam.example' }))).status, 200);
  assert.strictEqual((await post('/api/enquiry', enquiryForm({ started_at: String(Date.now()) }))).status, 200);
  assert.strictEqual(filesIn('enquiry').length, before);
});

test('application with a real PDF resume is stored; a fake PDF is rejected', async () => {
  const ok = await post('/api/application', applicationForm({}, { name: 'cv.pdf', data: Buffer.from('%PDF-1.4 test') }));
  assert.strictEqual(ok.status, 201);
  assert.ok(filesIn('application').some((f) => f.endsWith('.resume.enc')));
  const bad = await post('/api/application', applicationForm({}, { name: 'cv.pdf', data: Buffer.from('MZ not a pdf') }));
  assert.strictEqual(bad.status, 422);
  assert.ok((await bad.json()).errors.resume);
});

test('cross-site form posts are refused', async () => {
  const res = await fetch(base + '/api/enquiry', { method: 'POST', body: enquiryForm(), headers: { Origin: 'https://evil.example' } });
  assert.strictEqual(res.status, 403);
});

test('admin API needs the admin header and a login', async () => {
  assert.strictEqual((await fetch(base + '/api/admin/leads/enquiry')).status, 403);
  assert.strictEqual((await admin('GET', '/leads/enquiry')).status, 401);
  assert.strictEqual((await admin('POST', '/login', { username: 'admin', password: 'wrong' })).status, 401);
});

test('admin can list, view, update, download and delete leads', async () => {
  const cookie = await login();
  assert.match(cookie, /^gsm_admin=/);
  const list = await (await admin('GET', '/leads/enquiry', null, cookie)).json();
  assert.ok(list.items.length >= 1);
  const id = list.items[0].id;
  const one = await (await admin('GET', `/leads/enquiry/${id}`, null, cookie)).json();
  assert.strictEqual(one.item.organisation, 'Sample Hospital');
  assert.deepStrictEqual(one.item.shifts, ['Day', 'Night']);
  const upd = await (await admin('PATCH', `/leads/enquiry/${id}`, { status: 'contacted', note: 'Called' }, cookie)).json();
  assert.strictEqual(upd.item.status, 'contacted');

  const apps = await (await admin('GET', '/leads/application', null, cookie)).json();
  const withResume = apps.items.find((a) => a.hasResume);
  const dl = await fetch(`${base}/api/admin/leads/application/${withResume.id}/resume`, { headers: { 'X-GSM-Admin': '1', Cookie: cookie } });
  assert.strictEqual(dl.status, 200);
  assert.strictEqual(Buffer.from(await dl.arrayBuffer()).toString(), '%PDF-1.4 test');

  assert.strictEqual((await admin('DELETE', `/leads/enquiry/${id}`, null, cookie)).status, 200);
  assert.strictEqual((await admin('GET', `/leads/enquiry/${id}`, null, cookie)).status, 404);

  const audit = await (await admin('GET', '/audit', null, cookie)).json();
  assert.ok(audit.items.some((a) => a.action === 'delete'));
  assert.ok(!JSON.stringify(audit.items).includes('Sample Hospital'), 'audit log must not contain personal data');
});

test('admin can edit website settings; bad values are refused', async () => {
  const cookie = await login();
  const bad = await admin('PUT', '/content', { phoneE164: 'call me', addressLine: '<script>' }, cookie);
  assert.strictEqual(bad.status, 422);
  const ok = await admin('PUT', '/content', { phoneDisplay: '+91 98765 43210', phoneE164: '+919876543210', 'features.security': false }, cookie);
  assert.strictEqual(ok.status, 200);
  assert.ok(rebuilds >= 1, 'site should rebuild after saving');
  assert.strictEqual(JSON.parse(fs.readFileSync(cfg.contentFile, 'utf8')).phoneDisplay, '+91 98765 43210');
});

test('logout ends the session', async () => {
  const cookie = await login();
  assert.strictEqual((await admin('POST', '/logout', null, cookie)).status, 200);
  assert.strictEqual((await admin('GET', '/me', null, cookie)).status, 401);
});

test('retention purge deletes old records only', () => {
  const { createStore } = require('../server/store');
  const store = createStore(cfg);
  store.save('enquiry', { organisation: 'Old' });
  const n = store.purge({ enquiryDays: 0, applicationDays: 100000 }, Date.now() + 1000);
  assert.ok(n >= 1);
  assert.strictEqual(store.list('enquiry').length, 0);
  assert.ok(store.list('application').length >= 1);
});

test('security headers are sent and private paths are not served', async () => {
  const res = await fetch(base + '/healthz');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.notStrictEqual((await fetch(base + '/%2e%2e/.env')).status, 200);
  assert.notStrictEqual((await fetch(base + '/%2e%2e/server/config.js')).status, 200);
});

test('odd request paths never crash the server', async () => {
  const raw = (pathname) => new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: new URL(base).port, path: pathname }, (res) => { res.resume(); resolve(res.statusCode); });
  });
  for (const p of ['//', '//evil.example/x', '/%E0%A4%A', '/admin/../.env']) assert.ok((await raw(p)) < 500, `${p} should not give a server error`);
});
