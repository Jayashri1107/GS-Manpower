// Encrypted file storage for leads. Every record and resume is encrypted with DATA_KEY before it touches disk.
//   <DATA_DIR>/leads/<type>/<id>.json.enc    the submission
//   <DATA_DIR>/leads/<type>/<id>.resume.enc  the resume, if any
//   <DATA_DIR>/audit.log                      who did what in the admin panel (no personal data)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encryptJson, decryptJson, encrypt, decrypt } = require('./crypto');

const TYPES = ['enquiry', 'application'];
const STATUSES = ['new', 'contacted', 'in-progress', 'closed'];

function createStore({ dataDir, dataKey }) {
  const dirFor = (type) => {
    if (!TYPES.includes(type)) throw new Error('Unknown lead type');
    const dir = path.join(dataDir, 'leads', type);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    return dir;
  };
  const safeId = (id) => {
    if (!/^[0-9]{13}-[a-f0-9]{8}$/.test(id)) throw new Error('Bad id');
    return id;
  };
  const writeFileAtomic = (file, data) => {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data, { mode: 0o600 });
    fs.renameSync(tmp, file);
  };

  function save(type, record, resume) {
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const dir = dirFor(type);
    const full = { id, type, status: 'new', createdAt: new Date().toISOString(), ...record };
    if (resume) {
      writeFileAtomic(path.join(dir, `${id}.resume.enc`), encrypt(dataKey, resume.data));
      full.resume = { filename: resume.filename, ext: resume.ext, contentType: resume.contentType, size: resume.data.length };
    }
    writeFileAtomic(path.join(dir, `${id}.json.enc`), encryptJson(dataKey, full));
    return full;
  }

  function get(type, id) {
    const file = path.join(dirFor(type), `${safeId(id)}.json.enc`);
    if (!fs.existsSync(file)) return null;
    return decryptJson(dataKey, fs.readFileSync(file));
  }

  function list(type) {
    const dir = dirFor(type);
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json.enc'))
      .sort().reverse()
      .map((f) => decryptJson(dataKey, fs.readFileSync(path.join(dir, f))));
  }

  function update(type, id, changes) {
    const rec = get(type, id);
    if (!rec) return null;
    if (changes.status !== undefined) {
      if (!STATUSES.includes(changes.status)) throw new Error('Bad status');
      rec.status = changes.status;
    }
    if (changes.note !== undefined) rec.note = String(changes.note).slice(0, 2000);
    rec.updatedAt = new Date().toISOString();
    writeFileAtomic(path.join(dirFor(type), `${id}.json.enc`), encryptJson(dataKey, rec));
    return rec;
  }

  function resume(type, id) {
    const rec = get(type, id);
    if (!rec || !rec.resume) return null;
    const data = decrypt(dataKey, fs.readFileSync(path.join(dirFor(type), `${id}.resume.enc`)));
    return { ...rec.resume, data };
  }

  function remove(type, id) {
    const dir = dirFor(type);
    let removed = false;
    for (const suffix of ['.json.enc', '.resume.enc']) {
      const file = path.join(dir, `${safeId(id)}${suffix}`);
      if (fs.existsSync(file)) { fs.rmSync(file); removed = true; }
    }
    return removed;
  }

  // Deletes records older than the retention period promised in the privacy notice.
  function purge(retention, now = Date.now()) {
    let count = 0;
    for (const type of TYPES) {
      const days = type === 'enquiry' ? retention.enquiryDays : retention.applicationDays;
      const cutoff = now - days * 24 * 3600 * 1000;
      for (const f of fs.readdirSync(dirFor(type))) {
        const ts = Number(f.split('-')[0]);
        if (f.endsWith('.json.enc') && ts && ts < cutoff) { remove(type, f.replace('.json.enc', '')); count++; }
      }
    }
    return count;
  }

  function audit(actor, action, detail = '') {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(path.join(dataDir, 'audit.log'), `${new Date().toISOString()}\t${actor}\t${action}\t${detail}\n`, { mode: 0o600 });
  }

  function readAudit(limit = 200) {
    const file = path.join(dataDir, 'audit.log');
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).slice(-limit).reverse()
      .map((l) => { const [at, actor, action, detail] = l.split('\t'); return { at, actor, action, detail }; });
  }

  return { save, get, list, update, resume, remove, purge, audit, readAudit, TYPES, STATUSES };
}

module.exports = { createStore };
