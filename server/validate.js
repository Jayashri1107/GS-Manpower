// Server-side validation for the two public forms. Mirrors the browser rules; never trust the browser.

const PHONE = /^([+]91 ?)?[6-9][0-9]{4} ?[0-9]{5}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const MIN_FILL_MS = 3000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ROLES_ENQUIRY = [
  'GNM / ANM nurses', 'GDA and ward attendants', 'OT / lab technicians', 'Housekeeping for clinical areas',
  'Front office and billing', 'Machine operators', 'Helpers and loaders', 'Store and packing staff',
  'Plant housekeeping', 'Contract labour', 'Security guards', 'Office administration',
  'Recruitment (permanent hiring)', 'Several roles',
];
const TIMELINES = ['Immediately', 'Within 2 weeks', 'Within a month', 'In 1 to 3 months', 'Planning ahead'];
const SHIFTS = ['Day', 'Evening', 'Night', '24x7 rotation'];
const ROLES_JOB = [
  'GNM / ANM nurse', 'GDA / ward attendant', 'OT / lab technician', 'Housekeeping staff', 'Security guard',
  'Office assistant or receptionist', 'Data entry or back office', 'Machine operator', 'Helper or loader',
  'Store or packing staff', 'Supervisor', 'Other',
];
const EXPERIENCE = ['No experience (fresher)', 'Less than 1 year', '1 to 3 years', '3 to 5 years', 'More than 5 years'];
const AVAILABILITY = ['Immediately', 'Within 15 days', 'Within 1 month', 'After 1 month'];

const one = (v) => (Array.isArray(v) ? v[0] : v);
const clean = (v, max) => String(one(v) ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

// Spam checks shared by both forms. Returns true when the submission looks automated.
function looksLikeSpam(fields, now = Date.now()) {
  if (clean(fields.company_website, 200)) return true;
  const started = Number(one(fields.started_at));
  if (!started || now - started < MIN_FILL_MS || now - started > 24 * 3600 * 1000) return true;
  return false;
}

function check(errors, cond, field, message) { if (!cond) errors[field] = message; }

// Detects file type from its first bytes (do not trust the extension or the browser's content type).
function sniffDocument(data) {
  if (data.length >= 4 && data.subarray(0, 4).toString('latin1') === '%PDF') return { ext: 'pdf', type: 'application/pdf' };
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return { ext: 'doc', type: 'application/msword' };
  if (data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && data.includes('word/')) {
    return { ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  return null;
}

function validateEnquiry(fields) {
  const v = {
    organisation: clean(fields.organisation, 120),
    contact_name: clean(fields.contact_name, 80),
    phone: clean(fields.phone, 20),
    email: clean(fields.email, 120),
    role: clean(fields.role, 60),
    worker_count: clean(fields.worker_count, 6),
    location: clean(fields.location, 120),
    timeline: clean(fields.timeline, 40),
    shifts: [].concat(fields.shifts || []).map((s) => clean(s, 20)).filter((s) => SHIFTS.includes(s)),
    notes: clean(fields.notes, 1500),
    consent: clean(fields.consent, 5),
    lang: clean(fields.lang, 5) === 'mr' ? 'mr' : 'en',
  };
  const e = {};
  check(e, v.organisation.length >= 2, 'organisation', 'Organisation name is required.');
  check(e, v.contact_name.length >= 2, 'contact_name', 'Contact person is required.');
  check(e, PHONE.test(v.phone), 'phone', 'Enter a 10-digit Indian mobile number.');
  check(e, !v.email || EMAIL.test(v.email), 'email', 'Email format is not valid.');
  check(e, ROLES_ENQUIRY.includes(v.role), 'role', 'Choose a role.');
  const n = Number(v.worker_count);
  check(e, Number.isInteger(n) && n >= 1 && n <= 5000, 'worker_count', 'Worker count must be 1 to 5000.');
  check(e, v.location.length >= 2, 'location', 'Work location is required.');
  check(e, TIMELINES.includes(v.timeline), 'timeline', 'Choose a timeline.');
  check(e, v.shifts.length > 0, 'shifts', 'Choose at least one shift.');
  check(e, v.consent === 'yes', 'consent', 'Consent is required.');
  v.worker_count = n;
  return { value: v, errors: e };
}

function validateApplication(fields, files) {
  const v = {
    full_name: clean(fields.full_name, 80),
    phone: clean(fields.phone, 20),
    role: clean(fields.role, 60),
    experience: clean(fields.experience, 40),
    location: clean(fields.location, 120),
    availability: clean(fields.availability, 40),
    consent: clean(fields.consent, 5),
    lang: clean(fields.lang, 5) === 'mr' ? 'mr' : 'en',
  };
  const e = {};
  check(e, v.full_name.length >= 2, 'full_name', 'Full name is required.');
  check(e, PHONE.test(v.phone), 'phone', 'Enter a 10-digit Indian mobile number.');
  check(e, ROLES_JOB.includes(v.role), 'role', 'Choose a job.');
  check(e, EXPERIENCE.includes(v.experience), 'experience', 'Choose experience.');
  check(e, v.location.length >= 2, 'location', 'Preferred location is required.');
  check(e, AVAILABILITY.includes(v.availability), 'availability', 'Choose when you can join.');
  check(e, v.consent === 'yes', 'consent', 'Consent is required.');

  let resume = null;
  const f = files && files.resume;
  if (f) {
    const kind = sniffDocument(f.data);
    if (f.data.length > MAX_FILE_BYTES) e.resume = 'Resume must be 5 MB or smaller.';
    else if (!kind) e.resume = 'Resume must be a PDF or Word file.';
    else resume = { filename: f.filename, ext: kind.ext, contentType: kind.type, data: f.data };
  }
  return { value: v, resume, errors: e };
}

module.exports = { validateEnquiry, validateApplication, looksLikeSpam, sniffDocument, MAX_FILE_BYTES };
