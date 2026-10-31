// Site settings that the admin panel may edit. Saved to <DATA_DIR>/content.json, which the build merges over
// src/content/site.json. Only the keys listed here can be changed from the browser.
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./config');

const editableFields = [
  { key: 'phoneDisplay', label: 'Phone number as shown', group: 'Contact', pattern: '^[+0-9 ()-]{6,20}$', example: '+91 98765 43210' },
  { key: 'phoneE164', label: 'Phone number for the call button (no spaces)', group: 'Contact', pattern: '^[+][0-9]{8,15}$', example: '+919876543210' },
  { key: 'whatsapp', label: 'WhatsApp number (country code, digits only)', group: 'Contact', pattern: '^[0-9]{8,15}$', example: '919876543210' },
  { key: 'email', label: 'Email address', group: 'Contact', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', example: 'info@gsmanpower.in' },
  { key: 'addressLine', label: 'Office address line', group: 'Contact', max: 160 },
  { key: 'addressCity', label: 'City, state and PIN', group: 'Contact', max: 120 },
  { key: 'hours', label: 'Office hours (English)', group: 'Contact', max: 120 },
  { key: 'hoursMr', label: 'Office hours (Marathi)', group: 'Contact', max: 120 },
  { key: 'udyamNo', label: 'Udyam / Shops & Establishment number', group: 'Registrations', max: 60 },
  { key: 'gstin', label: 'GSTIN', group: 'Registrations', max: 30 },
  { key: 'epfCode', label: 'EPF establishment code', group: 'Registrations', max: 40 },
  { key: 'esicCode', label: 'ESIC code', group: 'Registrations', max: 40 },
  { key: 'clraLicence', label: 'Contract labour licence', group: 'Registrations', max: 80 },
  { key: 'psaraLicence', label: 'PSARA security licence (number and validity)', group: 'Registrations', max: 80 },
  { key: 'grievanceOfficer', label: 'Grievance officer name (privacy notice)', group: 'Registrations', max: 80 },
  { key: 'ga4Id', label: 'Google Analytics ID (leave empty for no analytics)', group: 'Website', pattern: '^(G-[A-Z0-9]{4,12})?$', example: 'G-ABC123XYZ' },
  { key: 'features.security', label: 'Show security services (only once the PSARA licence is granted)', group: 'Website', type: 'boolean' },
];

function baseSettings() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'content', 'site.json'), 'utf8'));
}

function readOverride(cfg) {
  return fs.existsSync(cfg.contentFile) ? JSON.parse(fs.readFileSync(cfg.contentFile, 'utf8')) : {};
}

function readContent(cfg) {
  const base = baseSettings();
  const o = readOverride(cfg);
  const merged = { ...base, ...o, features: { ...base.features, ...(o.features || {}) } };
  const values = {};
  for (const f of editableFields) values[f.key] = f.key === 'features.security' ? !!merged.features.security : merged[f.key] ?? '';
  return values;
}

function saveContent(cfg, input) {
  const errors = {};
  const override = readOverride(cfg);
  const changed = {};
  for (const f of editableFields) {
    if (!(f.key in input)) continue;
    if (f.type === 'boolean') {
      const v = input[f.key] === true;
      override.features = { ...(override.features || {}), security: v };
      changed[f.key] = v;
      continue;
    }
    const v = String(input[f.key] ?? '').trim();
    if (/[<>{}]/.test(v)) { errors[f.key] = 'These characters are not allowed: < > { }'; continue; }
    if (f.max && v.length > f.max) { errors[f.key] = `At most ${f.max} characters.`; continue; }
    if (f.pattern && !new RegExp(f.pattern).test(v)) { errors[f.key] = `Format example: ${f.example}`; continue; }
    override[f.key] = v;
    changed[f.key] = v;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  fs.mkdirSync(path.dirname(cfg.contentFile), { recursive: true });
  fs.writeFileSync(cfg.contentFile, JSON.stringify(override, null, 2));
  return { ok: true, changed };
}

module.exports = { editableFields, readContent, saveContent };
